import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installMemoryStorage } from './helpers/memoryStorage.js';
import { installMockFetch } from './helpers/mockFetch.js';

const DATA = {
  plants: { Carrot: { seed: { name: 'Carrot Seed', eligibleShops: ['Seed'] } }, Daisy: { seed: { name: 'Daisy Seed', eligibleShops: ['Dawn'] } } },
  eggs: { SnowEgg: { name: 'Snow Egg', eligibleShops: ['Snow'] } },
  items: { Shovel: { name: 'Shovel', eligibleShops: ['Tool'] }, RainbowPotion: { eligibleShops: ['Apology'] } },
  decor: { WoodFrog: { name: 'Wood Frog', eligibleShops: ['Rain', 'Decor'] } },
};

let gd;
beforeEach(async () => {
  installMemoryStorage();
  gd = await import(`../src/js/data/gameData.js?t=${Date.now()}${Math.random()}`);
});

test('loadGameData fetches, caches, and builds eligibility', async () => {
  const { calls } = installMockFetch({ '/data': { body: DATA } });
  const data = await gd.loadGameData();
  assert.equal(data.plants.Carrot.seed.name, 'Carrot Seed');
  assert.equal(gd.isEligibilityLoaded(), true);
  assert.deepEqual(gd.getShopEligibleItemIds('dawn'), ['Daisy']);
  assert.deepEqual(gd.getShopEligibleItemIds('snow'), ['SnowEgg']);
  assert.deepEqual(gd.getItemEligibleShops('WoodFrog'), ['rain', 'decor']);
  assert.deepEqual(gd.getItemEligibleShops('Nope'), []);
  await gd.loadGameData();
  assert.equal(calls.length, 1);
});

test('loadGameData falls back to stale cache on failure', async () => {
  localStorage.setItem('restock.gameData.v1', JSON.stringify({ data: DATA, timestamp: 1 }));
  installMockFetch({ '/data': { status: 500, body: 'x' } });
  const data = await gd.loadGameData();
  assert.equal(data.eggs.SnowEgg.name, 'Snow Egg');
});

test('live weather canonicalises and notifies on change', async () => {
  installMockFetch({ '/live': { body: { weather: 'Frost' } } });
  const seen = [];
  const off = gd.onWeatherChange((w) => seen.push(w));
  assert.equal(await gd.refreshLiveWeather({ force: true }), 'Snow');
  assert.equal(gd.getCurrentWeather(), 'Snow');
  assert.deepEqual(seen, ['Snow']);
  installMockFetch({ '/live': { body: { weather: 'Clear Skies' } } });
  assert.equal(await gd.refreshLiveWeather({ force: true }), 'Sunny');
  off();
  await gd.refreshLiveWeather({ force: true });
  assert.deepEqual(seen, ['Snow', 'Sunny']);
});
