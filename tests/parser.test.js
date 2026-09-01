import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalItemId, getItemIdVariants, toMs, toFloat, toBoolean,
  normalizeShopType, normalizeRestockItem, deduplicateItems,
  extractItemsArray, getItemProbability, makeEmptyRestockRow,
} from '../src/js/data/parser.js';

test('aliases collapse legacy ids within seed and dawn scopes', () => {
  assert.equal(canonicalItemId('seed', 'DawnbinderPod'), 'DawnCelestial');
  assert.equal(canonicalItemId('dawn', 'Moonbinder'), 'MoonCelestial');
  assert.equal(canonicalItemId('egg', 'DawnbinderPod'), 'DawnbinderPod');
  assert.deepEqual(new Set(getItemIdVariants('seed', 'DawnCelestial')),
    new Set(['DawnCelestial', 'Dawnbinder', 'DawnbinderPod']));
});

test('coercion helpers', () => {
  assert.equal(toMs('2026-01-01T00:00:00Z'), Date.UTC(2026, 0, 1));
  assert.equal(toMs('1700000000000'), 1700000000000);
  assert.equal(toMs(null), null);
  assert.equal(toFloat('0.25'), 0.25);
  assert.equal(toFloat('x'), null);
  assert.equal(toBoolean('t'), true);
  assert.equal(toBoolean(0), false);
  assert.equal(toBoolean('maybe'), null);
  assert.equal(normalizeShopType(' Seeds '), 'seed');
  assert.equal(normalizeShopType('tools'), 'tool');
});

test('normalizeRestockItem maps base_rate and algorithm_updated_at_ms', () => {
  const row = normalizeRestockItem({
    item_id: 'Carrot', shop_type: 'seed', current_probability: '0.9', base_rate: 0.8,
    estimated_next_timestamp: '2026-01-01T00:00:00Z', expected_interval_ms: '300000',
    last_seen: 1700000000000, total_occurrences: '12', algorithm_updated_at_ms: 1700000000000,
    is_dormant: 'false', weather_used: 't', recent_intervals_ms: ['1', 2, 'x'],
  });
  assert.equal(row.current_probability, 0.9);
  assert.equal(row.appearance_rate, 0.8);
  assert.equal(row.median_interval_ms, 300000);
  assert.equal(row.total_occurrences, 12);
  assert.equal(row.algorithm_updated_at, 1700000000000);
  assert.equal(row.is_dormant, null);
  assert.equal(row.weather_used, true);
  assert.deepEqual(row.recent_intervals_ms, [1, 2]);
  assert.equal(getItemProbability(row), 0.9);
  assert.equal(getItemProbability({ current_probability: null, appearance_rate: 0.3 }), 0.3);
});

test('deduplicateItems merges alias rows keeping freshest last_seen', () => {
  const a = { ...makeEmptyRestockRow('Dawnbinder', 'seed'), last_seen: 100, total_occurrences: 3, average_quantity: 2 };
  const b = { ...makeEmptyRestockRow('DawnCelestial', 'seed'), last_seen: 200, total_occurrences: 1, current_probability: 0.5 };
  const out = deduplicateItems([a, b]);
  assert.equal(out.length, 1);
  assert.equal(out[0].item_id, 'DawnCelestial');
  assert.equal(out[0].last_seen, 200);
  assert.equal(out[0].total_occurrences, 3);
  assert.equal(out[0].average_quantity, 2);
  assert.equal(out[0].current_probability, 0.5);
});

test('extractItemsArray unwraps arrays and envelopes', () => {
  assert.deepEqual(extractItemsArray([{ item_id: 'x' }]), [{ item_id: 'x' }]);
  assert.deepEqual(extractItemsArray({ data: [{ item_id: 'x' }] }), [{ item_id: 'x' }]);
  assert.equal(extractItemsArray({ foo: 1 }), null);
});
