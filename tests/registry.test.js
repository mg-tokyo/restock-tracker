import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as reg from '../src/js/data/registry.js';

beforeEach(() => reg.setRegistry(null));

test('fallback registry exposes standard + weather shops', () => {
  assert.deepEqual(reg.getWeatherShopIds(), ['dawn', 'snow', 'thunder', 'rain', 'spooky', 'amber']);
  assert.equal(reg.isAllowedShopType('tool'), true);
  assert.equal(reg.isAllowedShopType('weather'), true);
  assert.equal(reg.isAllowedShopType('apology'), false);
  assert.equal(reg.getShopCycleInterval('egg'), 900000);
  assert.equal(reg.getShopCycleInterval('weather'), 0);
  assert.equal(reg.getShopWeatherKind('snow'), 'Snow');
  assert.equal(reg.getShopWeatherKind('amber'), 'AmberMoon');
  assert.equal(reg.getShopWeatherKind('seed'), null);
  assert.equal(reg.getShopCycleInterval('spooky'), 1800000);
  assert.equal(reg.getShopWeatherKind('spooky'), null);
  assert.equal(reg.isWeatherShopType('dawn'), true);
  assert.equal(reg.isWeatherShopType('seed'), false);
});

test('setRegistry replaces with active rows and reads weather_gated', () => {
  reg.setRegistry([
    { shop_type: 'seed', cycle_interval_ms: 300000, is_active: true, config: {} },
    { shop_type: 'snow', cycle_interval_ms: 300000, is_active: true, config: { weather_gated: 'Frost' } },
    { shop_type: 'fog', cycle_interval_ms: 600000, is_active: true, config: {} },
    { shop_type: 'old', cycle_interval_ms: 600000, is_active: false, config: {} },
  ]);
  assert.deepEqual(reg.getWeatherShopIds(), ['snow', 'fog']);
  assert.equal(reg.isAllowedShopType('old'), false);
  assert.equal(reg.getShopWeatherKind('snow'), 'Snow');
  assert.equal(reg.getShopWeatherKind('fog'), null);
  assert.equal(reg.getShopCycleInterval('fog'), 600000);
});
