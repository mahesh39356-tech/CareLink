import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { initStorageDirectories } from './config/storage.js';

async function bootstrap() {
  try {
    initStorageDirectories();
    await connectDatabase();

    const server = app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`
=====================================================
🏥 CareLink Rural Telemedicine Backend Started!
📡 REST API:       http://localhost:${env.PORT}/api
📖 Documentation:  http://localhost:${env.PORT}/api/docs
❤️  Health Check:   http://localhost:${env.PORT}/health
🗄️  Storage Root:   ${env.STORAGE_ROOT}
=====================================================
      `);
    });

    server.on('error', (error: any) => {
      console.error('CareLink server startup error:', error);

      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${env.PORT} is already occupied.`);
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
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

bootstrap();
