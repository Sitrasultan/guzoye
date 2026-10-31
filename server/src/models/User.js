import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
const userSchema = new mongoose.Schema({
  name: { type:String, required:true, trim:true, minlength:2, maxlength:100 },
  email: { type:String, required:true, unique:true, lowercase:true, trim:true, match:/^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { type:String, required:true, minlength:12, select:false },
  role: { type:String, enum:['traveler','guide','admin'], default:'traveler' }
}, { timestamps:true, toJSON: { transform(_doc,ret) { delete ret.password; return ret; } } });
// Save hooks hash newly assigned plaintext passwords. insertMany bypasses save
// hooks, so seed users are intentionally created with User.create().
userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password,12);
});
export default mongoose.model('User',userSchema);
