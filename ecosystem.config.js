module.exports = {
  apps: [
    {
      name: 'emahu-backend',
      script: 'server.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'emahu-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: './frontend-web',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: 'emahu_production_server_action_encryption_secret_key'
      }
    },
    {
      name: 'emahu-admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      cwd: './admin-emahu',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: 'emahu_production_server_action_encryption_secret_key'
      }
    }
  ]
};

