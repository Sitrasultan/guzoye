import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
export const uploadDirectory = fileURLToPath(new URL('../../uploads/', import.meta.url));
export function storageMode() {
  const mode = process.env.MEDIA_STORAGE || 'local';
  if (!['local', 'cloudinary'].includes(mode)) throw new Error('MEDIA_STORAGE must be local or cloudinary.');
  return mode;
}
export function validateMediaEnvironment() {
  if (storageMode() === 'cloudinary' && ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].some(key => !process.env[key])) throw new Error('Cloudinary mode requires all three CLOUDINARY_* credentials.');
}
async function cloud() {
  const { v2 } = await import('cloudinary');
  const { CLOUDINARY_CLOUD_NAME: cloud_name, CLOUDINARY_API_KEY: api_key, CLOUDINARY_API_SECRET: api_secret } = process.env;
  if (!cloud_name || !api_key || !api_secret) throw new Error('Cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.');
  v2.config({ cloud_name, api_key, api_secret, secure: true }); return v2;
}
export async function storeImage(buffer) {
  const id = randomUUID(), provider = storageMode();
  if (provider === 'local') {
    await mkdir(uploadDirectory, { recursive: true });
    const key = `${id}.webp`;
    await writeFile(path.join(uploadDirectory, key), buffer, { flag: 'wx', mode: 0o600 });
    return { provider, key, url: `/uploads/${key}` };
  }
  const client = await cloud();
  const result = await new Promise((resolve, reject) => {
    client.uploader.upload_stream({ resource_type: 'image', public_id: `wondu/${id}`, overwrite: false, format: 'webp' }, (error, value) => error ? reject(error) : resolve(value)).end(buffer);
  });
  return { provider, key: result.public_id, url: result.secure_url };
}
export async function deleteStored(media) {
  if (media.provider === 'local') {
    if (!/^[0-9a-f-]{36}\.webp$/.test(media.key)) throw new Error('Refusing invalid stored media key.');
    try { await unlink(path.join(uploadDirectory, media.key)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    return;
  }
  const result = await (await cloud()).uploader.destroy(media.key, { resource_type: 'image', invalidate: true });
  if (!['ok', 'not found'].includes(result.result)) throw new Error('Cloudinary deletion was not acknowledged.');
}
