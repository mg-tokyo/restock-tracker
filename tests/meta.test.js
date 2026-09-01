import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setRegistry } from '../src/js/data/registry.js';
import { buildEligibility } from '../src/js/data/gameData.js';
import * as meta from '../src/js/data/meta.js';

const DATA = {
  plants: {
    Carrot: { seed: { name: 'Carrot Seed', rarity: 'Common', coinPrice: 10, sprite: 'https://x/seeds/Carrot.png', eligibleShops: ['Seed'] } },
    Daisy: { seed: { name: 'Daisy Seed', rarity: 'Uncommon', coinPrice: 50, sprite: 'https://x/seeds/Daisy.png', eligibleShops: ['Dawn'] } },
    DawnCelestial: { seed: { name: 'Dawn Celestial', rarity: 'Celestial', coinPrice: 1, sprite: 'https://x/seeds/DawnCelestial.png', eligibleShops: ['Dawn'] } },
  },
  eggs: { SnowEgg: { name: 'Snow Egg', rarity: 'Rare', coinPrice: 5, sprite: 'https://x/pets/SnowEgg.png', eligibleShops: ['Snow'] } },
  items: {
    Shovel: { name: 'Shovel', rarity: 'Common', coinPrice: 1000, sprite: 'https://x/items/Shovel.png', eligibleShops: ['Tool'] },
    XPShard: { name: 'XP Shard', rarity: 'Rare', magicDustPrice: 30, sprite: 'https://x/items/XPShard.png', eligibleShops: ['Amber'] },
    DawnCapsule: { name: 'Dawn Capsule', coinPrice: 0 },
  },
  decor: { WoodFrog: { name: 'Wood Frog', rarity: 'Rare', coinPrice: 2000, sprite: 'https://x/decor/WoodFrog.png', eligibleShops: ['Rain', 'Decor'] } },
};

beforeEach(() => {
  setRegistry(null);
  buildEligibility(DATA);
  meta.buildItemMetaCache(DATA);
});

test('meta lookup incl. tools with dust price and weather-shop cross-family lookup', () => {
  assert.equal(meta.getItemName('Carrot', 'seed'), 'Carrot Seed');
  assert.equal(meta.getItemPrice('Shovel', 'tool'), 1000);
  assert.equal(meta.getItemDustPrice('XPShard', 'tool'), 30);
  assert.equal(meta.getItemPrice('XPShard', 'tool'), 0);
  assert.equal(meta.getItemMeta('DawnCapsule', 'tool'), null);
  assert.equal(meta.getItemName('SnowEgg', 'snow'), 'Snow Egg');
  assert.equal(meta.getItemRarity('SnowEgg', 'snow'), 'rare');
  assert.equal(meta.getItemName('Unknown', 'seed'), 'Unknown');
  assert.equal(meta.humanizeId('AmberMoon'), 'Amber Moon');
  assert.equal(meta.getItemName('AmberMoon', 'weather'), 'Amber Moon');
  assert.equal(meta.getItemRarity('Dawn', 'weather'), 'legendary');
  assert.equal(meta.getCatalogOrder('Daisy', 'seed'), 1);
  assert.equal(meta.getCatalogOrder('Daisy', 'dawn'), 1);
});

test('celestial + required weather', () => {
  assert.equal(meta.isCelestial('MythicalEgg'), true);
  assert.equal(meta.isCelestial('DawnCelestial'), true);
  assert.equal(meta.isCelestial('Carrot'), false);
  assert.equal(meta.getRequiredWeather('Daisy'), 'Dawn');
  assert.equal(meta.getRequiredWeather('XPShard'), 'AmberMoon');
  assert.equal(meta.getRequiredWeather('WoodFrog'), null); // also in Decor
  assert.equal(meta.getRequiredWeather('Carrot'), null);
});

test('fallback rows for tools and weather shops', () => {
  const rows = meta.mergeWeatherShopFallbackRows(meta.mergeToolFallbackRows([]));
  const keys = rows.map((r) => `${r.shop_type}:${r.item_id}`);
  assert.ok(keys.includes('tool:Shovel'));
  assert.ok(keys.includes('tool:XPShard'));
  assert.ok(keys.includes('dawn:Daisy'));
  assert.ok(keys.includes('snow:SnowEgg'));
  assert.ok(keys.includes('rain:WoodFrog'));
  assert.ok(!keys.includes('apology:RainbowPotion'));
  assert.equal(rows.find((r) => r.item_id === 'Shovel').total_occurrences, null);
  const again = meta.mergeToolFallbackRows(rows);
  assert.equal(again.filter((r) => r.item_id === 'Shovel').length, 1);
});

test('sprite urls', () => {
  assert.equal(meta.getSpriteUrl({ item_id: 'Carrot', shop_type: 'seed' }), 'https://x/seeds/Carrot.png');
  assert.equal(meta.getSpriteUrl({ item_id: 'Dawnbinder', shop_type: 'seed' }), 'https://x/seeds/DawnCelestial.png');
  assert.equal(meta.getSpriteUrl({ item_id: 'Snow', shop_type: 'weather' }), './weathericon/FrostIcon.png');
  assert.equal(meta.getSpriteUrl({ item_id: 'Mystery', shop_type: 'decor' }), './decor-sprites/Mystery.png');
  assert.equal(meta.getSpriteUrl({ item_id: 'Rakes', shop_type: 'tool' }), 'https://mg-api.ariedam.fr/assets/sprites/items/Rake.png');
  assert.equal(meta.getSpriteUrl({ item_id: 'SnowEgg', shop_type: 'snow' }), 'https://x/pets/SnowEgg.png');
});
