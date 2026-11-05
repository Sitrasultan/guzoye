import mongoose from 'mongoose';
import { normalizeSlug, validateSlug } from '../services/identifiers.js';
const integer = { validator: Number.isInteger, message: 'Value must be an integer.' };
const guideGroupSchema = new mongoose.Schema({
  guide: { type: mongoose.Schema.Types.ObjectId, ref: 'Guide', required: true },
  capacity: { type: Number, required: true, min: 1, max: 1000, validate: integer },
  spotsLeft: { type: Number, required: true, min: 0, max: 1000, validate: integer }
});
const departureSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  capacity: { type: Number, required: true, min: 1, max: 1000, validate: integer },
  spotsLeft: { type: Number, required: true, min: 0, max: 1000, validate: integer },
  guideGroups: { type: [guideGroupSchema], default: [] }
});
departureSchema.pre('validate', function (next) {
  if (this.spotsLeft > this.capacity) this.invalidate('spotsLeft', 'Spots left cannot exceed capacity.');
  const groups = this.guideGroups || [];
  const ids = groups.map(group => String(group.guide));
  if (new Set(ids).size !== ids.length) this.invalidate('guideGroups', 'A guide can appear only once per departure.');
  if (groups.length && groups.reduce((total, group) => total + group.capacity, 0) !== this.capacity) {
    this.invalidate('guideGroups', 'Guide-group capacities must add up to the departure capacity.');
  }
  if (groups.length && groups.reduce((total, group) => total + group.spotsLeft, 0) !== this.spotsLeft) {
    this.invalidate('guideGroups', 'Guide-group spots left must add up to the departure spots left.');
  }
  for (const group of groups) if (group.spotsLeft > group.capacity) this.invalidate('guideGroups', 'A guide group cannot have more spots left than capacity.');
  next();
});
const daySchema = new mongoose.Schema({ day: { type: Number, required: true, min: 1, validate: integer }, title: { type: String, required: true }, description: { type: String, required: true } }, { _id: false });
const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 2, maxlength: 80, validate: { validator: value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), message: 'Invalid tour slug.' } },
  slugHistory: { type: [String], default: [] },
  code: { type: String, required: true, unique: true, uppercase: true, match: /^TOUR-\d{4}$/ },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  description: { type: String, required: true, maxlength: 10000 },
  price: { type: Number, required: true, min: 0, max: 1000000 },
  duration: { type: Number, required: true, min: 1, max: 365, validate: integer },
  difficulty: { type: String, enum: ['Easy', 'Moderate', 'Challenging'], required: true },
  capacity: { type: Number, required: true, min: 1, max: 1000, validate: integer },
  departures: { type: [departureSchema], default: [] },
  itinerary: { type: [daySchema], validate: [v => v.length > 0, 'An itinerary is required.'] },
  images: { type: [String], validate: [v => v.length > 0, 'At least one image is required.'] },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignedGuides: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Guide', required: true }],
  // Deprecated compatibility field retained for the 1a migration and rollback.
  guide: { type: mongoose.Schema.Types.ObjectId, ref: 'Guide', default: null },
  included: [String], excluded: [String], status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  archived: { type: Boolean, default: false, index: true }, archivedAt: Date,
  mutationVersion: { type: Number, default: 0, select: false },
  rating: { type: Number, min: 0, max: 5, default: 0 }, reviewCount: { type: Number, min: 0, default: 0 }, featured: { type: Boolean, default: false }
}, { timestamps: true });
schema.index({ destination: 1, price: 1 });
// schema.index({ slug: 1 }, { unique: true });
// schema.index({ code: 1 }, { unique: true });
// schema.index({ slugHistory: 1 });
schema.index({ assignedGuides: 1 });
schema.index({ owner: 1 });
schema.pre('validate', function (next) {
  if (!this.slug && this.title) this.slug = normalizeSlug(this.title);
  if (this.slug) this.slug = validateSlug(this.slug);
  if (this.isModified('title') && this.slug && !this.slugHistory.includes(this.slug)) this.slugHistory.push(this.slug);
  next();
});
schema.set('toJSON', { transform(_doc, value) { delete value.mutationVersion; return value; } });
export default mongoose.model('Tour', schema);
