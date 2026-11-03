import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = randomBytes(48).toString('hex');
const { default: app } = await import('../src/app.js');
const { env } = await import('../src/config/env.js');
const { default: User } = await import('../src/models/User.js');
const { default: Guide } = await import('../src/models/Guide.js');
const { default: Tour } = await import('../src/models/Tour.js');
const { default: Destination } = await import('../src/models/Destination.js');
const { default: Booking } = await import('../src/models/Booking.js');
const { default: AuditLog } = await import('../src/models/AuditLog.js');
async function write(agent, method, path, body = {}) {
  const token = (await agent.get('/api/auth/csrf')).body.data.csrfToken;
  return agent[method](path).set('Origin', env.clientOrigin).set('X-CSRF-Token', token).send(body);
}
const uri = process.env.TEST_MONGODB_URI;
test('guide studio and admin management integration', { skip: !uri }, async t => {
  const target = new URL(uri), base = decodeURIComponent(target.pathname.slice(1));
  if (!/wondu/i.test(base) || !/test/i.test(base)) throw new Error('Test DB name must contain wondu and test.');
  target.pathname = `/${base}_management_${process.pid}_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(target.toString());
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 }); assert.ok(hello.setName || hello.msg === 'isdbgrid');
    await Promise.all([User.init(), Guide.init(), Tour.init(), Destination.init(), Booking.init(), AuditLog.init()]);
    async function account(name, role, status = 'approved') {
      const user = await User.create({ name, email: `${name}@example.com`, password: 'ManagementPass123', role });
      const guide = role === 'guide' ? await Guide.create({ user: user._id, status }) : null;
      const agent = request.agent(app);
      assert.equal((await write(agent, 'post', '/api/auth/login', { email: user.email, password: 'ManagementPass123' })).status, 200);
      return { user, guide, agent };
    }
    const owner = await account('owner', 'guide'), other = await account('other', 'guide'), pending = await account('pending', 'guide', 'pending'), traveler = await account('traveler', 'traveler'), admin = await account('admin', 'admin');
    const destination = await Destination.create({ name: 'Management Test', region: 'Amhara', description: 'Test only', image: 'https://example.com/image.jpg' });
    const body = { title: 'My locally led city tour', destination: String(destination._id), description: 'Explore the city with a thoughtful, locally led itinerary.', price: 40, duration: 1, difficulty: 'Easy', capacity: 8, itinerary: [{ title: 'City walk', description: 'Meet our guide and explore the city.' }], images: ['https://example.com/image.jpg'], included: ['Local guide'], excluded: ['Flights'], departures: [{ date: new Date(Date.now() + 86400000 * 10).toISOString(), capacity: 8 }] };
    let tourId, departureId, bookingId;
    await t.test('profile save and field validation', async () => {
      const result = await write(pending.agent, 'patch', '/api/guide/profile', { bio: 'I love sharing the history and culture of my home.', languages: ['English'], regionsCovered: ['Amhara'] });
      assert.equal(result.status, 200); assert.equal(result.body.data.regionsCovered[0], 'Amhara');
      assert.equal((await write(owner.agent, 'patch', '/api/guide/profile', { image: 'http://localhost/private' })).status, 400);
    });
    await t.test('approved guide creates and edits their own tour', async () => {
      const result = await write(owner.agent, 'post', '/api/guide/tours', body);
      assert.equal(result.status, 201); tourId = result.body.data._id; departureId = result.body.data.departures[0]._id;
      assert.equal(result.body.data.guide, String(owner.guide._id));
      assert.equal((await write(owner.agent, 'patch', `/api/guide/tours/${tourId}`, { title: 'My updated city journey' })).status, 200);
      assert.equal((await owner.agent.get('/api/guide/tours')).body.pagination.total, 1);
    });
    await t.test('other guide cannot edit and pending guide cannot create', async () => {
      assert.equal((await write(other.agent, 'patch', `/api/guide/tours/${tourId}`, { title: 'Foreign edit denied' })).status, 403);
      assert.equal((await write(pending.agent, 'post', '/api/guide/tours', body)).status, 403);
    });
    await t.test('departure with active bookings cannot be removed; details locked', async () => {
      const result = await write(traveler.agent, 'post', '/api/bookings', { tour: tourId, departureId, guests: 2 });
      assert.equal(result.status, 201); bookingId = result.body.data._id;
      assert.equal((await write(owner.agent, 'delete', `/api/guide/tours/${tourId}/departures/${departureId}`)).status, 409);
      assert.equal((await write(owner.agent, 'patch', `/api/guide/tours/${tourId}`, { price: 99 })).status, 409);
    });
    await t.test('traveler cannot access guide/admin management endpoints', async () => {
      for (const path of ['/api/guide/profile', '/api/guide/tours', '/api/admin/stats', '/api/admin/users', '/api/admin/audit']) assert.equal((await traveler.agent.get(path)).status, 403);
      assert.equal((await write(traveler.agent, 'post', '/api/guide/tours', body)).status, 403);
      assert.equal((await write(traveler.agent, 'patch', `/api/admin/tours/${tourId}/archive`)).status, 403);
    });
    await t.test('admin reassign transfers existing booking authority and audits action', async () => {
      assert.equal((await write(admin.agent, 'patch', `/api/admin/tours/${tourId}/guide`, { guideId: String(other.guide._id) })).status, 200);
      assert.equal((await write(owner.agent, 'patch', `/api/bookings/${bookingId}/status`, { status: 'confirmed' })).status, 403);
      assert.equal((await write(other.agent, 'patch', `/api/bookings/${bookingId}/status`, { status: 'confirmed' })).status, 200);
      assert.equal(await AuditLog.countDocuments({ action: 'reassign' }), 1);
    });
    await t.test('archive blocks new reservations but keeps existing booking management', async () => {
      assert.equal((await write(admin.agent, 'patch', `/api/admin/tours/${tourId}/archive`)).status, 200);
      assert.equal((await request(app).get(`/api/tours/${tourId}`)).status, 404);
      assert.equal((await write(traveler.agent, 'post', '/api/bookings', { tour: tourId, departureId, guests: 1 })).status, 409);
      assert.equal((await write(other.agent, 'patch', `/api/bookings/${bookingId}/status`, { status: 'completed' })).status, 200);
    });
    await t.test('admin stats compute completed revenue and readable chart data', async () => {
      const result = await admin.agent.get('/api/admin/stats');
      assert.equal(result.status, 200); assert.equal(result.body.data.revenueEstimate, 80); assert.equal(result.body.data.bookings.completed, 1);
      assert.equal(result.body.data.bookingsPerMonth.length, 1);
    });
    await t.test('rejection requires reason; reapproval works and both are audited', async () => {
      assert.equal((await write(admin.agent, 'patch', `/api/admin/guides/${pending.guide._id}/reject`, { reason: '' })).status, 400);
      assert.equal((await write(admin.agent, 'patch', `/api/admin/guides/${pending.guide._id}/reject`, { reason: 'Please provide more experience information.' })).status, 200);
      assert.equal((await write(admin.agent, 'patch', `/api/admin/guides/${pending.guide._id}/approve`)).status, 200);
      assert.equal(await AuditLog.countDocuments({ action: { $in: ['approve', 'reject'] } }), 2);
    });
    await t.test('deactivation revokes login and existing sessions; admins protected', async () => {
      assert.equal((await write(admin.agent, 'patch', `/api/admin/users/${traveler.user._id}/deactivate`, { reason: 'Requested account closure.' })).status, 200);
      assert.equal((await traveler.agent.get('/api/auth/me')).status, 401);
      assert.equal((await write(request.agent(app), 'post', '/api/auth/login', { email: traveler.user.email, password: 'ManagementPass123' })).status, 401);
      assert.equal((await write(admin.agent, 'patch', `/api/admin/users/${admin.user._id}/deactivate`, { reason: 'Should not be allowed.' })).status, 409);
    });
  } finally { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); }
});
