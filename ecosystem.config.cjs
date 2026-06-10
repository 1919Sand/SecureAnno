module.exports = {
    apps: [
        {
            name: 'secureanno',
            script: './server.js',
            cwd: __dirname,
            exec_mode: 'fork',
            instances: 1,
            watch: false,
            autorestart: true,
            max_memory_restart: '300M',
            env: {
                NODE_ENV: 'production'
            },
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
        }
    ]
};
