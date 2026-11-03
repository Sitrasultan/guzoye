import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['avatar', 'tour'], required: true },
  provider: { type: String, enum: ['local', 'cloudinary'], required: true },
  key: { type: String, required: true }, url: { type: String, required: true, unique: true },
  tour: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', default: null },
  state: { type: String, enum: ['ready', 'deleting'], default: 'ready', index: true }
}, { timestamps: true });
export default mongoose.model('Media', schema);
