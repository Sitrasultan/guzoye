import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
const { default: app } = await import('../src/app.js');
const { env } = await import('../src/config/env.js');
const { default: User } = await import('../src/models/User.js');
const { default: Guide } = await import('../src/models/Guide.js');
const { default: Destination } = await import('../src/models/Destination.js');
const { default: Tour } = await import('../src/models/Tour.js');
const { default: Booking } = await import('../src/models/Booking.js');
async function write(agent, method, path, body = {}) {
  const token = (await agent.get('/api/auth/csrf')).body.data.csrfToken;
  return agent[method](path).set('Origin', env.clientOrigin).set('X-CSRF-Token', token).send(body);
}
async function login(user) {
  const agent = request.agent(app);
  const response = await write(agent, 'post', '/api/auth/login', { email: user.email, password: 'BookingTest123' });
  assert.equal(response.status, 200);
  return agent;
}
const uri = process.env.TEST_MONGODB_URI;
test('Phase 4 transactional booking integration', { skip: !uri }, async t => {
  const target = new URL(uri);
  const base = decodeURIComponent(target.pathname.slice(1));
  if (!/wondu/i.test(base) || !/test/i.test(base)) throw new Error('Test database name must contain wondu and test.');
  target.pathname = `/${base}_bookings_${process.pid}_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(target.toString());
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    assert.ok(hello.setName || hello.msg === 'isdbgrid', 'Integration tests require transactions: replica set or Atlas.');
    await Promise.all([User.init(), Guide.init(), Destination.init(), Tour.init(), Booking.init()]);
    const makeUser = (name, role) => User.create({ name, email: `${name.toLowerCase()}@example.com`, password: 'BookingTest123', role });
    const traveler = await makeUser('TravelerOne', 'traveler');
    const other = await makeUser('TravelerTwo', 'traveler');
    const guideUser = await makeUser('GuideOne', 'guide');
    const otherGuideUser = await makeUser('GuideTwo', 'guide');
    const pendingUser = await makeUser('GuidePending', 'guide');
    const admin = await makeUser('Admin', 'admin');
    const guide = await Guide.create({ user: guideUser._id, status: 'approved' });
    const otherGuide = await Guide.create({ user: otherGuideUser._id, status: 'approved' });
    const pendingGuide = await Guide.create({ user: pendingUser._id, status: 'pending' });
    const [travelerAgent, otherAgent, guideAgent, otherGuideAgent, pendingAgent, adminAgent] = await Promise.all([traveler, other, guideUser, otherGuideUser, pendingUser, admin].map(login));
    const destination = await Destination.create({ name: 'Booking Test Destination', region: 'Amhara', description: 'Test only.', image: 'https://example.com/image.jpg' });
    async function makeTour(options = {}) {
      return Tour.create({ title: 'Booking Test Tour', destination: destination._id, description: 'Test only.', price: options.price ?? 19.99, duration: 1, difficulty: 'Easy', capacity: options.capacity ?? 4,
        itinerary: [{ day: 1, title: 'Explore', description: 'Test itinerary' }], images: ['https://example.com/test.jpg'], guide: options.guide || guide._id,
        departures: [{ date: options.date || new Date(Date.now() + 86400000 * 10), capacity: options.capacity ?? 4, spotsLeft: options.capacity ?? 4 }]
      });
    }
    const payload = (tour, guests = 1) => ({ tour: String(tour._id), departureId: String(tour.departures[0]._id), guests });
    const spots = async tour => (await Tour.findById(tour._id)).departures[0].spotsLeft;
    await t.test('successful booking uses server price and ignores injected fields', async () => {
      const tour = await makeTour();
      const response = await write(travelerAgent, 'post', '/api/bookings', { ...payload(tour, 3), totalPrice: 0, status: 'confirmed', user: String(other._id) });
      assert.equal(response.status, 201); assert.equal(response.body.data.totalPrice, 59.97);
      assert.equal(response.body.data.status, 'pending'); assert.equal(response.body.data.user, String(traveler._id));
      assert.equal(await spots(tour), 1);
    });
    await t.test('overbooking is rejected without changing inventory', async () => {
      const tour = await makeTour({ capacity: 1 });
      const response = await write(travelerAgent, 'post', '/api/bookings', payload(tour, 2));
      assert.equal(response.status, 409); assert.equal(await spots(tour), 1);
    });
    await t.test('duplicate active booking is rejected', async () => {
      const tour = await makeTour();
      assert.equal((await write(travelerAgent, 'post', '/api/bookings', payload(tour))).status, 201);
      assert.equal((await write(travelerAgent, 'post', '/api/bookings', payload(tour))).status, 409);
      assert.equal(await spots(tour), 3);
    });
    await t.test('past departure and pending guide are rejected', async () => {
      const past = await makeTour({ date: new Date(Date.now() - 86400000) });
      assert.equal((await write(travelerAgent, 'post', '/api/bookings', payload(past))).status, 409);
      const pending = await makeTour({ guide: pendingGuide._id });
      assert.equal((await write(travelerAgent, 'post', '/api/bookings', payload(pending))).status, 409);
      assert.equal(await spots(past), 4); assert.equal(await spots(pending), 4);
    });
    await t.test('two simultaneous requests for the last spot: exactly one succeeds', async () => {
      const tour = await makeTour({ capacity: 1 });
      const responses = await Promise.all([
        write(travelerAgent, 'post', '/api/bookings', payload(tour)),
        write(otherAgent, 'post', '/api/bookings', payload(tour))
      ]);
      assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
      assert.equal(await spots(tour), 0);
      assert.equal(await Booking.countDocuments({ tour: tour._id }), 1);
    });
    await t.test('cancellation restores seats exactly once and another owner is denied', async () => {
      const tour = await makeTour();
      const created = await write(travelerAgent, 'post', '/api/bookings', payload(tour, 2));
      const id = created.body.data._id;
      assert.equal((await write(otherAgent, 'patch', `/api/bookings/${id}/cancel`)).status, 403);
      assert.equal((await write(travelerAgent, 'patch', `/api/bookings/${id}/cancel`)).status, 200);
      assert.equal(await spots(tour), 4);
      assert.equal((await write(travelerAgent, 'patch', `/api/bookings/${id}/cancel`)).status, 409);
      assert.equal(await spots(tour), 4);
      assert.equal((await write(travelerAgent, 'post', '/api/bookings', payload(tour))).status, 201);
    });
    await t.test('invalid transitions and foreign guide modifications are rejected', async () => {
      const tour = await makeTour();
      const id = (await write(travelerAgent, 'post', '/api/bookings', payload(tour))).body.data._id;
      assert.equal((await write(guideAgent, 'patch', `/api/bookings/${id}/status`, { status: 'completed' })).status, 409);
      assert.equal((await write(otherGuideAgent, 'patch', `/api/bookings/${id}/status`, { status: 'confirmed' })).status, 403);
      assert.equal((await write(guideAgent, 'patch', `/api/bookings/${id}/status`, { status: 'confirmed' })).status, 200);
      assert.equal((await write(guideAgent, 'patch', `/api/bookings/${id}/status`, { status: 'declined' })).status, 409);
      assert.equal((await write(guideAgent, 'patch', `/api/bookings/${id}/status`, { status: 'completed' })).status, 200);
      assert.equal((await write(travelerAgent, 'patch', `/api/bookings/${id}/cancel`)).status, 409);
      assert.equal(await spots(tour), 3);
    });
    await t.test('decline restores spots and is terminal', async () => {
      const tour = await makeTour();
      const id = (await write(travelerAgent, 'post', '/api/bookings', payload(tour, 2))).body.data._id;
      assert.equal((await write(guideAgent, 'patch', `/api/bookings/${id}/status`, { status: 'declined' })).status, 200);
      assert.equal(await spots(tour), 4);
      assert.equal((await write(guideAgent, 'patch', `/api/bookings/${id}/status`, { status: 'confirmed' })).status, 409);
    });
    await t.test('concurrent cancel and decline restore inventory only once', async () => {
      const tour = await makeTour();
      const id = (await write(travelerAgent, 'post', '/api/bookings', payload(tour, 2))).body.data._id;
      const responses = await Promise.all([
        write(travelerAgent, 'patch', `/api/bookings/${id}/cancel`),
        write(guideAgent, 'patch', `/api/bookings/${id}/status`, { status: 'declined' })
      ]);
      assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
      assert.equal(await spots(tour), 4);
    });
    await t.test('traveler cannot access guide/admin endpoints, pending guide cannot list', async () => {
      assert.equal((await travelerAgent.get('/api/guide/bookings')).status, 403);
      assert.equal((await travelerAgent.get('/api/admin/bookings')).status, 403);
      assert.equal((await pendingAgent.get('/api/guide/bookings')).status, 403);
      assert.equal((await write(guideAgent, 'post', '/api/bookings', {})).status, 403);
      assert.equal((await write(adminAgent, 'post', '/api/bookings', {})).status, 403);
    });
    await t.test('guide lists only own tours and admin can filter statuses', async () => {
      const own = await makeTour({ guide: otherGuide._id });
      await write(otherAgent, 'post', '/api/bookings', payload(own));
      const response = await otherGuideAgent.get('/api/guide/bookings?limit=50');
      assert.equal(response.status, 200); assert.equal(response.body.pagination.total, 1);
      assert.ok(response.body.data.every(booking => booking.tour.guide === String(otherGuide._id)));
      const adminResponse = await adminAgent.get('/api/admin/bookings?status=cancelled');
      assert.equal(adminResponse.status, 200); assert.ok(adminResponse.body.data.every(booking => booking.status === 'cancelled'));
    });
    await t.test('booking insert failure rolls back the atomic decrement', async () => {
      const tour = await makeTour();
      const original = Booking.create;
      Booking.create = async () => { throw new Error('Intentional test insert failure'); };
      try { assert.equal((await write(travelerAgent, 'post', '/api/bookings', payload(tour, 2))).status, 500); }
      finally { Booking.create = original; }
      assert.equal(await spots(tour), 4);
      assert.equal(await Booking.countDocuments({ tour: tour._id }), 0);
    });
    await t.test('writes without CSRF are denied before inventory changes', async () => {
      const tour = await makeTour();
      assert.equal((await travelerAgent.post('/api/bookings').set('Origin', env.clientOrigin).send(payload(tour))).status, 403);
      assert.equal(await spots(tour), 4);
    });
  } finally { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); }
});
