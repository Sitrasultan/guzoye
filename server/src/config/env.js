import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
export const env = {
  port: Number(process.env.PORT || 5000),
  mode: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wondu',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  allowSeed: process.env.ALLOW_DEMO_SEED === 'true',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresSeconds: Number(process.env.JWT_EXPIRES_SECONDS || 3600),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  adminName: process.env.DEMO_ADMIN_NAME || 'Wondu Demo Admin',
  adminEmail: process.env.DEMO_ADMIN_EMAIL || '',
  adminPassword: process.env.DEMO_ADMIN_PASSWORD || ''
};
export function validateEnvironment() {
  if (env.jwtSecret.length < 32 || env.jwtSecret.startsWith('replace-')) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
  }
  if (!Number.isInteger(env.jwtExpiresSeconds) || env.jwtExpiresSeconds < 60 || env.jwtExpiresSeconds > 86400) {
    throw new Error('JWT_EXPIRES_SECONDS must be an integer between 60 and 86400.');
  }
  const origin = new URL(env.clientOrigin);
  if (origin.origin !== env.clientOrigin) throw new Error('CLIENT_ORIGIN must be an exact origin with no trailing slash or path.');
  if (env.mode === 'production' && (!env.cookieSecure || origin.protocol !== 'https:')) {
    throw new Error('Production requires COOKIE_SECURE=true and an HTTPS CLIENT_ORIGIN.');
  }
}
