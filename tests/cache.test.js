import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installMemoryStorage } from './helpers/memoryStorage.js';

let cache;
beforeEach(async () => {
  installMemoryStorage();
  cache = await import('../src/js/data/cache.js');
});

test('writeEntry/readEntry round-trip with fresh TTL', () => {
  cache.writeEntry('restock.test', { a: 1 });
  const e = cache.readEntry('restock.test', 60_000);
  assert.deepEqual(e.data, { a: 1 });
  assert.equal(e.stale, false);
  assert.equal(typeof e.timestamp, 'number');
});

test('readEntry marks stale beyond TTL but still returns data', () => {
  localStorage.setItem('restock.test', JSON.stringify({ data: 'x', timestamp: Date.now() - 10_000 }));
  const e = cache.readEntry('restock.test', 5_000);
  assert.equal(e.data, 'x');
  assert.equal(e.stale, true);
});

test('readEntry returns null for missing or corrupt', () => {
  assert.equal(cache.readEntry('nope', 1000), null);
  localStorage.setItem('bad', '{not json');
  assert.equal(cache.readEntry('bad', 1000), null);
});

test('purgeLegacyKeys removes old keys only', async () => {
  const { LEGACY_KEYS } = await import('../src/js/config.js');
  for (const k of LEGACY_KEYS) localStorage.setItem(k, '1');
  localStorage.setItem('restock.cache.v1', '1');
  cache.purgeLegacyKeys();
  for (const k of LEGACY_KEYS) assert.equal(localStorage.getItem(k), null);
  assert.equal(localStorage.getItem('restock.cache.v1'), '1');
});
