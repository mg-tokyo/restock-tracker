import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setRegistry } from '../src/js/data/registry.js';
import * as f from '../src/js/ui/formatters.js';

const now = Date.now();
const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;

test('formatETA and etaClass', () => {
  assert.equal(f.formatETA(null), '--');
  assert.equal(f.formatETA(now - 1000), 'Overdue');
  assert.equal(f.formatETA(now + 5 * MIN + 1000), '~6m');
  assert.equal(f.formatETA(now + 3 * HOUR + 1000), '~4h');
  assert.equal(f.formatETA(now + 2 * DAY + 1000), '~3d');
  assert.equal(f.etaClass(null), 'restock-eta-none');
  assert.equal(f.etaClass(now - 1), 'restock-eta-now');
  assert.equal(f.etaClass(now + 30 * MIN), 'restock-eta-imminent');
  assert.equal(f.etaClass(now + 3 * HOUR), 'restock-eta-soon');
  assert.equal(f.etaClass(now + 12 * HOUR), 'restock-eta-today');
  assert.equal(f.etaClass(now + 3 * DAY), 'restock-eta-week');
  assert.equal(f.etaClass(now + 10 * DAY), 'restock-eta-fortnight');
  assert.equal(f.etaClass(now + 20 * DAY), 'restock-eta-far');
});

test('ratePercent and rateClass', () => {
  assert.equal(f.ratePercent(null), '--');
  assert.equal(f.ratePercent(1), '100%');
  assert.equal(f.ratePercent(0), '0%');
  assert.equal(f.ratePercent(0.67), '67.0%');
  assert.equal(f.ratePercent(0.0523), '5.23%');
  assert.equal(f.ratePercent(0.00001), '< 0.01%');
  assert.equal(f.ratePercent(0.9999), '99.99%');
  assert.equal(f.rateClass(0.9), 'restock-rate-high');
  assert.equal(f.rateClass(0.5), 'restock-rate-mid');
  assert.equal(f.rateClass(0.1), 'restock-rate-low');
});

test('frequency, qty, price', () => {
  setRegistry(null);
  assert.equal(f.formatFrequency(0.5, 'seed'), 'Every ~10m');
  assert.equal(f.formatFrequency(0.02, 'egg'), 'Every ~13h');
  assert.equal(f.formatFrequency(0.96, 'seed'), 'Every restock');
  assert.equal(f.formatFrequency(0.5, 'weather'), '');
  assert.equal(f.formatAvgQty(2.34), '~2.3 avg');
  assert.equal(f.formatAvgQty(12), '~12 avg');
  assert.equal(f.formatAvgQty(0), '');
  assert.equal(f.formatPrice(950), '950');
  assert.equal(f.formatPrice(1500), '1.5K');
  assert.equal(f.formatPrice(2_500_000), '2.5M');
  assert.equal(f.formatPrice(12_000), '12K');
});

test('relative times and countdown', () => {
  assert.equal(f.formatRelative(now - 30 * MIN), '30m ago');
  assert.equal(f.formatRelative(now - 5 * HOUR), '5h ago');
  assert.equal(f.formatRelative(now - 3 * DAY), '3d ago');
  assert.equal(f.formatRelative(now + 1000), 'just now');
  assert.equal(f.formatWindowCountdown(95 * MIN), '1hr 35min');
  assert.equal(f.formatUpdatedAgo(now - 10 * MIN), 'Updated 10m ago');
  assert.equal(f.formatUpdatedAgo(now), 'Updated now');
  assert.equal(f.formatUpdatedAgo(null), '');
  assert.equal(f.formatRelativeDay(now), null);
  assert.equal(typeof f.formatRelativeDay(now - 2 * DAY), 'string');
  assert.equal(f.rarityClass('Legendary'), 'rarity-legendary');
  assert.equal(f.rarityClass('mythic'), 'rarity-mythical');
  assert.equal(f.rarityClass('epic'), 'rarity-mythical');
  assert.ok(f.rarityBorderStyle('celestial').includes('#FF00FF'));
});
