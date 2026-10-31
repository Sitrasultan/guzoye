import mongoose from 'mongoose';
const daySchema = new mongoose.Schema({
  day:{type:Number,required:true,min:1,validate:Number.isInteger},
  title:{type:String,required:true},
  description:{type:String,required:true}
},{_id:false});
const schema = new mongoose.Schema({
  title:{type:String,required:true,trim:true,maxlength:180},
  destination:{type:mongoose.Schema.Types.ObjectId,ref:'Destination',required:true},
  description:{type:String,required:true},
  price:{type:Number,required:true,min:0},
  duration:{type:Number,required:true,min:1,validate:Number.isInteger},
  difficulty:{type:String,enum:['Easy','Moderate','Challenging'],required:true},
  capacity:{type:Number,required:true,min:1,validate:Number.isInteger},
  itinerary:{type:[daySchema],validate:[v=>v.length>0,'An itinerary is required']},
  images:{type:[String],validate:[v=>v.length>0,'At least one image is required']},
  guide:{type:mongoose.Schema.Types.ObjectId,ref:'Guide',required:true},
  included:[String],excluded:[String],
  rating:{type:Number,min:0,max:5,default:0},
  reviewCount:{type:Number,min:0,default:0},
  featured:{type:Boolean,default:false}
},{timestamps:true});
schema.index({destination:1,price:1});
schema.index({guide:1});
export default mongoose.model('Tour',schema);
