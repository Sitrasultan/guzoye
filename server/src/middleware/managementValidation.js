import { ApiError } from './errors.js';
import { pagination } from './validate.js';
export function fail(field, message) { const error = new ApiError(400, message); error.errors = { [field]: message }; throw error; }
export function plain(body) { if (!body || typeof body !== 'object' || Array.isArray(body)) fail('body', 'A JSON object is required.'); return body; }
export function text(value, field, min = 1, max = 1000) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail(field, `${field} must contain ${min}–${max} characters.`);
  return value.trim();
}
export function number(value, field, min, max, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(field, `${field} must be ${integer ? 'a whole number' : 'a number'} between ${min} and ${max}.`);
  return value;
}
export function id(value, field = 'id') { if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) fail(field, `Invalid ${field}.`); return value; }
export function imageUrl(value, field = 'image') {
  const input = text(value, field, 1, 2048);
  let url; try { url = new URL(input); } catch { fail(field, 'Use a valid HTTPS image URL.'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port || host === 'localhost' || host.endsWith('.local') || host.endsWith('.localhost') || /^[0-9.]+$/.test(host) || host.includes(':') || host.startsWith('[')) fail(field, 'Use an HTTPS image URL on a public hostname, without credentials or a custom port.');
  return url.href;
}
export function list(value, field, max = 20) {
  if (!Array.isArray(value) || value.length > max) fail(field, `${field} must be a list with at most ${max} entries.`);
  return [...new Set(value.map(v => text(v, field, 1, 150)))];
}
export function profileInput(body) {
  plain(body);
  const allowed = ['bio', 'languages', 'specialties', 'regionsCovered', 'yearsExperience', 'image'];
  if (Object.keys(body).some(key => !allowed.includes(key))) fail('body', 'Profile contains unsupported fields.');
  const out = {};
  if ('bio' in body) out.bio = text(body.bio, 'bio', 20, 3000);
  for (const field of ['languages', 'specialties', 'regionsCovered']) if (field in body) out[field] = list(body[field], field);
  if ('yearsExperience' in body) out.yearsExperience = number(body.yearsExperience, 'yearsExperience', 0, 80, true);
  if ('image' in body) out.image = imageUrl(body.image);
  if (!Object.keys(out).length) fail('body', 'Submit at least one profile field.');
  return out;
}
export function departureInput(body) {
  plain(body);
  const dateText = text(body.date, 'date', 20, 40);
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(dateText)) fail('date', 'Departure requires an ISO date-time with a timezone.');
  const calendar = new Date(`${dateText.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(+calendar) || calendar.toISOString().slice(0, 10) !== dateText.slice(0, 10)) fail('date', 'Choose a valid calendar date.');
  const date = new Date(dateText);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) fail('date', 'Choose a future departure date and time.');
  const capacity = number(body.capacity, 'capacity', 1, 1000, true);
  return { date, capacity, spotsLeft: capacity };
}
export function tourInput(body, partial = false) {
  plain(body); const out = {};
  const allowed = ['title', 'destination', 'description', 'price', 'duration', 'difficulty', 'capacity', 'itinerary', 'images', 'included', 'excluded', ...(partial ? [] : ['departures'])];
  if (Object.keys(body).some(key => !allowed.includes(key))) fail('body', 'Tour contains unsupported fields. Use departure-management endpoints for availability.');
  const required = key => !partial || key in body;
  if (required('title')) out.title = text(body.title, 'title', 5, 180);
  if (required('destination')) out.destination = id(body.destination, 'destination');
  if (required('description')) out.description = text(body.description, 'description', 30, 10000);
  if (required('price')) { out.price = number(body.price, 'price', 0, 1000000); if (Math.abs(out.price * 100 - Math.round(out.price * 100)) > 1e-7) fail('price', 'Price supports at most two decimal places.'); }
  if (required('duration')) out.duration = number(body.duration, 'duration', 1, 365, true);
  if (required('capacity')) out.capacity = number(body.capacity, 'capacity', 1, 1000, true);
  if (required('difficulty')) { if (!['Easy', 'Moderate', 'Challenging'].includes(body.difficulty)) fail('difficulty', 'Choose Easy, Moderate or Challenging.'); out.difficulty = body.difficulty; }
  if (required('itinerary')) {
    if (!Array.isArray(body.itinerary) || body.itinerary.length < 1 || body.itinerary.length > 365) fail('itinerary', 'Add 1–365 itinerary days.');
    out.itinerary = body.itinerary.map((day, index) => { plain(day); return { day: index + 1, title: text(day.title, 'day title', 2, 180), description: text(day.description, 'day description', 5, 3000) }; });
  }
  if (required('images')) { if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > 10) fail('images', 'Add 1–10 image URLs.'); out.images = body.images.map(value => imageUrl(value, 'images')); }
  for (const field of ['included', 'excluded']) if (required(field)) out[field] = list(body[field], field, 40);
  if (!partial) { if (!Array.isArray(body.departures) || body.departures.length < 1 || body.departures.length > 40) fail('departures', 'Add 1–40 future departures.'); out.departures = body.departures.map(departureInput); const times = out.departures.map(d => +d.date); if (new Set(times).size !== times.length) fail('departures', 'Departure dates must be distinct.'); }
  if (!Object.keys(out).length) fail('body', 'Submit at least one tour field.');
  return out;
}
export function filters(query, allowed = []) {
  for (const [key, value] of Object.entries(query)) if (!['page', 'limit', ...allowed].includes(key) || typeof value !== 'string' || value.length > 200) fail('query', 'Invalid or unsupported list filter.');
  return pagination(query);
}
