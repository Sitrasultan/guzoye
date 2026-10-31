import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
const { default: app } = await import('../src/app.js');
const { default: User } = await import('../src/models/User.js');
const { default: Guide } = await import('../src/models/Guide.js');
const { env } = await import('../src/config/env.js');
const testUri = process.env.TEST_MONGODB_URI;
const origin = env.clientOrigin;
async function write(agent, method, path, body = {}) {
  const token = await agent.get('/api/auth/csrf');
  assert.equal(token.status, 200);
  return agent[method](path).set('Origin', origin).set('X-CSRF-Token', token.body.data.csrfToken).send(body);
}
const credentials = { name: 'Test Traveler', email: 'traveler@example.com', password: 'TravelerPass123', role: 'traveler' };
test('Phase 3 authentication and role integration', { skip: !testUri }, async t => {
  const target = new URL(testUri);
  const base = decodeURIComponent(target.pathname.slice(1));
  if (!/wondu/i.test(base) || !/test/i.test(base)) throw new Error('TEST_MONGODB_URI database name must contain both wondu and test.');
  // Only the unique database created by THIS test process is dropped.
  target.pathname = `/${base}_phase3_${process.pid}_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(target.toString());
  try {
    await User.init(); await Guide.init();
    const traveler = request.agent(app);
    await t.test('register sets an httpOnly cookie and hashes password', async () => {
      const response = await write(traveler, 'post', '/api/auth/register', credentials);
      assert.equal(response.status, 201);
      assert.equal(response.body.data.user.role, 'traveler');
      assert.equal(response.body.token, undefined);
      assert.equal(response.body.data.user.password, undefined);
      assert.ok(response.headers['set-cookie'].some(cookie => cookie.startsWith('wondu_session=') && cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax')));
      const user = await User.findOne({ email: credentials.email }).select('+password');
      assert.notEqual(user.password, credentials.password);
      assert.match(user.password, /^\$2[aby]\$/);
    });
    await t.test('duplicate normalized email returns 409', async () => {
      const response = await write(request.agent(app), 'post', '/api/auth/register', { ...credentials, email: 'TRAVELER@example.com' });
      assert.equal(response.status, 409);
    });
    await t.test('public admin registration returns 400', async () => {
      const response = await write(request.agent(app), 'post', '/api/auth/register', { ...credentials, email: 'fake-admin@example.com', role: 'admin' });
      assert.equal(response.status, 400); assert.ok(response.body.errors.role);
    });
    await t.test('login succeeds and me restores the session', async () => {
      const agent = request.agent(app);
      const response = await write(agent, 'post', '/api/auth/login', credentials);
      assert.equal(response.status, 200);
      const me = await agent.get('/api/auth/me');
      assert.equal(me.status, 200); assert.equal(me.body.data.user.email, credentials.email);
    });
    await t.test('wrong password and missing account use generic 401', async () => {
      for (const email of [credentials.email, 'absent@example.com']) {
        const response = await write(request.agent(app), 'post', '/api/auth/login', { email, password: 'WrongPassword123' });
        assert.equal(response.status, 401); assert.equal(response.body.message, 'Invalid email or password.');
      }
    });
    await t.test('protected access without login returns 401', async () => {
      assert.equal((await request(app).get('/api/auth/me')).status, 401);
    });
    await t.test('traveler attempting admin GET and PATCH receives 403', async () => {
      assert.equal((await traveler.get('/api/admin/guides')).status, 403);
      const response = await write(traveler, 'patch', '/api/admin/guides/000000000000000000000065/approve');
      assert.equal(response.status, 403);
    });
    const guideAgent = request.agent(app);
    let guideId;
    await t.test('guide registration is pending and hidden publicly', async () => {
      const response = await write(guideAgent, 'post', '/api/auth/register', { name: 'Test Guide', email: 'guide@example.com', password: 'GuidePassword123', role: 'guide' });
      assert.equal(response.status, 201);
      guideId = response.body.data.user.guide._id;
      assert.equal(response.body.data.user.guide.status, 'pending');
      assert.equal((await guideAgent.get('/api/dashboard/guide/workspace')).status, 403);
      assert.equal((await request(app).get(`/api/guides/${guideId}`)).status, 404);
    });
    await t.test('admin approves guide and backend immediately grants workspace access', async () => {
      // Test-only fixture: production HTTP has no admin creation endpoint.
      await User.create({ name: 'Admin', email: 'admin@example.com', password: 'AdminPassword123', role: 'admin' });
      const admin = request.agent(app);
      assert.equal((await write(admin, 'post', '/api/auth/login', { email: 'admin@example.com', password: 'AdminPassword123' })).status, 200);
      const queue = await admin.get('/api/admin/guides');
      assert.equal(queue.body.pagination.total, 1);
      const approved = await write(admin, 'patch', `/api/admin/guides/${guideId}/approve`);
      assert.equal(approved.status, 200); assert.equal(approved.body.data.status, 'approved');
      assert.equal((await guideAgent.get('/api/dashboard/guide/workspace')).status, 200);
      assert.equal((await request(app).get(`/api/guides/${guideId}`)).status, 200);
    });
    await t.test('logout clears cookie and revokes a copied JWT', async () => {
      // Capture the current cookie via a fresh login response, without relying on jar internals.
      const login = await write(traveler, 'post', '/api/auth/login', credentials);
      const copied = login.headers['set-cookie'].find(cookie => cookie.startsWith('wondu_session=')).split(';')[0];
      const response = await write(traveler, 'post', '/api/auth/logout');
      assert.equal(response.status, 200);
      assert.equal((await traveler.get('/api/auth/me')).status, 401);
      assert.equal((await request(app).get('/api/auth/me').set('Cookie', copied)).status, 401);
    });
    await t.test('CSRF and foreign origins cannot register accounts', async () => {
      assert.equal((await request(app).post('/api/auth/register').set('Origin', origin).send(credentials)).status, 403);
      const agent = request.agent(app);
      const token = (await agent.get('/api/auth/csrf')).body.data.csrfToken;
      const response = await agent.post('/api/auth/register').set('Origin', 'https://attacker.example').set('X-CSRF-Token', token).send(credentials);
      assert.equal(response.status, 403);
    });
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
