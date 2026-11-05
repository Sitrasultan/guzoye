import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tour: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true }
}, { timestamps: true });
schema.index({ user: 1, tour: 1 }, { unique: true });
export default mongoose.model('Wishlist', schema);
