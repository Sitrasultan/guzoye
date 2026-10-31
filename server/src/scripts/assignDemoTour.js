import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import User from '../models/User.js';
import Guide from '../models/Guide.js';
import Tour from '../models/Tour.js';
import Booking from '../models/Booking.js';
import { objectId } from '../middleware/bookingValidation.js';
const args = process.argv.slice(2);
const arg = key => { const index = args.indexOf(key); return index >= 0 ? args[index + 1] : undefined; };
try {
  if (env.mode === 'production' || !env.allowSeed) throw new Error('Development only. Set ALLOW_DEMO_SEED=true and stop the API before assigning a demo tour.');
  const email = arg('--email')?.trim().toLowerCase();
  const id = objectId(arg('--tour'), 'tour');
  if (!email) throw new Error('Usage: node server/src/scripts/assignDemoTour.js --email guide@example.com --tour <tour-id>');
  await connectDB();
  const user = await User.findOne({ email, role: 'guide' });
  if (!user) throw new Error('No guide user has this email. Register the guide first.');
  const guide = await Guide.findOne({ user: user._id, status: 'approved' });
  if (!guide) throw new Error('Admin must approve this guide first.');
  if (await Booking.exists({ tour: id })) throw new Error('Tour already has bookings. Choose an unused demo tour; ownership will not be changed.');
  const tour = await Tour.findByIdAndUpdate(id, { $set: { guide: guide._id } }, { new: true, runValidators: true });
  if (!tour) throw new Error('Tour not found.');
  console.log(`Assigned demo tour "${tour.title}" to ${user.name}. Reset ALLOW_DEMO_SEED=false before restarting the API.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
