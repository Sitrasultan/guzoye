import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
export const COOKIE_NAME = 'wondu_session';
export const cookieOptions = () => ({
  httpOnly: true, secure: env.cookieSecure, sameSite: 'lax', path: '/'
});
export function issueSession(res, user) {
  const token = jwt.sign({ ver: user.tokenVersion || 0 }, env.jwtSecret, {
    algorithm: 'HS256', subject: String(user._id), issuer: 'wondu-api',
    audience: 'wondu-web', expiresIn: env.jwtExpiresSeconds
  });
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: env.jwtExpiresSeconds * 1000 });
}
export function clearSession(res) { res.clearCookie(COOKIE_NAME, cookieOptions()); }
