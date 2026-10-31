import { ApiError } from './errors.js';
const idPattern=/^[a-f0-9]{24}$/i;
export function validateId(req,res,next){ if(!idPattern.test(req.params.id)) return next(new ApiError(400,'Invalid resource identifier.')); next(); }
export function validateOptionalId(value){if(value && !idPattern.test(value))throw new ApiError(400,'Invalid guide identifier.');return value;}
export function validateQuery(req,res,next){
  // Never pass an untrusted query object directly into MongoDB.
  for(const [key,value] of Object.entries(req.query)){
    if(typeof value!=='string' || value.length>200 || key.startsWith('$')) return next(new ApiError(400,'Query parameters must be short, plain strings.'));
  }
  next();
}
export function integer(value,name,{min=1,max=10000,defaultValue}={}){
  if(value===undefined || value==='') return defaultValue;
  const n=Number(value);
  if(!Number.isSafeInteger(n) || n<min || n>max)throw new ApiError(400,`${name} must be an integer between ${min} and ${max}.`);
  return n;
}
export function pagination(query){return {page:integer(query.page,'page',{max:10000,defaultValue:1}),limit:integer(query.limit,'limit',{max:50,defaultValue:8})};}
export function enumValue(value,allowed,name){if(value&&!allowed.includes(value))throw new ApiError(400,`Invalid ${name}.`);return value;}
export function escapeRegex(value=''){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
