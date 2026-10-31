import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { COOKIE_NAME } from '../services/session.js';
import { ApiError } from './errors.js';
const CSRF_COOKIE = 'wondu_csrf';
function signature(nonce, session) {
  return createHmac('sha256', env.jwtSecret).update(`${nonce}|${session}`).digest('hex');
}
export function csrfToken(req, res) {
  const nonce = randomBytes(32).toString('hex');
  const token = `${nonce}.${signature(nonce, req.cookies[COOKIE_NAME] || 'anonymous')}`;
  res.set('Cache-Control', 'no-store');
  // This cookie is also httpOnly. React receives the token from the JSON response.
  res.cookie(CSRF_COOKIE, token, { httpOnly: true, secure: env.cookieSecure, sameSite: 'lax', path: '/', maxAge: env.jwtExpiresSeconds * 1000 });
  res.json({ data: { csrfToken: token } });
}
export function requireCsrf(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('origin') !== env.clientOrigin) return next(new ApiError(403, 'Untrusted request origin.'));
  const header = req.get('x-csrf-token');
  const cookie = req.cookies[CSRF_COOKIE];
  if (typeof header !== 'string' || header.length !== 129 || header !== cookie) return next(new ApiError(403, 'Invalid or missing CSRF token. Refresh and try again.'));
  const [nonce, mac] = header.split('.');
  if (!/^[a-f0-9]{64}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(mac)) return next(new ApiError(403, 'Invalid CSRF token.'));
  const expected = signature(nonce, req.cookies[COOKIE_NAME] || 'anonymous');
  if (!timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expected, 'hex'))) return next(new ApiError(403, 'CSRF token expired. Refresh and try again.'));
  if (!req.is('application/json')) return next(new ApiError(415, 'Use Content-Type: application/json.'));
  next();
}
