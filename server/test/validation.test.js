import test from 'node:test';
import assert from 'node:assert/strict';
import { pagination,integer,enumValue,escapeRegex,validateOptionalId } from '../src/middleware/validate.js';
test('pagination defaults and bounds',()=>{assert.deepEqual(pagination({}),{page:1,limit:8});assert.deepEqual(pagination({page:'2',limit:'6'}),{page:2,limit:6});for(const page of ['-1','0','x','1.5'])assert.throws(()=>pagination({page}));assert.throws(()=>pagination({limit:'51'}));});
test('integers reject malformed input',()=>{assert.equal(integer('3','duration'),3);assert.throws(()=>integer('3.5','duration'));});
test('enum filters use an allowlist',()=>{assert.equal(enumValue('Easy',['Easy'],'difficulty'),'Easy');assert.throws(()=>enumValue('Unknown',['Easy'],'difficulty'));});
test('regex search treats metacharacters as literal text',()=>{for(const value of ['[','.*','a+b','a(b)','a\\b','$5','a?']){const regex=new RegExp(escapeRegex(value));assert.equal(regex.test(value),true);assert.equal(regex.source.includes('undefined'),false);}assert.equal(new RegExp(escapeRegex('.*')).test('anything'),false);});
test('guide identifiers reject injection-like values',()=>{assert.equal(validateOptionalId('000000000000000000000065'),'000000000000000000000065');assert.throws(()=>validateOptionalId('$ne'));});
