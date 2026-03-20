-- ============================================================
-- 화원 서비스 지역 추가 쿼리 (운영서버용)
--
-- 대상 A: 구 주소 화원 중 해당 시/도 서비스 지역 미설정 (791개)
--   → 시 이름 + 자기 구 추가 (시 먼저 INSERT → id가 앞서서 순서 보장)
-- 대상 B: 구 서비스 지역은 있지만 시 이름이 없는 화원 (181개)
--   → 시 이름만 추가
--
-- ※ 시 이름이 앞 순서(낮은 id)로 들어가도록 INSERT 순서: 시 → 구
-- 작성일: 2026-03-19
-- ============================================================


-- ############################################################
-- 1단계: 백업 (반드시 먼저 실행!)
-- ############################################################

-- 서비스 지역 백업
CREATE TABLE IF NOT EXISTS flower_shop_service_areas_backup_20260319 AS
SELECT * FROM flower_shop_service_areas;

-- gugun 테이블 백업 (시 이름 gugun 추가하므로)
CREATE TABLE IF NOT EXISTS flower_shop_guguns_backup_20260319 AS
SELECT * FROM flower_shop_guguns;

-- 백업 건수 확인
SELECT 'service_areas 백업' AS info, COUNT(*) AS cnt FROM flower_shop_service_areas_backup_20260319
UNION ALL
SELECT 'guguns 백업', COUNT(*) FROM flower_shop_guguns_backup_20260319;


-- ############################################################
-- 2단계: 시 이름 gugun 항목 생성
-- ############################################################
-- 부산광역시(sido=8)는 이미 gugun_id=247 존재
-- 나머지 6개 광역시/특별시에 시 이름 gugun 생성

INSERT INTO flower_shop_guguns (sido_id, name, sort_order, created_at)
SELECT s.id, s.name, 0, NOW()
FROM flower_shop_sidos s
WHERE s.name IN ('서울특별시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시')
  AND NOT EXISTS (
    SELECT 1 FROM flower_shop_guguns g WHERE g.sido_id = s.id AND g.name = s.name
  );

-- 생성된 시 이름 gugun 확인
SELECT g.id, g.name, s.name AS sido
FROM flower_shop_guguns g
JOIN flower_shop_sidos s ON g.sido_id = s.id
WHERE g.name IN ('서울특별시','부산광역시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시');


-- ############################################################
-- 3단계: 대상 확인 (DRY RUN)
-- ############################################################

-- [대상 A] 구 주소인데 해당 시/도 서비스 지역이 없는 화원
SELECT '대상A: 시+구 추가' AS type, COUNT(*) AS cnt
FROM flower_shops fs
JOIN flower_shop_guguns g ON fs.gugun_id = g.id
WHERE fs.is_active = 1 AND g.name LIKE '%구'
  AND NOT EXISTS (
    SELECT 1 FROM flower_shop_service_areas sa
    JOIN flower_shop_guguns g2 ON sa.gugun_id = g2.id
    WHERE sa.flower_shop_id = fs.id AND g2.sido_id = fs.sido_id
  );

-- [대상 B] 구 서비스 지역은 있지만 시 이름이 없는 화원
SELECT '대상B: 시만 추가' AS type, COUNT(DISTINCT fs.id) AS cnt
FROM flower_shops fs
JOIN flower_shop_sidos s ON fs.sido_id = s.id
JOIN flower_shop_service_areas sa ON sa.flower_shop_id = fs.id
JOIN flower_shop_guguns sg ON sa.gugun_id = sg.id AND sg.sido_id = fs.sido_id
WHERE fs.is_active = 1
  AND sg.name LIKE '%구'
  AND s.name IN ('서울특별시','부산광역시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시')
  AND NOT EXISTS (
    SELECT 1 FROM flower_shop_service_areas sa2
    JOIN flower_shop_guguns g3 ON sa2.gugun_id = g3.id
    WHERE sa2.flower_shop_id = fs.id AND g3.name = s.name
  );


-- ############################################################
-- 4단계: 서비스 지역 추가 (시 먼저, 구 나중 → id 순서 보장)
-- ############################################################

-- [4-1] 시 이름 추가 (대상 A+B: 구 주소 화원 중 시 이름 서비스 지역 없는 모든 화원)
-- ※ 시를 먼저 INSERT하여 낮은 id 확보 → 목록에서 앞에 표시
INSERT INTO flower_shop_service_areas (flower_shop_id, gugun_id, created_at)
SELECT DISTINCT fs.id, city_g.id, NOW()
FROM flower_shops fs
JOIN flower_shop_sidos s ON fs.sido_id = s.id
JOIN flower_shop_guguns addr_g ON fs.gugun_id = addr_g.id
JOIN flower_shop_guguns city_g ON city_g.sido_id = s.id AND city_g.name = s.name
WHERE fs.is_active = 1
  AND addr_g.name LIKE '%구'
  AND s.name IN ('서울특별시','부산광역시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시')
  AND NOT EXISTS (
    SELECT 1 FROM flower_shop_service_areas sa
    WHERE sa.flower_shop_id = fs.id AND sa.gugun_id = city_g.id
  );

