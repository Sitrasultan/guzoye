export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export function notFound(_req, _res, next) { next(new ApiError(404, 'This endpoint does not exist.')); }
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  let errors = error.errors;
  if (error.type === 'entity.parse.failed') { status = 400; message = 'Request body must be valid JSON.'; errors = undefined; }
  if (error.name === 'CastError') { status = 400; message = 'Invalid resource identifier.'; errors = undefined; }
  if (error.name === 'ValidationError') {
    status = 400; message = 'Please check the submitted fields.';
    errors = Object.fromEntries(Object.entries(error.errors).map(([key, value]) => [key, value.message]));
  }
  if (error.code === 11000) {
    status = 409; message = 'An account with this email already exists.';
    errors = { email: 'This email address is already registered.' };
  }
  if (status >= 500) { console.error(error); message = 'Something went wrong on our side. Please try again.'; errors = undefined; }
  res.status(status).json({ message, ...(errors && { errors }) });
}
