import mongoose from 'mongoose';
import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { uploadDirectory } from '../services/mediaStorage.js';
import { connectDB } from '../config/db.js';
import Media from '../models/Media.js';
import Guide from '../models/Guide.js';
import Tour from '../models/Tour.js';
import { transaction } from '../services/management.js';
import { purge } from '../services/mediaLifecycle.js';
// Schedule hourly. Expire unattached tour drafts after 24 hours; do not touch
// attached images or the current profile photo. Same Media write-lock as attachment.
try {
  await connectDB();
  const ids = await Media.find({ $or: [{ state: 'deleting' }, { kind: 'tour', tour: null, createdAt: { $lt: new Date(Date.now() - 86400000) } }] }).select('_id').limit(500).lean();
  for (const { _id } of ids) {
    const media = await transaction(async session => {
      const media = await Media.findById(_id).session(session); if (!media) return null;
      if (media.tour || await Tour.exists({ images: media.url }).session(session) || await Guide.exists({ photoMedia: media._id }).session(session)) return null;
      if (media.state !== 'deleting' && +media.createdAt > Date.now() - 86400000) return null;
      media.state = 'deleting'; await media.save({ session }); return media;
    });
    await purge(media);
  }
  const names = await readdir(uploadDirectory).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
  for (const key of names) {
    if (!/^[0-9a-f-]{36}\.webp$/.test(key)) continue;
    const file = path.join(uploadDirectory, key);
    const info = await stat(file);
    if (info.mtimeMs < Date.now() - 86400000 && !await Media.exists({ provider: 'local', key })) await unlink(file);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
