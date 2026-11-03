import { validateMediaEnvironment } from './services/mediaStorage.js';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './config/db.js';
import { env, validateEnvironment } from './config/env.js';
try {
  validateEnvironment();
  validateMediaEnvironment();
  await connectDB();
  const server = app.listen(env.port, () => console.log(`Guzoye API listening on http://localhost:${env.port}`));
  let closing = false;
  function shutdown(signal) {
    if (closing) return;
    closing = true;
    console.log(`${signal}: shutting down`);
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(async () => { await mongoose.disconnect(); clearTimeout(timeout); process.exit(0); });
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  server.on('error', error => { console.error(error.message); process.exit(1); });
} catch (error) { console.error('Startup failed:', error.message); process.exit(1); }
