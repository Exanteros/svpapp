module.exports = {
  apps: [{
    name: 'svpapp',
    script: 'server-with-smtp.js',
    instances: 'max', // Nutze alle CPU-Kerne
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      SMTP_PORT: 25,
      TEAM_EMAIL_DOMAIN: 'email.rasenturnier.sv-puschendorf.de'
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      SMTP_PORT: 2525
    },
    // Logging
    error_file: '/var/log/svpapp/err.log',
    out_file: '/var/log/svpapp/out.log',
    log_file: '/var/log/svpapp/combined.log',
    time: true,
    
    // Memory Management
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    
    // Auto-restart on crashes
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Graceful shutdown
    kill_timeout: 5000,
    
    // Health monitoring
    watch: false, // Disable in production
    ignore_watch: ['node_modules', 'logs', '*.log'],
    
    // Environment-specific settings
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      SMTP_PORT: 25,
      LOG_LEVEL: 'info'
    }
  }],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/svpapp.git',
      path: '/var/www/svpapp',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --production && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};