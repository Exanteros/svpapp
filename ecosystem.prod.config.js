module.exports = {
  apps: [
    {
      name: 'svpapp-prod',
      script: 'npm',
      args: 'run start:prod',
      cwd: '/path/to/your/app',
      
      // Memory and CPU optimization for 1GB RAM server
      instances: 1, // Single instance for 1 vCore
      exec_mode: 'fork', // Use fork mode for single instance
      
      // Memory management
      max_memory_restart: '700M', // Restart if memory exceeds 700MB (more conservative)
      node_args: '--max-old-space-size=512 --gc-global',
      
      // Environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        ENABLE_SMTP_SERVER: 'false', // Disable SMTP for better performance
        UV_THREADPOOL_SIZE: '2',
        NODE_OPTIONS: '--max-old-space-size=512',
        NEXT_TELEMETRY_DISABLED: '1',
      },
      
      // Logs
      log_file: '/var/log/pm2/svpapp-combined.log',
      out_file: '/var/log/pm2/svpapp-out.log',
      error_file: '/var/log/pm2/svpapp-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart settings
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoring
      monitoring: false, // Disable PM2 monitoring to save memory
      
      // Health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
    }
  ]
};
