import mongoose from 'mongoose';
import { ApiError } from '../middleware/errors.js';

const RESERVED = new Set(['admin', 'api', 'account', 'guide', 'guides', 'tour', 'tours', 'destination', 'destinations', 'login', 'register', 'bookings', 'wishlist', 'reviews', 'settings', 'profile', 'new', 'edit', 'delete']);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CODE_PATTERNS = { Tour: /^TOUR-\d{4}$/, Guide: /^GUIDE-\d{4}$/, Destination: /^DEST-\d{4}$/ };

export function normalizeSlug(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
export function validateSlug(value) {
  if (typeof value !== 'string' || value.length < 2 || value.length > 80 || !SLUG_PATTERN.test(value) || RESERVED.has(value)) {
    throw new ApiError(400, 'Slug must be 2-80 lowercase letters, numbers, or hyphens and cannot use a reserved word.');
  }
  return value;
}
export async function uniqueSlug(Model, title, requestedSlug, excludeId) {
  const base = validateSlug(requestedSlug || normalizeSlug(title) || 'item');
  let candidate = base, suffix = 1;
  while (await Model.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    suffix += 1; candidate = `${base}-${suffix}`;
  }
  return candidate;
}
export async function nextCode(kind, session) {
  const collection = mongoose.connection.collection('counters');
  const key = `${kind.toLowerCase()}Code`;
  const result = await collection.findOneAndUpdate(
    { _id: key }, { $inc: { sequence: 1 } }, { upsert: true, returnDocument: 'after', session }
  );
  const sequence = result?.sequence ?? 1;
  const prefix = { tour: 'TOUR', guide: 'GUIDE', destination: 'DEST' }[kind];
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}
export async function nextBookingReference(session) {
  const collection = mongoose.connection.collection('counters');
  const year = new Date().getUTCFullYear();
  const key = `bookingReference-${year}`;
  const result = await collection.findOneAndUpdate(
    { _id: key }, { $inc: { sequence: 1 } }, { upsert: true, returnDocument: 'after', session }
  );
  return `GZY-${year}-${String(result?.sequence ?? 1).padStart(6, '0')}`;
}
export function isLegacyId(value) { return /^[a-f0-9]{24}$/i.test(String(value || '')); }
export function identifierFilter(Model, value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (isLegacyId(text)) return { _id: new mongoose.Types.ObjectId(text) };
  if (Object.values(CODE_PATTERNS).some(pattern => pattern.test(text))) return { code: text.toUpperCase() };
  const slug = text.toLowerCase();
  if (slug.length > 80 || !SLUG_PATTERN.test(slug) || RESERVED.has(slug)) return null;
  return { slug };
}
