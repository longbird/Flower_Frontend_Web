module.exports = {
  apps: [
    {
      name: 'admin-web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3030',
      cwd: '/home/blueadm/frontend_web',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3030,
      },
      max_memory_restart: '512M',
      error_file: '/home/blueadm/.pm2/logs/admin-web-error.log',
      out_file: '/home/blueadm/.pm2/logs/admin-web-out.log',
      time: true,
    },
  ],
};
