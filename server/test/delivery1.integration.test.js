import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import sharp from 'sharp';
process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = randomBytes(48).toString('hex');
// Tests force LOCAL storage; never create/delete real Cloudinary assets.
process.env.MEDIA_STORAGE = 'local';
const { default: app } = await import('../src/app.js');
const { env } = await import('../src/config/env.js');
const { default: User } = await import('../src/models/User.js');
const { default: Guide } = await import('../src/models/Guide.js');
const { default: Tour } = await import('../src/models/Tour.js');
const { default: Destination } = await import('../src/models/Destination.js');
const { default: Media } = await import('../src/models/Media.js');
const { prepareImage } = await import('../src/services/imageValidation.js');
const { deleteStored } = await import('../src/services/mediaStorage.js');
async function csrf(agent) { return (await agent.get('/api/auth/csrf')).body.data.csrfToken; }
async function write(agent, method, url, body = {}) { return agent[method](url).set('Origin', env.clientOrigin).set('X-CSRF-Token', await csrf(agent)).send(body); }
async function upload(agent, url, bytes, filename = 'photo.png') { return agent.post(url).set('Origin', env.clientOrigin).set('X-CSRF-Token', await csrf(agent)).attach('photo', bytes, { filename, contentType: 'image/png' }); }
const uri = process.env.TEST_MONGODB_URI;
test('real image decoder rejects malformed headers and outputs a square stripped avatar', async () => {
  await assert.rejects(prepareImage(Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]), 'avatar'), error => error.status === 400);
  const input = await sharp({ create: { width: 600, height: 300, channels: 3, background: '#143f35' } }).png().toBuffer();
  const result = await prepareImage(input, 'avatar'), metadata = await sharp(result).metadata();
  assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, 400); assert.equal(metadata.height, 400); assert.equal(metadata.exif, undefined);
});
test('Delivery 1 upload and place discovery integration', { skip: !uri }, async t => {
  const target = new URL(uri), base = decodeURIComponent(target.pathname.slice(1));
  if (!/guzoye/i.test(base) || !/test/i.test(base)) throw new Error('Test DB name must contain guzoye and test.');
  target.pathname = `/${base}_media_${process.pid}_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(target.toString());
  const toCleanup = [];
  try {
    await Promise.all([User.init(), Guide.init(), Tour.init(), Destination.init(), Media.init()]);
    async function account(name, role, status = 'approved') {
      const user = await User.create({ name, email: `${name}@example.com`, role, password: 'DeliveryTest123' });
      const guide = role === 'guide' ? await Guide.create({ user: user._id, status, image: '' }) : null;
      const agent = request.agent(app);
      assert.equal((await write(agent, 'post', '/api/auth/login', { email: user.email, password: 'DeliveryTest123' })).status, 200);
      return { user, guide, agent };
    }
    const owner = await account('Alice', 'guide'), other = await account('Betty', 'guide'), pending = await account('Pending', 'guide', 'pending'), traveler = await account('Traveler', 'traveler');
    const one = await Destination.create({ name: 'Lalibela Test', region: 'Amhara', description: 'Test', image: 'https://example.com/a.jpg' });
    const two = await Destination.create({ name: 'Harar Test', region: 'Harari', description: 'Test', image: 'https://example.com/b.jpg' });
    const bytes = await sharp({ create: { width: 500, height: 300, channels: 3, background: '#143f35' } }).png().toBuffer();
    await t.test('real photo upload, safe filename, decoder and static serving', async () => {
      const result = await upload(owner.agent, '/api/guide/profile/photo', bytes, '../../pretend.exe');
      assert.equal(result.status, 201); assert.match(result.body.data.url, /^\/uploads\/[0-9a-f-]{36}\.webp$/);
      const media = await Media.findById(result.body.data._id).lean(); toCleanup.push(media);
      const image = await request(app).get(media.url); assert.equal(image.status, 200); assert.match(image.headers['content-type'], /image\/webp/); assert.equal(image.headers['x-content-type-options'], 'nosniff');
      const profile = await owner.agent.get('/api/auth/me'); assert.equal(profile.body.data.user.image, media.url);
    });
    await t.test('wrong content, fake extension and too-large files are rejected', async () => {
      assert.equal((await upload(owner.agent, '/api/guide/profile/photo', Buffer.from('this is not really a JPEG file'), 'fake.jpg')).status, 400);
      assert.equal((await upload(owner.agent, '/api/guide/profile/photo', Buffer.alloc(2 * 1024 * 1024 + 1))).status, 413);
    });
    await t.test('pending guides may change own photo; travelers and missing CSRF denied', async () => {
      const result = await upload(pending.agent, '/api/guide/profile/photo', bytes); assert.equal(result.status, 201); toCleanup.push(await Media.findById(result.body.data._id).lean());
      assert.equal((await upload(traveler.agent, '/api/guide/profile/photo', bytes)).status, 403);
      assert.equal((await owner.agent.post('/api/guide/profile/photo').set('Origin', env.clientOrigin).attach('photo', bytes, 'x.png')).status, 403);
    });
    await t.test('replacement and removal delete old local files', async () => {
      const old = (await owner.agent.get('/api/guide/profile')).body.data.image;
      const result = await upload(owner.agent, '/api/guide/profile/photo', bytes); assert.equal(result.status, 201); toCleanup.push(await Media.findById(result.body.data._id).lean());
      assert.equal((await request(app).get(old)).status, 404);
      assert.equal((await write(owner.agent, 'delete', '/api/guide/profile/photo')).status, 200);
      assert.equal((await owner.agent.get('/api/guide/profile')).body.data.image, '');
    });
    let draft;
    await t.test('draft uploads enforce ownership before deletion', async () => {
      const result = await upload(owner.agent, '/api/guide/media', bytes); assert.equal(result.status, 201); draft = result.body.data;
      toCleanup.push(await Media.findById(draft._id).lean());
      assert.equal((await write(other.agent, 'delete', `/api/guide/media/${draft._id}`)).status, 403);
    });
    const body = { title: 'A locally guided test tour', destination: String(two._id), description: 'A thoughtful test journey with local knowledge and stories.', price: 40, duration: 1, difficulty: 'Easy', capacity: 8, itinerary: [{ title: 'Discover', description: 'Explore together with your guide.' }], images: [draft?.url], included: ['Guide'], excluded: [], departures: [{ date: new Date(Date.now() + 86400000 * 10).toISOString(), capacity: 8 }] };
    await t.test('attaching foreign media is denied; own image attaches and cannot be deleted as a draft', async () => {
      assert.equal((await write(other.agent, 'post', '/api/guide/tours', body)).status, 403);
      const result = await write(owner.agent, 'post', '/api/guide/tours', body); assert.equal(result.status, 201);
      assert.equal((await write(owner.agent, 'delete', `/api/guide/media/${draft._id}`)).status, 409);
    });
    await Guide.updateOne({ _id: owner.guide._id }, { $set: { coveredDestinations: [one._id], languages: ['English'], rating: 4.8, yearsExperience: 10 } });
    await Guide.updateOne({ _id: other.guide._id }, { $set: { coveredDestinations: [one._id], languages: ['French'], rating: 4.1, yearsExperience: 4 } });
    await t.test('destination matches declared places OR published owned tours, without duplicates', async () => {
      const declared = await request(app).get(`/api/guides?destination=${one._id}`); assert.equal(declared.status, 200); assert.equal(declared.body.pagination.total, 2);
      const owned = await request(app).get(`/api/guides?destination=${two._id}`); assert.equal(owned.body.pagination.total, 1); assert.equal(owned.body.data[0]._id, String(owner.guide._id));
      assert.equal(owned.body.data[0].coveredPlaces.length, 2);
    });
    await t.test('language, rating, name and pagination combine; pending guides stay hidden', async () => {
      const result = await request(app).get(`/api/guides?destination=${one._id}&language=English&minRating=4.5&q=Alice&sort=experience&limit=1`);
      assert.equal(result.body.pagination.total, 1); assert.equal(result.body.data[0].user.name, 'Alice');
      const all = await request(app).get('/api/guides?sort=name'); assert.deepEqual(all.body.data.map(guide => guide.user.name), ['Alice', 'Betty']);
    });
  } finally {
    for (const media of toCleanup) if (media) await deleteStored(media).catch(() => {});
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  }
});
