import Tour from '../models/Tour.js';
import Media from '../models/Media.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';
import { prepareImage } from '../services/imageValidation.js';
import { storeImage, deleteStored } from '../services/mediaStorage.js';
import { transaction, audit } from '../services/management.js';
import { purge } from '../services/mediaLifecycle.js';

export const uploadTourImage = asyncHandler(async (req, res) => {
  const bytes = await prepareImage(req.file.buffer, 'tour');
  if (res.destroyed) throw new ApiError(400, 'Upload connection closed.');
  const stored = await storeImage(bytes);
  let result;
  try {
    result = await transaction(async session => {
      const tour = await Tour.findById(req.params.id).session(session);
      if (!tour) throw new ApiError(404, 'Tour not found.');
      if (await Media.countDocuments({ owner: req.user._id, kind: 'tour', tour: null, state: 'ready' }).session(session) >= 48) throw new ApiError(409, 'Remove unused tour uploads before adding more.');
      const [media] = await Media.create([{ ...stored, owner: req.user._id, kind: 'tour' }], { session });
      await audit(req.user._id, 'admin_media_upload', 'Tour', tour._id, { mediaId: media._id }, session);
      return { _id: media._id, url: media.url };
    });
  } catch (error) {
    try { if (!await Media.exists({ url: stored.url })) await deleteStored(stored); }
    catch (cleanup) { console.error('Admin upload needs reconciliation:', stored.key, cleanup.message); }
    throw error;
  }
  res.status(201).json({ data: result, message: 'Tour image uploaded.' });
});

export const removeTourImage = asyncHandler(async (req, res) => {
  const media = await transaction(async session => {
    const media = await Media.findById(req.params.mediaId).session(session);
    if (!media) throw new ApiError(404, 'Upload not found.');
    if (String(media.owner) !== String(req.user._id)) throw new ApiError(403, 'You can remove only your own uploads.');
    if (media.tour || await Tour.exists({ images: media.url }).session(session)) throw new ApiError(409, 'Remove this image from the tour before deleting it.');
    media.state = 'deleting'; await media.save({ session }); return media;
  });
  await purge(media);
  res.json({ message: 'Unused upload removed.' });
});
