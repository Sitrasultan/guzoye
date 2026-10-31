import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  tour:{type:mongoose.Schema.Types.ObjectId,ref:'Tour',required:true},
  rating:{type:Number,required:true,min:1,max:5,validate:Number.isInteger},
  comment:{type:String,required:true,trim:true,maxlength:2000}
},{timestamps:true});
schema.index({user:1,tour:1},{unique:true});
export default mongoose.model('Review',schema);
