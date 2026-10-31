import { ApiError } from './errors.js';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function parseCredentials(body, registration = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'A JSON object is required.');
  const errors = {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!emailPattern.test(email) || email.length > 254) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  else if (registration && Array.from(password).length < 8) errors.password = 'Password must contain at least 8 characters.';
  else if (Buffer.byteLength(password, 'utf8') > 72) errors.password = 'Password must be at most 72 UTF-8 bytes.';
  let name, role;
  if (registration) {
    name = typeof body.name === 'string' ? body.name.trim() : '';
    role = body.role === undefined ? 'traveler' : body.role;
    if (!name || name.length > 100) errors.name = 'Name is required and must be at most 100 characters.';
    if (!['traveler', 'guide'].includes(role)) errors.role = 'Choose traveler or guide. Public admin registration is not allowed.';
  }
  if (Object.keys(errors).length) {
    const error = new ApiError(400, 'Please correct the highlighted fields.');
    error.errors = errors;
    throw error;
  }
  // Return an explicit allowlist, never spread the request body into a model.
  return registration ? { name, email, password, role } : { email, password };
}
export const validateRegistration = (req, _res, next) => {
  try { req.validated = parseCredentials(req.body, true); next(); } catch (error) { next(error); }
};
export const validateLogin = (req, _res, next) => {
  try { req.validated = parseCredentials(req.body); next(); } catch (error) { next(error); }
};
