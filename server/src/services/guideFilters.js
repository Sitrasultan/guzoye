import { ApiError } from '../middleware/errors.js';
import { pagination } from '../middleware/validate.js';
export function guideFilters(query) {
  const allowed = ['destination', 'language', 'minRating', 'q', 'search', 'sort', 'page', 'limit'];
  for (const [key, value] of Object.entries(query)) if (!allowed.includes(key) || typeof value !== 'string' || value.length > 200) throw new ApiError(400, 'Invalid guide filter.');
  const { page, limit } = pagination(query), sort = query.sort || 'rating';
  if (!['rating', 'experience', 'name'].includes(sort)) throw new ApiError(400, 'Guide sort must be rating, experience or name.');
  if (query.destination && !/^[a-f0-9]{24}$/i.test(query.destination)) throw new ApiError(400, 'Choose a valid destination.');
  const minRating = query.minRating ? Number(query.minRating) : 0;
  if (!Number.isFinite(minRating) || minRating < 0 || minRating > 5) throw new ApiError(400, 'Minimum rating must be between 0 and 5.');
  return { page, limit, sort, minRating, destination: query.destination, language: query.language, q: query.q || query.search || '' };
}
