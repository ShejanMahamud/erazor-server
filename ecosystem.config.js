require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'erazor-server',
      script: './dist/main.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 4545,

        // All environment variables (keeping existing structure)
        POLAR_ACCESS_TOKEN: process.env.POLAR_ACCESS_TOKEN,
        POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET,
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        CLIENT_URL: process.env.CLIENT_URL,
        IMAGE_PROCESSOR_URL: process.env.IMAGE_PROCESSOR_URL,
        IMAGE_PROCESSOR_API_KEY: process.env.IMAGE_PROCESSOR_API_KEY,
        IMAGE_PROCESSOR_FREE_API_KEY: process.env.IMAGE_PROCESSOR_FREE_API_KEY,
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
        CLOUDINARY_UPLOAD_FOLDER: process.env.CLOUDINARY_UPLOAD_FOLDER,
        DATABASE_URL: process.env.DATABASE_URL,
        POSTGRES_HOST: process.env.POSTGRES_HOST,
        POSTGRES_USER: process.env.POSTGRES_USER,
        POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
        POSTGRES_DB: process.env.POSTGRES_DB,
        POSTGRES_PORT: process.env.POSTGRES_PORT,
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT,
        REDIS_USERNAME: process.env.REDIS_USERNAME,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
        CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
        CLERK_WEBHOOK_SIGNING_SECRET: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
        ARCJET_API_KEY: process.env.ARCJET_API_KEY,
        ARCJET_ENV: process.env.ARCJET_ENV,
        TG_BOT_TOKEN: process.env.TG_BOT_TOKEN,
        TG_CHAT_ID: process.env.TG_CHAT_ID,
      },
      
      // PERFORMANCE OPTIMIZATIONS
      max_memory_restart: '2G',        // Increased from 1G
      node_args: '--max-old-space-size=2048', // Increased heap size
      
      // Enhanced restart configuration
      autorestart: true,
      watch: false,
      max_restarts: 5,               // Reduced from 10
      min_uptime: '30s',             // Increased from 10s
      restart_delay: 4000,           // Add delay between restarts
      
      // Logging optimization
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Performance monitoring
      pmx: true,
      
      // Advanced PM2 features
      kill_timeout: 5000,
      listen_timeout: 8000,
      shutdown_with_message: true,
      
      // Environment-specific Node.js flags
      node_args: [
        '--max-old-space-size=2048',
        '--optimize-for-size',
        '--gc-interval=100',
        '--max-semi-space-size=128'
      ].join(' '),
      
      // Advanced process management
      wait_ready: true,
      ready_timeout: 10000,
      
      // Source map support for better error tracking
      source_map_support: true,
      
      // Cron restart for memory cleanup (daily at midnight)
      cron_restart: '0 0 * * * Asia/Dhaka',
      
      // Instance variables for cluster mode
      instance_var: 'INSTANCE_ID',
      
      // Advanced logging
      log_type: 'json',
      
      // Health monitoring
      health_check_grace_period: 30000,
      
      // Memory threshold monitoring
      max_memory_usage: '1.8G', // Alert before restart
      
      // CPU monitoring
      exec_interpreter: 'node',
      
      // Additional process flags for production
      args: '--color',
    }
  ],
  
  // PM2 deployment configuration (optional)
  deploy: {
    production: {
      user: 'nodejs',
      host: ['20.40.57.36'],
      ref: 'origin/main',
      repo: 'git@github.com:ShejanMahamud/erazor-server.git',
      path: '/var/www/production',
      'pre-deploy-local': '',
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
