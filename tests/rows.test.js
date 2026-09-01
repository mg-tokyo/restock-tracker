import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './helpers/fakeDom.js';
import { installMemoryStorage } from './helpers/memoryStorage.js';
import { installMockFetch } from './helpers/mockFetch.js';

let rows, meta, gd;
const DATA = {
  plants: { Daisy: { seed: { name: 'Daisy Seed', rarity: 'Uncommon', coinPrice: 50, sprite: 'https://x/Daisy.png', eligibleShops: ['Dawn'] } },
            Carrot: { seed: { name: 'Carrot Seed', rarity: 'Common', coinPrice: 10, sprite: 'https://x/Carrot.png', eligibleShops: ['Seed'] } } },
  eggs: {}, decor: {},
  items: { XPShard: { name: 'XP Shard', rarity: 'Rare', magicDustPrice: 30, sprite: 'https://x/XPShard.png', eligibleShops: ['Amber'] } },
};

before(async () => {
  installFakeDom();
  installMemoryStorage();
  installMockFetch({ '/live': { body: { weather: 'Dawn' } } });
  gd = await import('../src/js/data/gameData.js');
  meta = await import('../src/js/data/meta.js');
  gd.buildEligibility(DATA);
  meta.buildItemMetaCache(DATA);
  await gd.refreshLiveWeather({ force: true });
  rows = await import('../src/js/ui/rows.js');
});

const base = (o) => ({ item_id: 'Carrot', shop_type: 'seed', current_probability: 0.8, appearance_rate: null, estimated_next_timestamp: Date.now() + 120000,
  last_seen: Date.now() - 60000, average_quantity: 2, total_quantity: 20, total_occurrences: 10, is_dormant: null, ...o });

test('pred row shows ETA, rate and unpins', () => {
  let unpinned = null;
  const { row, etaRef } = rows.buildPredRow(base({}), 'seed:Carrot', { onUnpin: (k) => { unpinned = k; } });
  assert.equal(row.find('restock-item-name').textContent, 'Carrot Seed');
  assert.equal(etaRef.el.textContent, '~2m');
  assert.ok(etaRef.el.classList.contains('restock-eta-imminent'));
  const vals = row.querySelectorAll('.restock-pred-metric-value');
  assert.equal(vals[1].textContent, '80.0%');
  assert.ok(vals[1].classList.contains('restock-rate-high'));
  row.find('unpin-btn').click();
  assert.equal(unpinned, 'seed:Carrot');
});

test('pred row with <2 sightings shows -- and no etaRef; dormant shows Seasonal', () => {
  const r1 = rows.buildPredRow(base({ total_occurrences: 1 }), 'seed:Carrot', { onUnpin() {} });
  assert.equal(r1.etaRef, null);
  assert.equal(r1.row.find('restock-nodata').textContent, '--');
  assert.equal(r1.row.find('restock-pred-line2').textContent, '1 sighting recorded');
  const r2 = rows.buildPredRow(base({ is_dormant: true }), 'seed:Carrot', { onUnpin() {} });
  assert.equal(r2.etaRef, null);
  assert.equal(r2.row.find('restock-seasonal').textContent, 'Seasonal');
  assert.ok(r2.row.classList.contains('is-dormant'));
});

test('weather badge reflects live weather; refresh updates it', () => {
  const badge = rows.makeWeatherBadge('Daisy');
  assert.equal(badge.dataset.weather, 'Dawn');
  assert.equal(badge.textContent, 'Dawn ACTIVE');
  assert.ok(badge.classList.contains('is-active'));
  assert.equal(rows.makeWeatherBadge('Carrot'), null);
  const wrap = document.createElement('div'); wrap.appendChild(badge);
  installMockFetch({ '/live': { body: { weather: 'Clear Skies' } } });
  return gd.refreshLiveWeather({ force: true }).then(() => {
    rows.refreshWeatherBadges(wrap);
    assert.equal(badge.textContent, 'Dawn only');
    assert.ok(!badge.classList.contains('is-active'));
  });
});

test('hist row: price, dust, qty, seen, pin', () => {
  let pinned = null;
  const tr = rows.buildHistRow(base({ item_id: 'XPShard', shop_type: 'tool', average_quantity: 1.5 }), 'tool:XPShard', { onPin: (k) => { pinned = k; } });
  assert.equal(tr.find('restock-item-name').textContent, 'XP Shard');
  assert.equal(tr.find('restock-price-wrap'), null);
  assert.ok(tr.find('restock-dust-wrap').textContent.includes('30'));
  assert.equal(tr.find('restock-shop-label').textContent, 'Tools');
  assert.equal(tr.children[2].textContent, '1.5');
  tr.click();
  assert.equal(pinned, 'tool:XPShard');
});
