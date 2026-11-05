import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true, maxlength: 80 },
  targetType: { type: String, required: true, enum: ['Guide', 'Tour', 'User', 'GuideRequest', 'Review', 'Destination', 'Media'] },
  target: { type: mongoose.Schema.Types.ObjectId, required: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });
schema.index({ createdAt: -1 });
schema.index({ action: 1, createdAt: -1 });
export default mongoose.model('AuditLog', schema);
