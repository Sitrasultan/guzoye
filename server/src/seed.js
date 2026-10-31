import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import User from './models/User.js';
import Guide from './models/Guide.js';
import Destination from './models/Destination.js';
import Tour from './models/Tour.js';
import Review from './models/Review.js';
import Booking from './models/Booking.js';
if(env.mode==='production'||!env.allowSeed){console.error('Seed refused. Use a development database and set ALLOW_DEMO_SEED=true explicitly.');process.exit(1);}
try {
  const catalog=JSON.parse(await readFile(new URL('../../shared/catalog.json',import.meta.url),'utf8'));
  await connectDB();
  const users=catalog.guides.map((g,i)=>({_id:g.user._id,name:g.user.name,email:`guide${i+1}@wondu.example`,role:'guide',password:randomBytes(24).toString('hex')}));
  const reviewUser=catalog.reviews[0].user;
  users.push({_id:reviewUser._id,name:reviewUser.name,email:'traveler@wondu.example',role:'traveler',password:randomBytes(24).toString('hex')});
  // Replace only deterministic fixture IDs, never wipe unrelated collections.
  const tourIds=catalog.tours.map(t=>t._id);
  if(await Booking.exists({tour:{$in:tourIds}}))throw new Error('Seed refused: fixture tours have bookings. Use a separate development database.');
  await Review.deleteMany({_id:{$in:catalog.reviews.map(r=>r._id)}});
  await Tour.deleteMany({_id:{$in:tourIds}});
  await Guide.deleteMany({_id:{$in:catalog.guides.map(g=>g._id)}});
  await Destination.deleteMany({_id:{$in:catalog.destinations.map(d=>d._id)}});
  await User.deleteMany({_id:{$in:users.map(u=>u._id)}});
  // create() executes password hashing hooks; no demo credential is published.
  for(const user of users)await User.create(user);
  await Destination.insertMany(catalog.destinations);
  await Guide.insertMany(catalog.guides.map(g=>({...g,user:g.user._id})));
  await Tour.insertMany(catalog.tours.map(t=>({...t,destination:t.destination._id,guide:t.guide._id})));
  await Review.insertMany(catalog.reviews.map(r=>({...r,user:r.user._id})));
  console.log(`Seeded ${catalog.tours.length} tours, ${catalog.guides.length} guides, ${catalog.destinations.length} destinations, and ${catalog.reviews.length} sample reviews.`);
} catch(error){console.error('Seed failed:',error.message);process.exitCode=1;} finally{await mongoose.disconnect();}
