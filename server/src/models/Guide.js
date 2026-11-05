import mongoose from 'mongoose';
import { normalizeSlug, validateSlug } from '../services/identifiers.js';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 2, maxlength: 80, validate: { validator: value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), message: 'Invalid guide slug.' } },
  slugHistory: { type: [String], default: [] },
  code: { type: String, required: true, unique: true, uppercase: true, match: /^GUIDE-\d{4}$/ },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  isActive: { type: Boolean, default: true },
  mutationVersion: { type: Number, default: 0, select: false },
  rejectionReason: { type: String, default: '', maxlength: 1000 },
  approvedAt: Date, approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bio: { type: String, default: 'This guide is preparing their profile.', maxlength: 3000 },
  languages: { type: [String], default: [] }, specialties: { type: [String], default: [] },
  regionsCovered: { type: [String], default: [] },
  coveredDestinations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Destination' }],
  photoMedia: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null, select: false },
  rating: { type: Number, min: 0, max: 5, default: 0 }, reviewCount: { type: Number, min: 0, default: 0 },
  yearsExperience: { type: Number, min: 0, max: 80, default: 0 },
  location: { type: String, default: 'Ethiopia' },
  image: { type: String, default: '' },
  blockedDates: { type: [Date], default: [] },
  availabilityNotes: { type: String, default: '', maxlength: 1000 }
}, { timestamps: true });
schema.index({ languages: 1, status: 1 });
schema.index({ slug: 1 }, { unique: true });
schema.index({ code: 1 }, { unique: true });
schema.index({ slugHistory: 1 });
schema.pre('validate', function (next) {
  if (!this.slug) this.slug = normalizeSlug(this.location || 'guide');
  if (this.slug) this.slug = validateSlug(this.slug);
  next();
});
schema.set('toJSON', { transform(_doc, value) { delete value.mutationVersion; return value; } });
export default mongoose.model('Guide', schema);
