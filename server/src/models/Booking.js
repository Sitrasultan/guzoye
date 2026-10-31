import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  tour:{type:mongoose.Schema.Types.ObjectId,ref:'Tour',required:true,index:true},
  date:{type:Date,required:true},
  guests:{type:Number,required:true,min:1,validate:Number.isInteger},
  status:{type:String,enum:['pending','confirmed','cancelled'],default:'pending'}
},{timestamps:true});
// Capacity checks, availability, authorization and transactions belong to the
// future booking service. No booking endpoints are exposed in this phase.
export default mongoose.model('Booking',schema);
