import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installMemoryStorage } from './helpers/memoryStorage.js';
import { installMockFetch } from './helpers/mockFetch.js';

test('memory storage round-trips', () => {
  const s = installMemoryStorage();
  s.setItem('a', '1');
  assert.equal(localStorage.getItem('a'), '1');
});

test('mock fetch serves routes', async () => {
  installMockFetch({ '/x': { body: { ok: true } } });
  const res = await fetch('https://h/x');
  assert.deepEqual(await res.json(), { ok: true });
});
