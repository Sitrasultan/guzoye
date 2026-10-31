import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
// Separate variable: a read-only, seeded discovery DB, never the auth scratch DB.
const enabled = Boolean(process.env.CATALOG_TEST_MONGODB_URI);
before(async () => { if (enabled) await mongoose.connect(process.env.CATALOG_TEST_MONGODB_URI); });
after(async () => { if (enabled) await mongoose.disconnect(); });
test('seeded discovery still returns approved fixtures', { skip: !enabled }, async () => {
  const tours = await request(app).get('/api/tours?limit=50');
  assert.equal(tours.status, 200); assert.equal(tours.body.pagination.total, 8);
  const tour = tours.body.data[0];
  assert.ok(tour.destination.name); assert.ok(tour.guide.user.name);
  assert.equal(tour.guide.status, 'approved');
  assert.equal(tour.guide.user.password, undefined);
  assert.equal(tour.guide.user.email, undefined);
  assert.equal((await request(app).get('/api/guides?limit=50')).body.pagination.total, 6);
  assert.equal((await request(app).get('/api/destinations?limit=50')).body.pagination.total, 8);
});
test('seeded search and filters remain correct', { skip: !enabled }, async () => {
  assert.equal((await request(app).get('/api/tours?search=Lalibela')).body.pagination.total, 1);
  assert.equal((await request(app).get('/api/tours?region=Amhara&difficulty=Easy')).body.pagination.total, 2);
  assert.equal((await request(app).get('/api/tours?maxPrice=100')).body.pagination.total, 1);
  assert.equal((await request(app).get('/api/guides?language=French')).body.pagination.total, 1);
});
