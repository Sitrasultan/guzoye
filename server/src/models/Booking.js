import mongoose from 'mongoose';
export const BOOKING_STATUSES = ['pending', 'confirmed', 'declined', 'cancelled', 'completed'];
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tour: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
  departureId: { type: mongoose.Schema.Types.ObjectId, required: true },
  departureDate: { type: Date, required: true }, // Snapshot for booking history.
  guests: { type: Number, required: true, min: 1, max: 1000, validate: Number.isInteger },
  totalPrice: { type: Number, required: true, min: 0 }, // USD, calculated server-side.
  status: { type: String, enum: BOOKING_STATUSES, default: 'pending', required: true },
  // Internal index key: exactly pending/confirmed. Never accepted from a request.
  active: { type: Boolean, default: true, required: true, select: false }
}, { timestamps: true });
schema.index({ user: 1, tour: 1, departureId: 1 }, {
  unique: true, name: 'one_active_booking_per_departure', partialFilterExpression: { active: true }
});
schema.index({ tour: 1, status: 1, createdAt: -1 });
export default mongoose.model('Booking', schema);
