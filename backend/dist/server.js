"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("./app.js");
const env_js_1 = require("./config/env.js");
const database_js_1 = require("./config/database.js");
const storage_js_1 = require("./config/storage.js");
async function bootstrap() {
    try {
        (0, storage_js_1.initStorageDirectories)();
        await (0, database_js_1.connectDatabase)();
        const server = app_js_1.app.listen(env_js_1.env.PORT, '0.0.0.0', () => {
            console.log(`
=====================================================
🏥 CareLink Rural Telemedicine Backend Started!
📡 REST API:       http://localhost:${env_js_1.env.PORT}/api
📖 Documentation:  http://localhost:${env_js_1.env.PORT}/api/docs
❤️  Health Check:   http://localhost:${env_js_1.env.PORT}/health
🗄️  Storage Root:   ${env_js_1.env.STORAGE_ROOT}
=====================================================
      `);
        });
        server.on('error', (error) => {
            console.error('CareLink server startup error:', error);
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${env_js_1.env.PORT} is already occupied.`);
            }
            process.exitCode = 1;
        });
        const shutdown = async () => {
            console.log('Stopping server gracefully...');
            server.close(() => {
                console.log('HTTP server closed.');
                process.exit(0);
            });
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }
    catch (err) {
        console.error('Fatal startup error:', err);
        process.exit(1);
    }
}
bootstrap();
