import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { env, validateEnvironment } from './config/env.js';
import { parseCredentials } from './middleware/authValidation.js';
import User from './models/User.js';
import Guide from './models/Guide.js';
import Destination from './models/Destination.js';
import Tour from './models/Tour.js';
import Review from './models/Review.js';
import Booking from './models/Booking.js';
const adminId = '0000000000000000000003e7';
if (env.mode === 'production' || !env.allowSeed) {
  console.error('Seed refused. Use a disposable development DB and ALLOW_DEMO_SEED=true.');
  process.exit(1);
}
try {
  validateEnvironment();
  const adminInput = parseCredentials({ name: env.adminName, email: env.adminEmail, password: env.adminPassword, role: 'traveler' }, true);
  if (env.adminPassword.startsWith('replace-')) throw new Error('Set a real DEMO_ADMIN_PASSWORD before seeding.');
  const catalog = JSON.parse(await readFile(new URL('../../shared/catalog.json', import.meta.url), 'utf8'));
  await connectDB();
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('Use a transaction-capable replica set or Atlas deployment. See docs/PHASE4.md.');
  const conflict = await User.findOne({ email: adminInput.email, _id: { $ne: adminId } });
  if (conflict) throw new Error('DEMO_ADMIN_EMAIL belongs to another account; seed will not promote it.');
  const tourIds = catalog.tours.map(t => t._id);
  // Explicit Phase 4 reset: fixture bookings are deleted before departure IDs reset.
  const removed = await Booking.deleteMany({ tour: { $in: tourIds } });
  await Review.deleteMany({ _id: { $in: catalog.reviews.map(r => r._id) } });
  await Tour.deleteMany({ _id: { $in: tourIds } });
  await Guide.deleteMany({ _id: { $in: catalog.guides.map(g => g._id) } });
  await Destination.deleteMany({ _id: { $in: catalog.destinations.map(d => d._id) } });
  const users = catalog.guides.map((g, i) => ({ _id: g.user._id, name: g.user.name, email: `guide${i + 1}@wondu.example`, role: 'guide', password: randomBytes(24).toString('hex') }));
  const reviewer = catalog.reviews[0].user;
  users.push({ _id: reviewer._id, name: reviewer.name, email: 'traveler@wondu.example', role: 'traveler', password: randomBytes(24).toString('hex') });
  await User.deleteMany({ _id: { $in: users.map(u => u._id) } });
  for (const user of users) await User.create(user);
  await Destination.insertMany(catalog.destinations);
  await Guide.insertMany(catalog.guides.map(g => ({ ...g, user: g.user._id, status: 'approved', approvedAt: new Date(), approvedBy: adminId })));
  const seedDay = new Date();
  await Tour.insertMany(catalog.tours.map((tour, index) => ({
    ...tour, destination: tour.destination._id, guide: tour.guide._id,
    departures: Array.from({ length: 3 + index % 2 }, (_, departureIndex) => {
      const date = new Date(seedDay);
      date.setUTCDate(date.getUTCDate() + 7 + index + departureIndex * 14);
      date.setUTCHours(6, 0, 0, 0); // 09:00 Ethiopia time (UTC+3).
      return { date, capacity: tour.capacity, spotsLeft: tour.capacity };
    })
  })));
  await Review.insertMany(catalog.reviews.map(r => ({ ...r, user: r.user._id })));
  let admin = await User.findById(adminId).select('+tokenVersion');
  if (!admin) admin = new User({ _id: adminId, ...adminInput, role: 'admin' });
  else { admin.name = adminInput.name; admin.email = adminInput.email; admin.password = adminInput.password; admin.role = 'admin'; admin.tokenVersion = (admin.tokenVersion || 0) + 1; }
  await admin.save();
  await Booking.createIndexes();
  console.log(`Seeded 8 tours with 3–4 future departures each, 6 approved guides, destinations, reviews and the configured admin. Deleted ${removed.deletedCount} fixture-tour bookings.`);
} catch (error) { console.error('Seed failed:', error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
