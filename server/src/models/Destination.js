import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name:{type:String,required:true,trim:true,unique:true},
  region:{type:String,required:true,trim:true},
  description:{type:String,required:true},
  image:{type:String,required:true}
},{timestamps:true});
export default mongoose.model('Destination',schema);
