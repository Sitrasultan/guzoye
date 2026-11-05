import mongoose from 'mongoose';
export const GUIDE_REQUEST_TYPES = ['tour_assignment', 'destination_assignment', 'time_off'];
export const GUIDE_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];
const schema = new mongoose.Schema({
  guide: { type: mongoose.Schema.Types.ObjectId, ref: 'Guide', required: true, index: true },
  type: { type: String, enum: GUIDE_REQUEST_TYPES, required: true },
  status: { type: String, enum: GUIDE_REQUEST_STATUSES, default: 'pending', index: true },
  tour: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', default: null },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', default: null },
  message: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  decisionNote: { type: String, default: '', maxlength: 1000 },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  decidedAt: Date,
  mutationVersion: { type: Number, default: 0, select: false }
}, { timestamps: true });
schema.index({ status: 1, createdAt: -1 });
schema.index({ guide: 1, status: 1 });
schema.set('toJSON', { transform(_doc, value) { delete value.mutationVersion; return value; } });
export default mongoose.model('GuideRequest', schema);
