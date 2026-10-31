import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, maxlength: 254 },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['traveler', 'guide', 'admin'], default: 'traveler' },
  isActive: { type: Boolean, default: true },
  tokenVersion: { type: Number, default: 0, select: false },
  mutationVersion: { type: Number, default: 0, select: false }
}, { timestamps: true, toJSON: { transform(_doc, value) { delete value.password; delete value.tokenVersion; delete value.mutationVersion; return value; } } });
schema.pre('save', async function () {
  if (!this.isModified('password')) return;
  if (Buffer.byteLength(this.password, 'utf8') > 72) throw new Error('Password must be at most 72 UTF-8 bytes.');
  this.password = await bcrypt.hash(this.password, 12);
});
export default mongoose.model('User', schema);
