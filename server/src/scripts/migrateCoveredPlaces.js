import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Guide from '../models/Guide.js';
import Tour from '../models/Tour.js';
try {
  await connectDB(); let count = 0;
  for await (const guide of Guide.find()) {
    const ids = await Tour.distinct('destination', { guide: guide._id, archived: { $ne: true } });
    if (ids.length) { await Guide.updateOne({ _id: guide._id }, { $addToSet: { coveredDestinations: { $each: ids } } }); count += 1; }
  }
  console.log(`Backfilled coverage from owned published tours for ${count} guides; no records deleted.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
