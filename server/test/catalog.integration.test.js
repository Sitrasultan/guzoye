import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
// Read-only integration checks against a separately seeded development DB.
const enabled=Boolean(process.env.TEST_MONGODB_URI);
before(async()=>{if(enabled)await mongoose.connect(process.env.TEST_MONGODB_URI);});
after(async()=>{if(enabled)await mongoose.disconnect();});
test('seeded discovery API preserves fixture counts and public fields',{skip:!enabled},async()=>{
  const tours=await request(app).get('/api/tours?limit=50');
  assert.equal(tours.status,200);assert.equal(tours.body.pagination.total,8);
  assert.equal(tours.body.data.length,8);
  const tour=tours.body.data[0];assert.ok(tour.destination.name);assert.ok(tour.guide.user.name);
  assert.equal(tour.guide.user.password,undefined);assert.equal(tour.guide.user.email,undefined);
  const guides=await request(app).get('/api/guides?limit=50');assert.equal(guides.body.pagination.total,6);
  const destinations=await request(app).get('/api/destinations?limit=50');assert.equal(destinations.body.pagination.total,8);
});
test('seeded search, filters, sorting, and pagination',{skip:!enabled},async()=>{
  const search=await request(app).get('/api/tours?search=Lalibela');assert.equal(search.status,200);assert.equal(search.body.pagination.total,1);
  const region=await request(app).get('/api/tours?region=Amhara&difficulty=Easy');assert.equal(region.body.pagination.total,2);
  const cheap=await request(app).get('/api/tours?maxPrice=100');assert.equal(cheap.body.pagination.total,1);
  const page=await request(app).get('/api/tours?limit=3&page=2&sort=price-asc');assert.equal(page.body.data.length,3);assert.equal(page.body.pagination.pages,3);assert.ok(page.body.data[0].price<=page.body.data[1].price);
  const language=await request(app).get('/api/guides?language=French');assert.equal(language.body.pagination.total,1);
});
test('seeded single resources and reviews',{skip:!enabled},async()=>{
  const id='000000000000000000000191';
  const detail=await request(app).get(`/api/tours/${id}`);assert.equal(detail.status,200);assert.equal(detail.body.data.title,'Lalibela Rock-Hewn Churches');
  const reviews=await request(app).get(`/api/tours/${id}/reviews`);assert.equal(reviews.body.pagination.total,1);
  const missing=await request(app).get('/api/tours/ffffffffffffffffffffffff');assert.equal(missing.status,404);
});
