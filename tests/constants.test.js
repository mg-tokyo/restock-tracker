import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setRegistry } from '../src/js/data/registry.js';
import {
  getShopOrder, getShopFilters, isHiddenOrExpired, ITEM_EXPIRY, CELESTIAL_IDS, SHOP_LABELS,
} from '../src/js/data/constants.js';

test('shop order: standard, weather shops, weather events last', () => {
  setRegistry(null);
  assert.ok(getShopOrder('seed') < getShopOrder('tool'));
  assert.ok(getShopOrder('tool') < getShopOrder('dawn'));
  assert.ok(getShopOrder('dawn') < getShopOrder('snow'));
  assert.ok(getShopOrder('rain') < getShopOrder('weather'));
  assert.equal(getShopOrder('weather'), 99);
});

test('filters are registry-driven', () => {
  setRegistry(null);
  assert.deepEqual(getShopFilters().map((f) => f.value),
    ['all', 'celestial', 'seed', 'egg', 'decor', 'tool', 'dawn', 'snow', 'thunder', 'amber', 'rain', 'weather']);
  assert.equal(getShopFilters().find((f) => f.value === 'thunder').label, 'Thunder');
  assert.equal(SHOP_LABELS.tool, 'Tools');
});

test('hidden and expiry', () => {
  assert.equal(isHiddenOrExpired('seed', 'StoneGnome', 0), true);
  assert.equal(isHiddenOrExpired('seed', 'Carrot', 0), false);
  const exp = ITEM_EXPIRY['seed:PineTree'];
  assert.equal(isHiddenOrExpired('seed', 'PineTree', exp - 1), false);
  assert.equal(isHiddenOrExpired('seed', 'PineTree', exp), true);
  assert.ok(CELESTIAL_IDS.has('MythicalEgg'));
});
