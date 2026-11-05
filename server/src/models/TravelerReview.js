import mongoose from 'mongoose';
const guideSubRatings = new mongoose.Schema({
  knowledge: { type: Number, min: 1, max: 5, validate: Number.isInteger },
  communication: { type: Number, min: 1, max: 5, validate: Number.isInteger },
  punctuality: { type: Number, min: 1, max: 5, validate: Number.isInteger },
  friendliness: { type: Number, min: 1, max: 5, validate: Number.isInteger }
}, { _id: false });
const schema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tour: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
  guide: { type: mongoose.Schema.Types.ObjectId, ref: 'Guide', required: true, index: true },
  tourRating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  tourComment: { type: String, default: '', trim: true, maxlength: 2000 },
  guideRating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  guideComment: { type: String, default: '', trim: true, maxlength: 2000 },
  guideSubRatings: guideSubRatings,
  guideReply: { type: String, default: '', trim: true, maxlength: 1000 },
  hidden: { type: Boolean, default: false },
  hiddenReason: { type: String, default: '', maxlength: 1000 }
}, { timestamps: true });
schema.index({ user: 1, booking: 1 }, { unique: true });
export default mongoose.model('TravelerReview', schema);
