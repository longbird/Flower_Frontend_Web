import { NextResponse } from 'next/server'
import { execSync } from 'child_process'

interface BackupFile {
  name: string
  date: string
  size: string
}

interface BackupEntry {
  label: string
  path: string
  status: 'ok' | 'warning' | 'error'
  latestDate: string | null
  fileCount: number
  totalSize: string | null
  recentFiles: BackupFile[]
}

interface TierResult {
  label: string
  status: 'ok' | 'warning' | 'error'
  entries: BackupEntry[]
}

interface BackupStatusResponse {
  ok: boolean
  timestamp: string
  tiers: {
    production_primary: TierResult
    production_storage: TierResult
    local: TierResult
  }
}

const LOCAL_SSH_TARGET = 'blueadm@49.247.46.86'
const SSH_OPTS = '-o StrictHostKeyChecking=no -o ConnectTimeout=5'

function parseFileStatus(mostRecentDate: string | null): 'ok' | 'warning' | 'error' {
  if (!mostRecentDate) return 'error'
  const now = Date.now()
  const fileTime = new Date(mostRecentDate).getTime()
  if (isNaN(fileTime)) return 'error'
  const hoursAgo = (now - fileTime) / (1000 * 60 * 60)
  if (hoursAgo <= 25) return 'ok'
  if (hoursAgo <= 48) return 'warning'
  return 'error'
}

function worstStatus(statuses: Array<'ok' | 'warning' | 'error'>): 'ok' | 'warning' | 'error' {
  if (statuses.includes('error')) return 'error'
  if (statuses.includes('warning')) return 'warning'
  return 'ok'
}

function parseListOutput(output: string): BackupFile[] {
  const files: BackupFile[] = []
  const lines = output.trim().split('\n').filter(l => l.trim())
  for (const line of lines) {
    // ls -lt --time-style=full-iso output:
    // -rw-r--r-- 1 user group 1234567 2026-03-17 02:01:23.000000000 +0900 filename.sql.gz
    const match = line.match(/^[\S]+\s+\d+\s+\S+\s+\S+\s+(\S+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\S*\s+[+-]\d{4}\s+(.+)$/)
    if (match) {
      const rawSize = match[1]
      const dateStr = match[2]
      const timeStr = match[3]
      const fileName = match[4].trim()
      files.push({
        name: fileName,
        date: `${dateStr}T${timeStr}`,
        size: formatSize(parseInt(rawSize, 10)),
      })
    }
  }
  return files
}

function formatSize(bytes: number): string {
  if (isNaN(bytes)) return '?'
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}M`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}K`
  return `${bytes}B`
}

function runCmd(cmd: string, timeout = 15000): string {
  return execSync(cmd, { encoding: 'utf8', timeout, shell: '/bin/bash' })
}

function checkDbBackup(label: string, path: string, ssh?: string): BackupEntry {
  try {
    const prefix = ssh ? `ssh ${SSH_OPTS} ${ssh}` : ''
    const wrap = (c: string) => ssh ? `${prefix} "${c}"` : c

    const listOutput = runCmd(wrap(`cd ${path} && ls -lt --time-style=full-iso *.sql.gz 2>/dev/null | head -5`))
    const countOutput = runCmd(wrap(`cd ${path} && ls *.sql.gz 2>/dev/null | wc -l`))

    const recentFiles = parseListOutput(listOutput)
    const fileCount = parseInt(countOutput.trim(), 10) || 0
    const latestDate = recentFiles.length > 0 ? recentFiles[0].date : null
    const status = parseFileStatus(latestDate)

    return { label, path, status, latestDate, fileCount, totalSize: null, recentFiles }
  } catch {
    return { label, path, status: 'error', latestDate: null, fileCount: 0, totalSize: null, recentFiles: [] }
  }
}

function checkImageBackup(label: string, path: string): BackupEntry {
  try {
    const duOutput = runCmd(`du -sh ${path} 2>/dev/null`)
    const statOutput = runCmd(`stat -c '%Y' ${path} 2>/dev/null`)

    const totalSize = duOutput.trim().split(/\s+/)[0] || null
    const epochSec = parseInt(statOutput.trim(), 10)
    const latestDate = !isNaN(epochSec) ? new Date(epochSec * 1000).toISOString() : null

    return { label, path, status: 'ok', latestDate, fileCount: 0, totalSize, recentFiles: [] }
  } catch {
    return { label, path, status: 'error', latestDate: null, fileCount: 0, totalSize: null, recentFiles: [] }
  }
}

export async function GET(): Promise<NextResponse<BackupStatusResponse>> {
  // 이 API는 프로덕션 서버(49.247.206.190)에서 실행됨
  // 프로덕션 경로 → 로컬 exec (자기 자신)
  // 로컬(분산) 경로 → SSH로 49.247.46.86 접속

  // Production primary entries (로컬 exec)
  const runFlowerPrimary = checkDbBackup(
    'Run Flower DB (1차)',
    '$HOME/backend/docker/backups/'
  )
  const brmPrimary = checkDbBackup(
    'BRM DB (1차)',
    '$HOME/brmcard/backups/'
  )

  // Production storage entries (로컬 exec)
  const runFlowerStorage = checkDbBackup(
    'Run Flower DB (스토리지)',
    '/mnt/backup/db/run_flower/'
  )
  const brmStorage = checkDbBackup(
    'BRM DB (스토리지)',
    '/mnt/backup/db/brmcard/'
  )
  const imageStorage = checkImageBackup(
    '이미지 (스토리지)',
    '/mnt/backup/images/'
  )

  // Local entries (SSH to 49.247.46.86)
  const runFlowerLocal = checkDbBackup(
    'Run Flower DB (로컬)',
    '$HOME/backups/remote-seoulflower/run_flower',
    LOCAL_SSH_TARGET
  )
  const brmLocal = checkDbBackup(
    'BRM DB (로컬)',
    '$HOME/backups/remote-seoulflower/brmcard',
    LOCAL_SSH_TARGET
  )

  const productionPrimaryEntries: BackupEntry[] = [runFlowerPrimary, brmPrimary]
  const productionStorageEntries: BackupEntry[] = [runFlowerStorage, brmStorage, imageStorage]
  const localEntries: BackupEntry[] = [runFlowerLocal, brmLocal]

  const tiers = {
    production_primary: {
      label: '원격 서버 (1차)',
      status: worstStatus(productionPrimaryEntries.map(e => e.status)),
      entries: productionPrimaryEntries,
    },
    production_storage: {
      label: '원격 서버 (스토리지)',
      status: worstStatus(productionStorageEntries.map(e => e.status)),
      entries: productionStorageEntries,
    },
    local: {
      label: '로컬 서버',
      status: worstStatus(localEntries.map(e => e.status)),
      entries: localEntries,
    },
  }

  const allStatuses = [
    tiers.production_primary.status,
    tiers.production_storage.status,
    tiers.local.status,
  ]

  const response: BackupStatusResponse = {
    ok: !allStatuses.includes('error'),
    timestamp: new Date().toISOString(),
    tiers,
  }

  return NextResponse.json(response)
}
