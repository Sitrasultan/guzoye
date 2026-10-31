import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
const { default: app } = await import('../src/app.js');
test('health is honest without database access', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 503); assert.equal(response.body.database, 'disconnected');
});
test('unknown routes return JSON 404', async () => {
  assert.equal((await request(app).get('/api/missing')).status, 404);
});
test('invalid IDs and unsafe pagination return 400 without database access', async () => {
  assert.equal((await request(app).get('/api/tours/not-an-id')).status, 400);
  assert.equal((await request(app).get('/api/tours?page=-1')).status, 400);
});
test('repeated query values are rejected', async () => {
  assert.equal((await request(app).get('/api/tours?region=Afar&region=Amhara')).status, 400);
});
test('protected endpoints reject requests without a session', async () => {
  for (const path of ['/api/auth/me', '/api/dashboard/traveler', '/api/admin/guides', '/api/bookings/mine', '/api/guide/bookings', '/api/admin/bookings']) {
    assert.equal((await request(app).get(path)).status, 401);
  }
  assert.equal((await request(app).post('/api/bookings').send({})).status, 401);
});
test('auth writes require trusted origin and CSRF token', async () => {
  assert.equal((await request(app).post('/api/auth/register').send({})).status, 403);
});
test('review writes remain absent', async () => {
  assert.equal((await request(app).post('/api/reviews').send({})).status, 404);
});
