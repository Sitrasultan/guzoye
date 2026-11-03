import multer from 'multer';
import { MAX_IMAGE_BYTES } from '../services/imageValidation.js';
import { ApiError } from './errors.js';
const parser = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0, parts: 2 } }).single('photo');
export function allowMultipartCsrf(req, _res, next) { req.allowMultipartCsrf = true; next(); }
export function imageUpload(req, res, next) {
  parser(req, res, error => {
    if (error) return next(new ApiError(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400, error.code === 'LIMIT_FILE_SIZE' ? 'Image exceeds the 2 MB limit.' : 'Send exactly one image in the photo field, with no other multipart fields.'));
    if (!req.file) return next(new ApiError(400, 'Choose a JPEG, PNG or WebP image.'));
    next();
  });
}

let active = 0;
export function uploadSlot(req, res, next) {
  if (active >= 4) return next(new ApiError(429, 'Image processing is busy. Please try again shortly.'));
  active += 1; let released = false;
  const release = () => { if (!released) { released = true; active -= 1; } };
  res.once('finish', release); res.once('close', release); next();
}
