import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import Tour from './models/Tour.js';
import Guide from './models/Guide.js';
import Destination from './models/Destination.js';
import { nextCode } from './services/identifiers.js';
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
if (env.mode === 'production' || !env.allowSeed) { console.error('Use a disposable development DB and ALLOW_DEMO_SEED=true.'); process.exit(1); }
try {
  validateEnvironment();
  const adminInput = parseCredentials({ name: env.adminName, email: env.adminEmail, password: env.adminPassword, role: 'traveler' }, true);
  const guidePassword = process.env.DEMO_GUIDE_PASSWORD || '';
  parseCredentials({ name: 'Demo Guide', email: 'guide@guzoye.example', password: guidePassword, role: 'guide' }, true);
  if (env.adminPassword.startsWith('replace-') || guidePassword.startsWith('replace-')) throw new Error('Set real demo passwords before seeding.');
  const catalog = JSON.parse(await readFile(new URL('../../shared/catalog.json', import.meta.url), 'utf8'));
  await connectDB();
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('Replica set or Atlas required.');
  if (await User.exists({ email: adminInput.email, _id: { $ne: adminId } })) throw new Error('Demo admin email belongs to another user.');
  const tourIds = catalog.tours.map(t => t._id);
  const removed = await Booking.deleteMany({ tour: { $in: tourIds } });
  await Review.deleteMany({ _id: { $in: catalog.reviews.map(r => r._id) } });
  await Tour.deleteMany({ _id: { $in: tourIds } });
  await Guide.deleteMany({ _id: { $in: catalog.guides.map(g => g._id) } });
  await Destination.deleteMany({ _id: { $in: catalog.destinations.map(d => d._id) } });
  const users = catalog.guides.map((g, index) => ({ _id: g.user._id, name: g.user.name, email: `guide${index + 1}@guzoye.example`, role: 'guide', password: guidePassword, isActive: true }));
  const reviewer = catalog.reviews[0].user;
  users.push({ _id: reviewer._id, name: reviewer.name, email: 'traveler@guzoye.example', role: 'traveler', password: randomBytes(24).toString('hex') });
  const oldUsers = await User.find({ _id: { $in: users.map(u => u._id) } }).select('_id').select('+tokenVersion').lean();
  const versions = new Map(oldUsers.map(user => [String(user._id), (user.tokenVersion || 0) + 1]));
  for (const user of users) user.tokenVersion = versions.get(String(user._id)) || 0;
  await User.deleteMany({ _id: { $in: users.map(u => u._id) } });
  for (const user of users) await User.create(user);
  await Destination.insertMany(catalog.destinations);
  await Guide.insertMany(catalog.guides.map(g => ({ ...g, user: g.user._id, status: 'approved', isActive: true, coveredDestinations: [...new Set(catalog.tours.filter(t => t.guide._id === g._id).map(t => t.destination._id))], regionsCovered: [...new Set(catalog.tours.filter(t => t.guide._id === g._id).map(t => t.destination.region))], approvedAt: new Date(), approvedBy: adminId })));
  const today = new Date();
  const guideObjectIds = catalog.guides.map(guide => guide._id);
await Tour.insertMany(catalog.tours.map((tour, index) => {
  const primary = tour.guide._id;
  const secondary = guideObjectIds[(guideObjectIds.indexOf(primary) + 1) % guideObjectIds.length];
  const assignedGuides = [...new Set([primary, secondary])];
  const makeGroups = (capacity, spotsLeft) => {
    const base = Math.floor(capacity / assignedGuides.length);
    const remainder = capacity % assignedGuides.length;
    const baseSpots = Math.floor(spotsLeft / assignedGuides.length);
    const spotsRemainder = spotsLeft % assignedGuides.length;
    return assignedGuides.map((guide, groupIndex) => ({ guide, capacity: base + (groupIndex < remainder ? 1 : 0), spotsLeft: baseSpots + (groupIndex < spotsRemainder ? 1 : 0) }));
  };
  return { ...tour, destination: tour.destination._id, owner: adminId, guide: primary, assignedGuides, archived: false, departures: Array.from({ length: 3 + index % 2 }, (_, i) => { const date = new Date(today); date.setUTCDate(date.getUTCDate() + 7 + index + i * 14); date.setUTCHours(6, 0, 0, 0); return { date, capacity: tour.capacity, spotsLeft: tour.capacity, guideGroups: makeGroups(tour.capacity, tour.capacity) }; }) };
}));
  // These remain illustrative reviews until Part B is implemented.
  await Review.insertMany(catalog.reviews.map(r => ({ ...r, user: r.user._id })));
  let admin = await User.findById(adminId).select('+tokenVersion');
  if (!admin) admin = new User({ _id: adminId, ...adminInput, role: 'admin' });
  else { admin.name = adminInput.name; admin.email = adminInput.email; admin.password = adminInput.password; admin.role = 'admin'; admin.isActive = true; admin.tokenVersion = (admin.tokenVersion || 0) + 1; }
  await admin.save(); await Booking.createIndexes();
  console.log(`Seeded six approved guide logins with owned tours, future departures and demo admin. Removed ${removed.deletedCount} fixture-tour bookings. Passwords are never printed.`);
} catch (error) { console.error('Seed failed:', error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }


export async function ensureReadableIdentifiers() {
  for (const [Model, kind, field] of [[Tour, 'tour', 'title'], [Guide, 'guide', 'location'], [Destination, 'destination', 'name']]) {
    const rows = await Model.find({ $or: [{ slug: { $exists: false } }, { slug: '' }, { code: { $exists: false } }, { code: '' }] });
    for (const row of rows) {
      const code = await nextCode(kind);
      row.code = code;
      if (!row.slug) row.slug = String(row[field] || kind).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      await row.save();
    }
  }
}
