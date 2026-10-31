import mongoose from 'mongoose';
const integer = { validator: Number.isInteger, message: 'Value must be an integer.' };
const departureSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  capacity: { type: Number, required: true, min: 1, max: 1000, validate: integer },
  spotsLeft: { type: Number, required: true, min: 0, max: 1000, validate: integer }
});
departureSchema.pre('validate', function (next) {
  if (this.spotsLeft > this.capacity) this.invalidate('spotsLeft', 'Spots left cannot exceed capacity.');
  next();
});
const daySchema = new mongoose.Schema({ day: { type: Number, required: true, min: 1, validate: integer }, title: { type: String, required: true }, description: { type: String, required: true } }, { _id: false });
const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  description: { type: String, required: true, maxlength: 10000 },
  price: { type: Number, required: true, min: 0, max: 1000000 },
  duration: { type: Number, required: true, min: 1, max: 365, validate: integer },
  difficulty: { type: String, enum: ['Easy', 'Moderate', 'Challenging'], required: true },
  capacity: { type: Number, required: true, min: 1, max: 1000, validate: integer },
  departures: { type: [departureSchema], default: [] },
  itinerary: { type: [daySchema], validate: [v => v.length > 0, 'An itinerary is required.'] },
  images: { type: [String], validate: [v => v.length > 0, 'At least one image is required.'] },
  guide: { type: mongoose.Schema.Types.ObjectId, ref: 'Guide', required: true },
  included: [String], excluded: [String], archived: { type: Boolean, default: false, index: true }, archivedAt: Date,
  mutationVersion: { type: Number, default: 0, select: false },
  rating: { type: Number, min: 0, max: 5, default: 0 }, reviewCount: { type: Number, min: 0, default: 0 }, featured: { type: Boolean, default: false }
}, { timestamps: true });
schema.index({ destination: 1, price: 1 }); schema.index({ guide: 1 });
schema.set('toJSON', { transform(_doc, value) { delete value.mutationVersion; return value; } });
export default mongoose.model('Tour', schema);
