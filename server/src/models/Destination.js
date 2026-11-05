import mongoose from 'mongoose';
import { normalizeSlug, validateSlug } from '../services/identifiers.js';
const schema = new mongoose.Schema({
  name:{type:String,required:true,trim:true,unique:true},
  slug:{type:String,required:true,unique:true,trim:true,lowercase:true,minlength:2,maxlength:80,validate:{validator:value=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),message:'Invalid destination slug.'}},
  slugHistory:{type:[String],default:[]},
  code:{type:String,required:true,unique:true,uppercase:true,match:/^DEST-\d{4}$/},
  region:{type:String,required:true,trim:true},
  description:{type:String,required:true},
  image:{type:String,required:true}
},{timestamps:true});
// schema.index({ slug: 1 }, { unique: true });
// schema.index({ code: 1 }, { unique: true });
// schema.index({ slugHistory: 1 });
schema.pre('validate', function (next) {
  if (!this.slug && this.name) this.slug = normalizeSlug(this.name);
  if (this.slug) this.slug = validateSlug(this.slug);
  if (this.isModified('name') && this.slug && !this.slugHistory.includes(this.slug)) this.slugHistory.push(this.slug);
  next();
});
export default mongoose.model('Destination',schema);
