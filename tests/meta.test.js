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
    ReplenishPotion: { name: 'Hunger Potion', rarity: 'Rare', coinPrice: null, dustPrice: 250, sprite: 'https://x/items/ReplenishPotion.png', eligibleShops: ['Tool'] },
    Camera: { name: 'Camera', rarity: 'Common', coinPrice: 1000, eligibleShops: [] },
    CarvingKnife: { name: 'Carving Knife', rarity: 'Rare', coinPrice: 500, eligibleShops: ['Spooky'], expiryDate: '2026-11-10T00:00:00.000Z' },
    DawnCapsule: { name: 'Dawn Capsule', coinPrice: 0 },
  },
  decor: {
    WoodFrog: { name: 'Wood Frog', rarity: 'Rare', coinPrice: 2000, sprite: 'https://x/decor/WoodFrog.png', eligibleShops: ['Rain', 'Decor'] },
    DecorShed: { name: 'Decor Shed', rarity: 'Divine', coinPrice: null, dustPrice: 10000, sprite: 'https://x/decor/DecorShed.png', eligibleShops: ['Tool'] },
  },
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
  // Unpriced catalog items still resolve a name via the catalog, but carry no price.
  assert.equal(meta.getItemName('DawnCapsule', 'tool'), 'Dawn Capsule');
  assert.equal(meta.getItemPrice('DawnCapsule', 'tool'), 0);
  assert.equal(meta.getItemDustPrice('DawnCapsule', 'tool'), 0);
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
  assert.ok(keys.includes('tool:ReplenishPotion'));
  assert.ok(keys.includes('tool:DecorShed'));
  assert.ok(!keys.includes('tool:XPShard'), 'Amber-only item is not a Tools row');
  assert.ok(!keys.includes('tool:Camera'), 'eligibleShops [] is not a Tools row');
  assert.ok(!keys.includes('tool:CarvingKnife'));
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

test('sprite urls fall through catalog families when shop and family diverge', () => {
  const DATA_CROSS = {
    plants: {},
    eggs: {},
    items: {
      PlanterPot: { name: 'Planter Pot', rarity: 'Common', coinPrice: 25000, sprite: 'https://x/items/PlanterPot.png', eligibleShops: ['Tool'] },
    },
    decor: {
      DecorShed: { name: 'Decor Shed', rarity: 'Rare', coinPrice: 1, sprite: 'https://x/decor/DecorShed.png', eligibleShops: ['Tool'] },
      StringLights: { name: 'String Lights', rarity: 'Common', coinPrice: 7000, sprite: 'https://x/decor/StringLights.png', eligibleShops: ['Decor'] },
    },
  };
  buildEligibility(DATA_CROSS);
  meta.buildItemMetaCache(DATA_CROSS);
  meta.clearSpriteUrlCache();
  assert.equal(meta.getSpriteUrl({ item_id: 'DecorShed', shop_type: 'tool' }), 'https://x/decor/DecorShed.png');
  assert.equal(meta.getSpriteUrl({ item_id: 'PlanterPot', shop_type: 'decor' }), 'https://x/items/PlanterPot.png');
  assert.equal(meta.getSpriteUrl({ item_id: 'StringLights', shop_type: 'seed' }), 'https://x/decor/StringLights.png');
});

test('dustPrice is read for items (Ariedam field name)', () => {
  assert.equal(meta.getItemName('ReplenishPotion', 'tool'), 'Hunger Potion');
  assert.equal(meta.getItemDustPrice('ReplenishPotion', 'tool'), 250);
  assert.equal(meta.getItemPrice('ReplenishPotion', 'tool'), 0);
  assert.equal(meta.getItemRarity('ReplenishPotion', 'tool'), 'rare');
});

test('tool-shop items filed under another Ariedam family resolve via the catalog', () => {
  assert.equal(meta.getItemName('DecorShed', 'tool'), 'Decor Shed');
  assert.equal(meta.getItemRarity('DecorShed', 'tool'), 'divine');
  assert.equal(meta.getItemPrice('DecorShed', 'tool'), 0);
  assert.equal(meta.getItemDustPrice('DecorShed', 'tool'), 10000);
  assert.equal(meta.getItemName('Mystery', 'tool'), 'Mystery');
});

test('catalog expiry: date, null when catalog has none, undefined when unknown', () => {
  assert.equal(meta.getItemExpiry('CarvingKnife'), Date.parse('2026-11-10T00:00:00.000Z'));
  assert.equal(meta.getItemExpiry('Carrot'), null);
  assert.equal(meta.getItemExpiry('Mystery'), undefined);
});

test('no weather-shop fallback rows or lock badges before eligibility loads', () => {
  buildEligibility(null);
  assert.deepEqual(meta.mergeWeatherShopFallbackRows([]), []);
  assert.equal(meta.getRequiredWeather('SnowEgg'), null);
});
