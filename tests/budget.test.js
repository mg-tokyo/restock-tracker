import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installMemoryStorage } from './helpers/memoryStorage.js';

let budget;
beforeEach(async () => {
  installMemoryStorage();
  budget = await import('../src/js/data/budget.js');
});

test('fresh budget has 5 remaining and resets after 2h', () => {
  const t0 = 1_000_000;
  const b = budget.getRefreshBudget(t0);
  assert.equal(b.remaining, 5);
  assert.equal(b.blocked, false);
  assert.equal(b.resetAt, t0 + 2 * 60 * 60 * 1000);
});

test('consuming five refreshes blocks, window expiry unblocks', () => {
  const t0 = 1_000_000;
  let b;
  for (let i = 0; i < 5; i++) b = budget.tryConsumeRefresh(t0 + i);
  assert.equal(b.remaining, 0);
  assert.equal(b.blocked, true);
  b = budget.tryConsumeRefresh(t0 + 10);
  assert.equal(b.used, 5);
  b = budget.getRefreshBudget(t0 + 2 * 60 * 60 * 1000 + 1);
  assert.equal(b.remaining, 5);
});
