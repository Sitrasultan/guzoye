import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Booking from '../models/Booking.js';
try {
  await connectDB();
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('MongoDB is standalone. Bookings require a replica set or Atlas.');
  const legacy = await Booking.countDocuments({ $or: [{ departureId: { $exists: false } }, { active: { $exists: false } }] });
  if (legacy) throw new Error(`${legacy} legacy bookings lack departure/active fields. Back up and migrate/remove development records; no automatic conversion is safe.`);
  await Booking.createIndexes();
  const indexes = await Booking.collection.indexes();
  if (!indexes.some(index => index.name === 'one_active_booking_per_departure' && index.unique)) throw new Error('Required unique active-booking index is missing.');
  console.log('Transaction topology and unique active-booking index verified.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
