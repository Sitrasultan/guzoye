import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
// Resolve relative to this file, not the shell's working directory.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
export const env = {
  port: Number(process.env.PORT || 5000),
  mode: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wondu',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  allowSeed: process.env.ALLOW_DEMO_SEED === 'true'
};
