import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installMemoryStorage } from './helpers/memoryStorage.js';
import { installMockFetch } from './helpers/mockFetch.js';

const ROW = { item_id: 'Carrot', shop_type: 'seed', current_probability: 0.9, last_seen: 1700000000000, total_occurrences: 4 };
const EXT_ROW = { ...ROW, recent_intervals_ms: [1, 2], is_dormant: false };

let api;
beforeEach(async () => {
  installMemoryStorage();
  api = await import(`../src/js/data/api.js?t=${Date.now()}${Math.random()}`);
});

test('requestJson retries 5xx then succeeds', async () => {
  let n = 0;
  const { calls } = installMockFetch({ '/thing': () => (++n < 3 ? { status: 500, body: 'boom' } : { body: { ok: 1 } }) });
  const out = await api.requestJson('https://h/thing', { retries: 3, retryDelaysMs: [0, 0, 0] });
  assert.deepEqual(out, { ok: 1 });
  assert.equal(calls.length, 3);
});

test('requestJson does not retry 4xx', async () => {
  const { calls } = installMockFetch({ '/thing': { status: 400, body: 'bad' } });
  await assert.rejects(api.requestJson('https://h/thing', { retries: 3, retryDelaysMs: [0] }), (e) => e.status === 400);
  assert.equal(calls.length, 1);
});

test('loadRestockItems uses extended columns, sanitises, caches', async () => {
  const { calls } = installMockFetch({
    'restock_predictions_mat': (url) => ({ body: url.includes('recent_intervals_ms') ? [EXT_ROW, { ...ROW, shop_type: 'apology' }] : [ROW] }),
  });
  const r = await api.loadRestockItems();
  assert.equal(r.fromCache, false);
  assert.equal(r.items.length, 1);
  assert.deepEqual(r.items[0].recent_intervals_ms, [1, 2]);
  assert.ok(calls[0].url.includes('recent_intervals_ms'));
  assert.equal(calls[0].init.headers.apikey, 'sb_publishable_L1p4vEhYCQq11l4IYtbsBQ_FdLYZsGZ');
  const again = await api.loadRestockItems();
  assert.equal(again.fromCache, true);
  assert.equal(calls.length, 1);
});

test('falls back to base columns when extended select is rejected and remembers it', async () => {
  const { calls } = installMockFetch({
    'restock_predictions_mat': (url) => (url.includes('recent_intervals_ms') ? { status: 400, body: 'no column' } : { body: [ROW] }),
  });
  const r = await api.loadRestockItems({ force: true });
  assert.equal(r.items.length, 1);
  assert.equal(calls.length, 2);
  assert.equal(localStorage.getItem('restock.extended.v1'), 'false');
  await api.loadRestockItems({ force: true });
  assert.equal(calls.length, 3); // no second probe of extended
});

test('force load consumes budget and is refused when blocked', async () => {
  installMockFetch({ 'restock_predictions_mat': { body: [ROW] } });
  const { tryConsumeRefresh } = await import('../src/js/data/budget.js');
  for (let i = 0; i < 5; i++) tryConsumeRefresh();
  await api.loadRestockItems(); // seeds cache (non-force, no budget)
  const r = await api.loadRestockItems({ force: true });
  assert.equal(r.fromCache, true);
});

test('network failure returns stale cache instead of throwing (non-force)', async () => {
  localStorage.setItem('restock.cache.v1', JSON.stringify({ data: [ROW], timestamp: 1 }));
  installMockFetch({ 'restock_predictions_mat': { status: 500, body: 'x' } });
  const r = await api.loadRestockItems({ retryDelaysMs: [0, 0, 0] });
  assert.equal(r.fromCache, true);
  assert.equal(r.items[0].item_id, 'Carrot');
  assert.ok(r.error);
});

test('loadRegistry caches and applies rows', async () => {
  installMockFetch({ 'shop_type_registry': { body: [{ shop_type: 'seed', cycle_interval_ms: 1, is_active: true, config: {} }, { shop_type: 'fog', cycle_interval_ms: 2, is_active: true, config: {} }] } });
  await api.loadRegistry();
  const reg = await import('../src/js/data/registry.js');
  assert.deepEqual(reg.getWeatherShopIds(), ['fog']);
  reg.setRegistry(null);
});

test('loadWeatherPredictions normalises', async () => {
  installMockFetch({ 'weather_predictions': { body: [{ weather_id: 'Frost', appearance_rate: '2', total_occurrences: 3, duration_ms: 1 }] } });
  const w = await api.loadWeatherPredictions();
  assert.equal(w[0].weather_id, 'Snow');
  assert.equal(w[0].appearance_rate, 2);
});
