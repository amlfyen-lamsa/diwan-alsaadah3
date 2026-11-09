/**
 * ==============================================================================
 * ديوان السعادة – نغم يجمعنا
 * PM2 Production Ecosystem Configuration
 * For Hostinger, DigitalOcean, Ubuntu, Debian, CentOS, and cPanel Node.js Selector
 * ==============================================================================
 */

module.exports = {
  apps: [
    {
      name: 'dewan-alsaada',
      script: 'server.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        APP_URL: 'https://dewanalsaada.com',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/dewan-error.log',
      out_file: './logs/dewan-out.log',
      merge_logs: true,
    },
  ],
};