SELECT ROW_COUNT() AS '4-1: 시 이름 추가 건수';

-- [4-2] 대상 A: 자기 구 추가 (중복 방지)
-- ※ 시 이후에 INSERT하여 높은 id → 목록에서 시 뒤에 표시
INSERT INTO flower_shop_service_areas (flower_shop_id, gugun_id, created_at)
SELECT fs.id, fs.gugun_id, NOW()
FROM flower_shops fs
JOIN flower_shop_guguns g ON fs.gugun_id = g.id
WHERE fs.is_active = 1
  AND g.name LIKE '%구'
  AND NOT EXISTS (
    SELECT 1 FROM flower_shop_service_areas sa
    JOIN flower_shop_guguns g2 ON sa.gugun_id = g2.id
    WHERE sa.flower_shop_id = fs.id AND g2.sido_id = fs.sido_id
      AND g2.name LIKE '%구'
  )
  AND NOT EXISTS (
    SELECT 1 FROM flower_shop_service_areas sa2
    WHERE sa2.flower_shop_id = fs.id AND sa2.gugun_id = fs.gugun_id
  );

SELECT ROW_COUNT() AS '4-2: 구 추가 건수';

-- [4-3] 경기도 용인시+기흥구 → 용인시 추가
INSERT INTO flower_shop_service_areas (flower_shop_id, gugun_id, created_at)
SELECT fs.id, 189, NOW()
FROM flower_shops fs
JOIN flower_shop_guguns g ON fs.gugun_id = g.id
WHERE fs.is_active = 1
  AND g.name = '용인시+기흥구'
  AND NOT EXISTS (
    SELECT 1 FROM flower_shop_service_areas sa
    WHERE sa.flower_shop_id = fs.id AND sa.gugun_id = 189
  );

SELECT ROW_COUNT() AS '4-3: 용인시 추가 건수';


-- ############################################################
-- 5단계: 검증
-- ############################################################

-- 구 주소 화원 중 시/도 서비스 지역 미설정 잔여 수 (0이어야 정상)
SELECT COUNT(*) AS remaining_without_area
FROM flower_shops fs
JOIN flower_shop_guguns g ON fs.gugun_id = g.id
WHERE fs.is_active = 1
  AND g.name LIKE '%구'
  AND NOT EXISTS (
    SELECT 1 FROM flower_shop_service_areas sa
    JOIN flower_shop_guguns g2 ON sa.gugun_id = g2.id
    WHERE sa.flower_shop_id = fs.id AND g2.sido_id = fs.sido_id
  );

-- 전후 비교
SELECT 'before' AS state, COUNT(*) AS cnt FROM flower_shop_service_areas_backup_20260319
UNION ALL
SELECT 'after', COUNT(*) FROM flower_shop_service_areas;


-- ############################################################
-- 복원 쿼리 (문제 발생 시에만 실행!)
-- ############################################################

-- ※ 아래는 문제 발생 시에만 주석 해제 후 실행 ※

-- 방법 1: 이번에 추가한 서비스 지역만 삭제
-- DELETE FROM flower_shop_service_areas
-- WHERE id NOT IN (SELECT id FROM flower_shop_service_areas_backup_20260319);

-- 방법 2: 서비스 지역 완전 원복
-- DELETE FROM flower_shop_service_areas;
-- INSERT INTO flower_shop_service_areas SELECT * FROM flower_shop_service_areas_backup_20260319;

-- 방법 3: gugun 테이블도 원복 (추가한 시 이름 gugun 삭제)
-- DELETE FROM flower_shop_guguns
-- WHERE id NOT IN (SELECT id FROM flower_shop_guguns_backup_20260319);

-- 전체 원복 (서비스 지역 + gugun 모두)
-- DELETE FROM flower_shop_service_areas;
-- INSERT INTO flower_shop_service_areas SELECT * FROM flower_shop_service_areas_backup_20260319;
-- DELETE FROM flower_shop_guguns;
-- INSERT INTO flower_shop_guguns SELECT * FROM flower_shop_guguns_backup_20260319;

-- 백업 테이블 삭제 (모든 작업 완료 확인 후)
-- DROP TABLE IF EXISTS flower_shop_service_areas_backup_20260319;
-- DROP TABLE IF EXISTS flower_shop_guguns_backup_20260319;
