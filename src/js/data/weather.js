// Weather identifiers and weather_predictions → RestockItem conversion (port of QPM dataService).
import { makeEmptyRestockRow, toFloat, toMs } from './parser.js';

export const WEATHER_IDS = ['Sunny', 'Rain', 'Snow', 'Thunderstorm', 'Dawn', 'AmberMoon'];

const ALIASES = {
  'Clear Skies': 'Sunny',
  Clear: 'Sunny',
  Frost: 'Snow',
  Thunder: 'Thunderstorm',
  Amber: 'AmberMoon',
  'Amber Moon': 'AmberMoon',
};

// Port of QPM restockWindowMeta.ts WEATHER_RARITY.
export const WEATHER_RARITY = {
  Dawn: 'legendary',
  AmberMoon: 'epic',
  Thunderstorm: 'rare',
  Snow: 'rare',
  Rain: 'uncommon',
  Sunny: 'common',
};

export function canonicalWeatherId(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  return ALIASES[s] ?? s;
}

/** Local icon file; Snow uses the game's Frost icon. */
export function getWeatherIconUrl(weatherId) {
  const file = weatherId === 'Snow' ? 'Frost' : weatherId;
  return `./weathericon/${file}Icon.png`;
}

export function normalizeWeatherPrediction(raw) {
  const id = canonicalWeatherId(raw?.weather_id);
  if (!id) return null;
  return {
    weather_id: id,
    total_occurrences: toFloat(raw.total_occurrences) ?? 0,
    last_seen: toMs(raw.last_seen),
    average_interval_ms: toFloat(raw.average_interval_ms),
    estimated_next_timestamp: toMs(raw.estimated_next_timestamp),
    appearance_rate: toFloat(raw.appearance_rate),
    duration_ms: toFloat(raw.duration_ms) ?? 0,
  };
}

const LUNAR_IDS = new Set(['Dawn', 'AmberMoon']);
const SUNNY_ID = 'Sunny';
const LUNAR_SLOTS_PER_DAY = 6; // every 4h UTC
const DAY_MS = 24 * 60 * 60 * 1000;

/** Convert rate_per_day into a per-cycle probability so ratePercent() matches wiki values. */
export function weatherPredictionsAsRestockItems(predictions) {
  const data = (predictions ?? []).filter(Boolean);
  if (data.length === 0) return [];
  const regularTotalRate = data
    .filter((wp) => !LUNAR_IDS.has(wp.weather_id) && wp.weather_id !== SUNNY_ID && wp.appearance_rate != null)
    .reduce((sum, wp) => sum + (wp.appearance_rate ?? 0), 0);

  return data.map((wp) => {
    let rate = null;
    if (wp.appearance_rate != null) {
      if (LUNAR_IDS.has(wp.weather_id)) rate = wp.appearance_rate / LUNAR_SLOTS_PER_DAY;
      else if (wp.weather_id === SUNNY_ID) rate = wp.duration_ms > 0 ? (wp.appearance_rate * wp.duration_ms) / DAY_MS : null;
      else if (regularTotalRate > 0) rate = wp.appearance_rate / regularTotalRate;
    }
    return {
      ...makeEmptyRestockRow(wp.weather_id, 'weather'),
      appearance_rate: rate,
      estimated_next_timestamp: wp.estimated_next_timestamp,
      median_interval_ms: wp.average_interval_ms,
      last_seen: wp.last_seen,
      total_quantity: wp.total_occurrences,
      total_occurrences: wp.total_occurrences,
    };
  });
}
