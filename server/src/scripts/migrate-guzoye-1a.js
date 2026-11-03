import { writeFile, mkdir } from 'node:fs/promises';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env, validateEnvironment } from '../config/env.js';
import Tour from '../models/Tour.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
const dryRun = process.argv.includes('--dry-run');
try {
  validateEnvironment();
  await connectDB();
  const admin = await User.findOne({ role: 'admin', isActive: { $ne: false } }).select('_id').lean();
  if (!admin) throw new Error('An active admin user is required.');
  const tours = await Tour.find({}).lean();
  const bookings = await Booking.find({}).lean();
  const snapshot = { createdAt: new Date().toISOString(), tours, bookings };
  if (!dryRun) {
    await mkdir(new URL('../../data/', import.meta.url), { recursive: true });
    await writeFile(new URL(`../../data/guzoye-1a-backup-${Date.now()}.json`, import.meta.url), JSON.stringify(snapshot, null, 2));
  }
  let toursMigrated = 0, departuresMigrated = 0, bookingsMigrated = 0;
  for (const tour of tours) {
    if (tour.owner) continue;
    const legacyGuide = tour.guide;
    if (!legacyGuide) throw new Error(`Tour ${tour._id} has no legacy guide; manual assignment is required.`);
    const assignedGuides = [legacyGuide];
    const departures = tour.departures.map(departure => {
      if (departure.guideGroups?.length) return departure;
      departuresMigrated += 1;
      return { ...departure, guideGroups: [{ guide: legacyGuide, capacity: departure.capacity, spotsLeft: departure.spotsLeft }] };
    });
    toursMigrated += 1;
    if (!dryRun) await Tour.updateOne({ _id: tour._id }, { $set: { owner: admin._id, assignedGuides, departures } });
  }
  for (const booking of bookings) {
    if (booking.guide) continue;
    const tour = tours.find(item => String(item._id) === String(booking.tour));
    if (!tour?.guide) throw new Error(`Booking ${booking._id} cannot be migrated because its tour has no legacy guide.`);
    bookingsMigrated += 1;
    if (!dryRun) await Booking.updateOne({ _id: booking._id }, { $set: { guide: tour.guide } });
  }
  console.log(`Dry run: ${dryRun}. Tours migrated: ${toursMigrated}. Departures migrated: ${departuresMigrated}. Bookings migrated: ${bookingsMigrated}.`);
  console.log('Rollback: restore owner, assignedGuides, departure guideGroups, and booking guide from the JSON backup written under server/data/.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
