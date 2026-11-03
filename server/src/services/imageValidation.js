export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export function detectImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) throw Object.assign(new Error('Upload a valid JPEG, PNG or WebP image.'), { status: 400 });
  if (buffer.length > MAX_IMAGE_BYTES) throw Object.assign(new Error('Each image must be no larger than 2 MB.'), { status: 413 });
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  throw Object.assign(new Error('File contents must be JPEG, PNG or WebP; renaming a file does not convert it.'), { status: 400 });
}
export async function prepareImage(buffer, kind) {
  const expected = detectImage(buffer);
  const { default: sharp } = await import('sharp');
  try {
    const image = sharp(buffer, { limitInputPixels: 20000000, failOn: 'warning', animated: false });
    const metadata = await image.metadata();
    if (metadata.format !== expected || (metadata.pages || 1) > 1) throw new Error('Unsupported or animated image.');
    return await image.rotate().resize(kind === 'avatar' ? { width: 400, height: 400, fit: 'cover' } : { width: 1600, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  } catch { throw Object.assign(new Error('The image could not be decoded safely. Use a non-animated JPEG, PNG or WebP under 20 megapixels.'), { status: 400 }); }
}
