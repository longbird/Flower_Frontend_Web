module.exports = {
  apps: [
    {
      name: 'admin-web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3030',
      cwd: '/home/blueadm/frontend_web',
      instances: 2,
      exec_mode: 'cluster',
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3030,
      },
      max_memory_restart: '400M',
      error_file: '/home/blueadm/.pm2/logs/admin-web-error.log',
      out_file: '/home/blueadm/.pm2/logs/admin-web-out.log',
      time: true,
    },
  ],
};
