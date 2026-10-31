import mongoose from 'mongoose';
const guideSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status: { type: String, enum: ['pending', 'approved'], default: 'pending', index: true },
  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bio: { type: String, default: 'This guide is preparing their profile.', maxlength: 3000 },
  languages: { type: [String], default: [] },
  specialties: { type: [String], default: [] },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 },
  yearsExperience: { type: Number, min: 0, default: 0 },
  location: { type: String, default: 'Ethiopia' },
  image: { type: String, default: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23e9eee5"/%3E%3Ccircle cx="200" cy="110" r="42" fill="%23738078"/%3E%3Cpath d="M100 270a100 100 0 01200 0" fill="%23738078"/%3E%3C/svg%3E' }
}, { timestamps: true });
guideSchema.index({ languages: 1, status: 1 });
export default mongoose.model('Guide', guideSchema);
