import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalWeatherId, normalizeWeatherPrediction, weatherPredictionsAsRestockItems,
  WEATHER_RARITY, getWeatherIconUrl,
} from '../src/js/data/weather.js';

test('canonicalWeatherId resolves aliases and clear skies', () => {
  assert.equal(canonicalWeatherId('Frost'), 'Snow');
  assert.equal(canonicalWeatherId('Amber Moon'), 'AmberMoon');
  assert.equal(canonicalWeatherId('Thunder'), 'Thunderstorm');
  assert.equal(canonicalWeatherId('Clear Skies'), 'Sunny');
  assert.equal(canonicalWeatherId(''), null);
  assert.equal(canonicalWeatherId('Rain'), 'Rain');
});

test('per-cycle conversion matches QPM', () => {
  const day = 24 * 60 * 60 * 1000;
  const preds = [
    normalizeWeatherPrediction({ weather_id: 'Dawn', appearance_rate: 4.02, total_occurrences: 10, duration_ms: 600000 }),
    normalizeWeatherPrediction({ weather_id: 'Rain', appearance_rate: 2, total_occurrences: 5, duration_ms: 300000 }),
    normalizeWeatherPrediction({ weather_id: 'Snow', appearance_rate: 2, total_occurrences: 5, duration_ms: 300000 }),
    normalizeWeatherPrediction({ weather_id: 'Sunny', appearance_rate: 4, total_occurrences: 5, duration_ms: day / 8 }),
  ];
  const items = weatherPredictionsAsRestockItems(preds);
  const by = Object.fromEntries(items.map((i) => [i.item_id, i]));
  assert.ok(Math.abs(by.Dawn.appearance_rate - 0.67) < 0.001);
  assert.equal(by.Rain.appearance_rate, 0.5);
  assert.equal(by.Sunny.appearance_rate, 0.5);
  assert.equal(by.Rain.shop_type, 'weather');
  assert.equal(by.Rain.total_occurrences, 5);
  assert.equal(by.Rain.current_probability, null);
});

test('rarity + icon', () => {
  assert.equal(WEATHER_RARITY.Dawn, 'legendary');
  assert.equal(getWeatherIconUrl('Snow'), './weathericon/FrostIcon.png');
  assert.equal(getWeatherIconUrl('Dawn'), './weathericon/DawnIcon.png');
});
