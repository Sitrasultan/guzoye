import Guide from '../models/Guide.js';
import Tour from '../models/Tour.js';
import Media from '../models/Media.js';
import { ApiError } from '../middleware/errors.js';
import { prepareImage } from '../services/imageValidation.js';
import { storeImage, deleteStored } from '../services/mediaStorage.js';
import { transaction } from '../services/management.js';
import { purge, markForDeletion } from '../services/mediaLifecycle.js';
export async function upload(req, res) {
  const kind = req.mediaKind;
  const bytes = await prepareImage(req.file.buffer, kind);
  if (res.destroyed) throw new ApiError(400, 'Upload connection closed.');
  const stored = await storeImage(bytes);
  let result;
  try {
    result = await transaction(async session => {
      const guide = await Guide.findOneAndUpdate({ user: req.user._id, isActive: { $ne: false }, status: { $in: kind === 'avatar' ? ['pending', 'approved'] : ['approved'] } }, { $inc: { mutationVersion: 1 } }, { session, new: true }).select('+photoMedia');
      if (!guide) throw new ApiError(403, 'This guide account cannot upload images.');
      if (kind === 'tour' && await Media.countDocuments({ owner: req.user._id, kind: 'tour', tour: null, state: 'ready' }).session(session) >= 24) throw new ApiError(409, 'You have 24 unattached images. Remove unused uploads before adding more.');
      const [media] = await Media.create([{ ...stored, owner: req.user._id, kind }], { session });
      let old;
      if (kind === 'avatar') { old = guide.photoMedia ? await markForDeletion(guide.photoMedia, session) : null; guide.image = stored.url; guide.photoMedia = media._id; await guide.save({ session }); }
      return { media: { _id: media._id, url: media.url }, old };
    });
  } catch (error) {
    // No DB reference committed: delete the newly stored bytes, not the old image.
    try {
      // Commit acknowledgements can be uncertain. Never delete bytes if a Media
      // reference exists, or if DB availability prevents checking safely.
      if (!await Media.exists({ url: stored.url })) await deleteStored(stored);
    } catch (cleanup) { console.error('Upload needs reconciliation:', stored.provider, stored.key, cleanup.message); }
    throw error;
  }
  await purge(result.old);
  res.status(201).json({ data: result.media, message: 'Image uploaded.' });
}
export async function removePhoto(req, res) {
  const old = await transaction(async session => {
    const guide = await Guide.findOneAndUpdate({ user: req.user._id, status: { $in: ['pending', 'approved'] }, isActive: { $ne: false } }, { $inc: { mutationVersion: 1 } }, { session, new: true }).select('+photoMedia');
    if (!guide) throw new ApiError(403, 'This guide account cannot remove a photo.');
    const old = guide.photoMedia ? await markForDeletion(guide.photoMedia, session) : null;
    guide.image = ''; guide.photoMedia = null; await guide.save({ session }); return old;
  });
  await purge(old); res.json({ message: 'Profile photo removed.', data: { url: '' } });
}
export async function library(req, res) {
  const data = await Media.find({ owner: req.user._id, kind: 'tour', tour: null, state: 'ready' }).select('_id url createdAt').sort({ createdAt: -1 }).limit(24).lean();
  res.json({ data });
}
export async function removeDraft(req, res) {
  const media = await transaction(async session => {
    const media = await Media.findById(req.params.id).session(session);
    if (!media) throw new ApiError(404, 'Upload not found.');
    if (String(media.owner) !== String(req.user._id)) throw new ApiError(403, 'You can remove only your own uploads.');
    if (media.tour || await Tour.exists({ images: media.url }).session(session)) throw new ApiError(409, 'Save the tour without this image first. Attached images cannot be deleted from the upload library.');
    media.state = 'deleting'; await media.save({ session }); return media;
  });
  await purge(media); res.json({ message: 'Unused upload removed.' });
}
