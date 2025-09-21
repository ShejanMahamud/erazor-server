require('dotenv').config(); // Load variables from .env

module.exports = {
  apps: [
    {
      name: 'erazor-server',
      script: './dist/main.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 4545,

        // =====================
        // 🔑 POLAR
        // =====================
        POLAR_ACCESS_TOKEN: process.env.POLAR_ACCESS_TOKEN,
        POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET,

        // =====================
        // 🌐 General
        // =====================
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        CLIENT_URL: process.env.CLIENT_URL,

        // =====================
        // 🖼️ Image Processor
        // =====================
        IMAGE_PROCESSOR_URL: process.env.IMAGE_PROCESSOR_URL,
        IMAGE_PROCESSOR_API_KEY: process.env.IMAGE_PROCESSOR_API_KEY,
        IMAGE_PROCESSOR_FREE_API_KEY: process.env.IMAGE_PROCESSOR_FREE_API_KEY,

        // =====================
        // ☁️ Cloudinary
        // =====================
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
        CLOUDINARY_UPLOAD_FOLDER: process.env.CLOUDINARY_UPLOAD_FOLDER,

        // =====================
        // 🗄️ PostgreSQL
        // =====================
        DATABASE_URL: process.env.DATABASE_URL,
        POSTGRES_HOST: process.env.POSTGRES_HOST,
        POSTGRES_USER: process.env.POSTGRES_USER,
        POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
        POSTGRES_DB: process.env.POSTGRES_DB,
        POSTGRES_PORT: process.env.POSTGRES_PORT,

        // =====================
        // 🔥 Redis
        // =====================
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT,
        REDIS_USERNAME: process.env.REDIS_USERNAME,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,

        // =====================
        // 🔐 Clerk
        // =====================
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
        CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
        CLERK_WEBHOOK_SIGNING_SECRET: process.env.CLERK_WEBHOOK_SIGNING_SECRET,

        // =====================
        // 🛡️ Arcjet
        // =====================
        ARCJET_API_KEY: process.env.ARCJET_API_KEY,
        ARCJET_ENV: process.env.ARCJET_ENV,

        // =====================
        // 🤖 Telegram
        // =====================
        TG_BOT_TOKEN: process.env.TG_BOT_TOKEN,
        TG_CHAT_ID: process.env.TG_CHAT_ID
      },
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
