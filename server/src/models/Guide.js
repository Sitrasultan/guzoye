import mongoose from 'mongoose';
const guideSchema = new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,unique:true},
  bio:{type:String,required:true,maxlength:3000},
  languages:{type:[String],validate:[v=>v.length>0,'At least one language is required']},
  specialties:[String],
  rating:{type:Number,min:0,max:5,default:0},
  reviewCount:{type:Number,min:0,default:0},
  yearsExperience:{type:Number,min:0,default:0},
  location:{type:String,required:true},
  image:{type:String,required:true}
},{timestamps:true});
guideSchema.index({languages:1});
export default mongoose.model('Guide',guideSchema);
