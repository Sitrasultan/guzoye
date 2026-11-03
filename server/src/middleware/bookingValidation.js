import { ApiError } from './errors.js';
import { pagination } from './validate.js';
export const statuses = ['pending', 'confirmed', 'declined', 'cancelled', 'completed'];
export function objectId(value, field) {
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) {
    const error = new ApiError(400, `${field} must be a valid resource identifier.`);
    error.errors = { [field]: error.message }; throw error;
  }
  return value;
}
export function bookingInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'A JSON object is required.');
  const tour = objectId(body.tour, 'tour');
  const departureId = objectId(body.departureId, 'departureId');
  const guideId = objectId(body.guideId, 'guideId');
  if (typeof body.guests !== 'number' || !Number.isSafeInteger(body.guests) || body.guests < 1 || body.guests > 1000) {
    const error = new ApiError(400, 'Guests must be a whole number between 1 and 1000.');
    error.errors = { guests: error.message }; throw error;
  }
  return { tour, departureId, guideId, guests: body.guests };
}
export function statusInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !['confirmed', 'declined', 'completed'].includes(body.status)) {
    throw new ApiError(400, 'Status must be confirmed, declined, or completed.');
  }
  return body.status;
}
export function bookingFilters(query) {
  const allowed = ['status', 'page', 'limit'];
  for (const [key, value] of Object.entries(query)) {
    if (!allowed.includes(key) || typeof value !== 'string' || value.length > 100) throw new ApiError(400, 'Supported filters are status, page, and limit, as plain strings.');
  }
  if (query.status && !statuses.includes(query.status)) throw new ApiError(400, `Status must be one of: ${statuses.join(', ')}.`);
  return { ...pagination(query), ...(query.status ? { status: query.status } : {}) };
}
export function transitionAllowed(from, to) {
  return (from === 'pending' && ['confirmed', 'declined'].includes(to)) || (from === 'confirmed' && to === 'completed');
}
export function calculateTotal(price, guests) {
  const cents = Math.round(price * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || !Number.isSafeInteger(cents * guests)) throw new ApiError(409, 'Tour price is invalid. Please contact support.');
  return cents * guests / 100;
}
