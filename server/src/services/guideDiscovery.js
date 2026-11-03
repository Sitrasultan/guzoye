import mongoose from 'mongoose';
import { escapeRegex } from '../middleware/validate.js';
export { guideFilters } from './guideFilters.js';
export function discoveryPipeline(filters, specificId) {
  const match = { status: 'approved', isActive: { $ne: false }, rating: { $gte: filters.minRating || 0 }, ...(specificId ? { _id: new mongoose.Types.ObjectId(specificId) } : {}) };
  if (filters.language) match.languages = filters.language;
  const pipeline = [
    { $match: match },
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'person' } },
    { $unwind: '$person' }, { $match: { 'person.isActive': { $ne: false } } },
    { $lookup: { from: 'tours', let: { guide: '$_id' }, pipeline: [{ $match: { $expr: { $eq: ['$guide', '$$guide'] }, archived: { $ne: true } } }, { $project: { destination: 1 } }], as: 'owned' } },
    { $set: { placeIds: { $setUnion: [{ $ifNull: ['$coveredDestinations', []] }, '$owned.destination'] } } },
    { $lookup: { from: 'destinations', localField: 'placeIds', foreignField: '_id', as: 'coveredPlaces' } }
  ];
  if (filters.destination) pipeline.push({ $match: { placeIds: new mongoose.Types.ObjectId(filters.destination) } });
  if (filters.q) pipeline.push({ $match: { 'person.name': new RegExp(escapeRegex(filters.q), 'i') } });
  pipeline.push({ $project: { _id: 1, user: { _id: '$person._id', name: '$person.name', role: '$person.role' }, bio: 1, languages: 1, specialties: 1, regionsCovered: 1, coveredDestinations: 1, coveredPlaces: { $map: { input: '$coveredPlaces', as: 'place', in: { _id: '$$place._id', name: '$$place.name', region: '$$place.region' } } }, rating: 1, reviewCount: 1, yearsExperience: 1, location: 1, image: 1, status: 1, isActive: 1 } });
  return pipeline;
}
