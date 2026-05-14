import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import router from './routes/index.js';
import { restoreMonitors } from './api/Tasks/monitor.js';
import { startAkamaiServer, stopAkamaiServer } from './helpers/akamai.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const ENABLE_AKAMAI = process.env.ENABLE_AKAMAI === 'true';

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.static(join(__dirname, 'public')));

app.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: Date.now()
  });
});

app.use('/v1', router);

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message;

  res.status(status).json({
    success: false,
    message,
    data: {}
  });
});

const boot = async () => {
  try {
    if (ENABLE_AKAMAI) {
      await startAkamaiServer();
      console.log('Akamai BMP enabled');
    } else {
      console.log('Akamai BMP disabled');
    }

    await restoreMonitors();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`SneakerBot API running on port ${PORT}`);
    });

    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      try {
        await stopAkamaiServer();
      } catch (e) {
        console.error('Akamai shutdown error:', e.message);
      }

      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('Startup failure:', err);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

boot();

export default app;
