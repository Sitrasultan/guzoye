import mongoose from 'mongoose';
import Tour from '../models/Tour.js';
import Guide from '../models/Guide.js';
import Destination from '../models/Destination.js';
import Booking from '../models/Booking.js';
import { normalizeSlug, uniqueSlug, nextCode, nextBookingReference } from '../services/identifiers.js';
import { env } from '../config/env.js';
import { connectDatabase } from '../config/db.js';

const dryRun = process.argv.includes('--dry-run');
const backupPath = new URL('../../backups/readable-ids-backup.json', import.meta.url);
const backup = { startedAt: new Date().toISOString(), tours: [], guides: [], destinations: [], bookings: [] };

async function backfill(Model, kind, titleField) {
  const rows = await Model.find({ $or: [{ slug: { $exists: false } }, { slug: '' }, { code: { $exists: false } }, { code: '' }] }).sort({ createdAt: 1 });
  for (const row of rows) {
    const slug = await uniqueSlug(Model, row[titleField], row.slug, row._id);
    const code = await nextCode(kind);
    backup[`${kind}s`].push({ _id: String(row._id), slug: row.slug || '', code: row.code || '' });
    console.log(`${kind}: ${row._id} -> ${slug} / ${code}`);
    if (!dryRun) await Model.updateOne({ _id: row._id }, { $set: { slug, code }, $addToSet: { slugHistory: slug } });
  }
}
async function backfillBookings() {
  const rows = await Booking.find({ $or: [{ reference: { $exists: false } }, { reference: '' }] }).sort({ createdAt: 1 });
  for (const row of rows) {
    const reference = await nextBookingReference();
    backup.bookings.push({ _id: String(row._id), reference: row.reference || '' });
    console.log(`booking: ${row._id} -> ${reference}`);
    if (!dryRun) await Booking.updateOne({ _id: row._id }, { $set: { reference } });
  }
}
await connectDatabase();
await backfill(Tour, 'tour', 'title');
await backfill(Guide, 'guide', 'location');
await backfill(Destination, 'destination', 'name');
await backfillBookings();
if (!dryRun) {
  const { writeFile, mkdir } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const path = await import('node:path');
  const file = fileURLToPath(backupPath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(backup, null, 2));
  console.log(`Backup written: ${file}`);
}
console.log(dryRun ? 'Dry run complete. No records were changed.' : 'Backfill complete.');
await mongoose.disconnect();
