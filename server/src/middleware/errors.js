export class ApiError extends Error { constructor(status,message) { super(message); this.status=status; } }
export const asyncHandler = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
export function notFound(req,res,next){ next(new ApiError(404,'This endpoint does not exist.')); }
export function errorHandler(error,req,res,next){
  if(res.headersSent) return next(error);
  let status=error.status || 500;
  let message=error.message;
  if(error.name==='CastError'){status=400;message='Invalid resource identifier.';}
  if(error.name==='ValidationError'){status=400;message=Object.values(error.errors).map(e=>e.message).join(' ');}
  if(error.code===11000){status=409;message='A record with these unique fields already exists.';}
  if(status>=500){console.error(error);message='Something went wrong on our side. Please try again.';}
  res.status(status).json({message});
}
