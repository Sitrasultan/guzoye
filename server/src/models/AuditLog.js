import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['approve', 'reject', 'reassign', 'archive', 'deactivate'], required: true },
  targetType: { type: String, enum: ['Guide', 'Tour', 'User'], required: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });
schema.index({ createdAt: -1 });
export default mongoose.model('AuditLog', schema);
