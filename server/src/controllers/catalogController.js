import Tour from '../models/Tour.js';
import Guide from '../models/Guide.js';
import Destination from '../models/Destination.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { ApiError } from '../middleware/errors.js';
import { pagination, integer, enumValue, escapeRegex, validateOptionalId } from '../middleware/validate.js';
const guidePopulation={path:'guide',populate:{path:'user',select:'name role'}};
function sendList(res,data,total,page,limit){return res.json({data,pagination:{total,page,limit,pages:Math.ceil(total/limit)}});}
export async function listTours(req,res){
  const q=req.query,{page,limit}=pagination(q),filter={};
  if(q.region){const destinations=await Destination.find({region:q.region}).select('_id').lean();filter.destination={$in:destinations.map(d=>d._id)};}
  if(q.search){const regex=new RegExp(escapeRegex(q.search),'i');const destinations=await Destination.find({name:regex}).select('_id').lean();filter.$or=[{title:regex},{description:regex},{destination:{$in:destinations.map(d=>d._id)}}];}
  if(q.maxPrice){const price=Number(q.maxPrice);if(!Number.isFinite(price)||price<0||price>1000000)throw new ApiError(400,'maxPrice must be between 0 and 1000000.');filter.price={$lte:price};}
  if(q.duration)filter.duration={$lte:integer(q.duration,'duration',{max:365})};
  if(q.difficulty)filter.difficulty=enumValue(q.difficulty,['Easy','Moderate','Challenging'],'difficulty');
  if(q.guide)filter.guide=validateOptionalId(q.guide);
  if(q.featured)filter.featured=enumValue(q.featured,['true','false'],'featured')==='true';
  const sort=enumValue(q.sort,['rating','price-asc','price-desc'],'sort')||'rating';
  const order=sort==='price-asc'?{price:1,_id:1}:sort==='price-desc'?{price:-1,_id:1}:{rating:-1,_id:1};
  const [data,total]=await Promise.all([Tour.find(filter).sort(order).skip((page-1)*limit).limit(limit).populate('destination').populate(guidePopulation).lean(),Tour.countDocuments(filter)]);
  sendList(res,data,total,page,limit);
}
export async function getTour(req,res){const data=await Tour.findById(req.params.id).populate('destination').populate(guidePopulation).lean();if(!data)throw new ApiError(404,'Tour not found.');res.json({data});}
export async function listDestinations(req,res){const {page,limit}=pagination(req.query);const filter=req.query.search?{name:new RegExp(escapeRegex(req.query.search),'i')}:{};const [data,total]=await Promise.all([Destination.find(filter).sort({_id:1}).skip((page-1)*limit).limit(limit).lean(),Destination.countDocuments(filter)]);sendList(res,data,total,page,limit);}
export async function getDestination(req,res){const data=await Destination.findById(req.params.id).lean();if(!data)throw new ApiError(404,'Destination not found.');res.json({data});}
export async function listGuides(req,res){const {page,limit}=pagination(req.query);const filter={};if(req.query.language)filter.languages=req.query.language;if(req.query.search){const users=await User.find({name:new RegExp(escapeRegex(req.query.search),'i')}).select('_id').lean();filter.user={$in:users.map(u=>u._id)};}const [data,total]=await Promise.all([Guide.find(filter).sort({rating:-1,_id:1}).skip((page-1)*limit).limit(limit).populate('user','name role').lean(),Guide.countDocuments(filter)]);sendList(res,data,total,page,limit);}
export async function getGuide(req,res){const data=await Guide.findById(req.params.id).populate('user','name role').lean();if(!data)throw new ApiError(404,'Guide not found.');res.json({data});}
export async function listReviews(req,res){
  if(!await Tour.exists({_id:req.params.id}))throw new ApiError(404,'Tour not found.');
  const {page,limit}=pagination(req.query);const filter={tour:req.params.id};
  const [data,total]=await Promise.all([Review.find(filter).sort({createdAt:-1,_id:1}).skip((page-1)*limit).limit(limit).populate('user','name').lean(),Review.countDocuments(filter)]);
  sendList(res,data,total,page,limit);
}
