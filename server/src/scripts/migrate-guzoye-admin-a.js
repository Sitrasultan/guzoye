import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env, validateEnvironment } from '../config/env.js';
import Tour from '../models/Tour.js';
const dryRun = process.argv.includes('--dry-run');
try {
  validateEnvironment(); await connectDB();
  const tours = await Tour.find({});
  let published = 0, draft = 0, archived = 0;
  for (const tour of tours) {
    const next = tour.archived ? 'archived' : (tour.assignedGuides?.length && tour.departures.some(item => +new Date(item.date) > Date.now()) ? 'published' : 'draft');
    if (tour.status !== next) { if (!dryRun) { tour.status = next; await tour.save(); } }
    if (next === 'published') published++; else if (next === 'archived') archived++; else draft++;
  }
  console.log(`Dry run: ${dryRun}. Published: ${published}. Draft: ${draft}. Archived: ${archived}.`);
} catch (error) { console.error('Migration failed:', error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
