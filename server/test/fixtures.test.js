import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const c=JSON.parse(await readFile(new URL('../../shared/catalog.json',import.meta.url),'utf8'));
test('fixture counts and deterministic IDs',()=>{assert.equal(c.tours.length,8);assert.equal(c.guides.length,6);assert.equal(c.destinations.length,8);for(const key of ['tours','guides','destinations','reviews'])assert.equal(new Set(c[key].map(x=>x._id)).size,c[key].length);});
test('tour relationships and itineraries are consistent',()=>{for(const t of c.tours){assert.ok(c.destinations.some(d=>d._id===t.destination._id));assert.ok(c.guides.some(g=>g._id===t.guide._id));assert.equal(t.itinerary.length,t.duration);assert.ok(t.price>0);assert.ok(t.images.length>=3);}});
test('reviews refer to existing tours',()=>{for(const r of c.reviews)assert.ok(c.tours.some(t=>t._id===r.tour));});
