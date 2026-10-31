import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Guide from '../models/Guide.js';
import { env } from '../config/env.js';
import { COOKIE_NAME } from '../services/session.js';
import { ApiError, asyncHandler } from './errors.js';
export const requireAuth = asyncHandler(async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const token = req.cookies[COOKIE_NAME];
  if (!token) throw new ApiError(401, 'Please log in to continue.');
  let payload;
  try { payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'], issuer: 'wondu-api', audience: 'wondu-web' }); }
  catch { throw new ApiError(401, 'Your session has expired or is invalid. Please log in again.'); }
  if (typeof payload.sub !== 'string' || !/^[a-f0-9]{24}$/i.test(payload.sub)) throw new ApiError(401, 'Invalid session.');
  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || user.isActive === false || payload.ver !== (user.tokenVersion || 0)) throw new ApiError(401, 'Your session is no longer active. Please log in again.');
  req.user = user; next();
});
export const requireRoles = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new ApiError(401, 'Please log in to continue.'));
  if (!roles.includes(req.user.role)) return next(new ApiError(403, 'You do not have permission to access this resource.'));
  next();
};
export const requireApprovedGuide = asyncHandler(async (req, _res, next) => {
  const guide = await Guide.findOne({ user: req.user._id, status: 'approved', isActive: { $ne: false } });
  if (!guide) throw new ApiError(403, 'Your guide account must be approved and active.');
  req.guide = guide; next();
});
