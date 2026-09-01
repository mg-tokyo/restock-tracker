import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './helpers/fakeDom.js';
import { setRegistry } from '../src/js/data/registry.js';

let history, meta, gd;
const DATA = {
  plants: {
    Carrot: { seed: { name: 'Carrot Seed', rarity: 'Common', coinPrice: 10, eligibleShops: ['Seed'] } },
    Apple: { seed: { name: 'Apple Seed', rarity: 'Rare', coinPrice: 500, eligibleShops: ['Seed'] } },
    DawnCelestial: { seed: { name: 'Dawn Celestial', rarity: 'Celestial', coinPrice: 1, eligibleShops: ['Dawn'] } },
  },
  eggs: { CommonEgg: { name: 'Common Egg', rarity: 'Common', coinPrice: 100, eligibleShops: ['Egg'] } },
  items: {}, decor: {},
};

before(async () => {
  installFakeDom();
  globalThis.document.getElementById = () => null;
  setRegistry(null);
  gd = await import('../src/js/data/gameData.js');
  meta = await import('../src/js/data/meta.js');
  gd.buildEligibility(DATA);
  meta.buildItemMetaCache(DATA);
  history = await import('../src/js/ui/history.js');
});

const row = (item_id, shop_type, extra = {}) => ({ item_id, shop_type, last_seen: 0, average_quantity: 1, total_occurrences: 3, ...extra });
const ITEMS = [
  row('Apple', 'seed', { last_seen: 300, average_quantity: 5 }),
  row('Carrot', 'seed', { last_seen: 100, average_quantity: 2 }),
  row('CommonEgg', 'egg', { last_seen: 200, average_quantity: 1 }),
  row('DawnCelestial', 'dawn', { last_seen: 400 }),
  row('StoneGnome', 'seed'),
  row('Rain', 'weather'),
];
const base = { tracked: new Set(), filter: 'all', search: '', sortColumn: null, sortDirection: 'asc', now: 0 };

test('default order: shop order then catalog order; hidden and pinned removed', () => {
  const out = history.filterAndSort(ITEMS, { ...base, tracked: new Set(['egg:CommonEgg']) }).map((i) => `${i.shop_type}:${i.item_id}`);
  assert.deepEqual(out, ['seed:Carrot', 'seed:Apple', 'dawn:DawnCelestial', 'weather:Rain']);
});

test('filters: shop, celestial, weather, search', () => {
  assert.deepEqual(history.filterAndSort(ITEMS, { ...base, filter: 'seed' }).map((i) => i.item_id), ['Carrot', 'Apple']);
  assert.deepEqual(history.filterAndSort(ITEMS, { ...base, filter: 'celestial' }).map((i) => i.item_id), ['DawnCelestial']);
  assert.deepEqual(history.filterAndSort(ITEMS, { ...base, filter: 'weather' }).map((i) => i.item_id), ['Rain']);
  assert.deepEqual(history.filterAndSort(ITEMS, { ...base, search: 'egg' }).map((i) => i.item_id), ['CommonEgg']);
  assert.deepEqual(history.filterAndSort(ITEMS, { ...base, search: 'dawncel' }).map((i) => i.item_id), ['DawnCelestial']);
});

test('column sorts', () => {
  const ids = (o) => history.filterAndSort(ITEMS, { ...base, ...o }).map((i) => i.item_id);
  assert.deepEqual(ids({ sortColumn: 'item' }), ['Apple', 'Carrot', 'Common Egg', 'Dawn Celestial', 'Rain'].map((n) => n.replace(' ', '')));
  assert.deepEqual(ids({ sortColumn: 'price', sortDirection: 'desc' }).slice(0, 2), ['Apple', 'CommonEgg']);
  assert.deepEqual(ids({ sortColumn: 'qty', sortDirection: 'desc' }).slice(0, 2), ['Apple', 'Carrot']);
  assert.deepEqual(ids({ sortColumn: 'last', sortDirection: 'desc' })[0], 'DawnCelestial');
});
