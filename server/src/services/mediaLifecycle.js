import Media from '../models/Media.js';
import Tour from '../models/Tour.js';
import Guide from '../models/Guide.js';
import { deleteStored } from './mediaStorage.js';
import { ApiError } from '../middleware/errors.js';
export async function purge(media) {
  if (!media) return;
  try { await deleteStored(media); await Media.deleteOne({ _id: media._id, state: 'deleting' }); }
  catch (error) { console.error('Media cleanup pending:', String(media._id), error.message); }
}
export async function markForDeletion(id, session) {
  return Media.findOneAndUpdate({ _id: id }, { $set: { state: 'deleting' } }, { new: true, session });
}
// Called inside the same transaction as tour create/edit. Ready media cannot be
// deleted concurrently because both actions write the Media document.
export async function bindTourImages(tour, images, owner, session) {
  if (!Array.isArray(images) || images.length < 1 || images.length > 6 || new Set(images).size !== images.length) throw new ApiError(400, 'Choose 1–6 distinct tour images.');
  const previous = [...(tour.images || [])];
  for (const url of images) {
    const media = await Media.findOne({ url }).session(session);
    if (media) {
      const alreadyAttached = media.tour && String(media.tour) === String(tour._id);
      if (media.kind !== 'tour' || media.state !== 'ready' || (!alreadyAttached && (String(media.owner) !== String(owner) || media.tour))) throw new ApiError(403, 'This image does not belong to your tour or upload library.');
      media.tour = tour._id; await media.save({ session });
    } else if (url.startsWith('/uploads/') || (!previous.includes(url) && !url.startsWith('https://'))) throw new ApiError(400, 'This uploaded image is missing. Upload it again.');
    // HTTPS legacy URLs remain supported for seeded data/backwards compatibility;
    // the new UI creates images only through the upload endpoint.
  }
  const removed = await Media.find({ tour: tour._id, url: { $nin: images }, state: 'ready' }).session(session);
  for (const media of removed) { media.state = 'deleting'; media.tour = null; await media.save({ session }); }
  return removed;
}
