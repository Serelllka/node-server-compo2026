const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = (file) => fs.readFileSync(path.join(__dirname, '../solutions', file), 'utf8');
const load = (file) => vm.runInNewContext(source(file) + '\ntask;');

test('callback calls functions once, preserves their result, and handles non-functions', () => {
  const task = load('callback.js');
  let calls = 0;
  const result = {};
  assert.equal(task(() => { calls++; return result; }), result);
  assert.equal(calls, 1);
  for (const value of [undefined, null, 0, false, '', {}, []]) {
    assert.equal(task(value), 'serelllka');
  }
  const error = new Error('callback failure');
  assert.throws(() => task(() => { throw error; }), (actual) => actual === error);
  assert.doesNotMatch(source('callback.js'), /\b(?:if|else)\b/);
});

test('promise1 resolves zero and other values, and rejects at the age boundary', async () => {
  const task = load('promise1.js');
  for (const value of [0, '0']) assert.equal(await task(value), 'serelllka');
  for (const value of [-1, 1, 17]) assert.equal(await task(value), 'yes');
  for (const value of [18, 19, 100]) {
    await assert.rejects(task(value), (reason) => reason === 'no');
  }
});

test('promise2 awaits the name and preserves rejected promises', async () => {
  const task = load('promise2.js');
  assert.equal(await task({ name: Promise.resolve('hello') }), 'helloserelllka');
  assert.equal(await task({ name: 'hello' }), 'helloserelllka');
  assert.equal(await task({ name: Promise.resolve('') }), 'serelllka');
  const error = new Error('name failure');
  await assert.rejects(task({ name: Promise.reject(error) }), (actual) => actual === error);
});

test('JSX solutions retain the required single fragment and expression shapes', () => {
  assert.match(source('jsx1.jsx'), /^function task\(\)\s*\{\s*return <>serelllka<\/>;\s*\}\s*$/);
  assert.match(source('jsx2.jsx'), /^function task\(x\)\s*\{\s*return <h1>\{x \+ 'serelllka'\}<\/h1>;\s*\}\s*$/);
});
