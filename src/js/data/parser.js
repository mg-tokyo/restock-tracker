// Parsing, normalisation and deduplication for restock rows. Pure functions.

const ITEM_ID_ALIASES = {
  'seed:Dawnbinder': 'DawnCelestial',
  'seed:DawnbinderPod': 'DawnCelestial',
  'seed:Moonbinder': 'MoonCelestial',
  'seed:MoonbinderPod': 'MoonCelestial',
  'seed:StarweaverPod': 'Starweaver',
  'dawn:Dawnbinder': 'DawnCelestial',
  'dawn:DawnbinderPod': 'DawnCelestial',
  'dawn:Moonbinder': 'MoonCelestial',
  'dawn:MoonbinderPod': 'MoonCelestial',
  'dawn:StarweaverPod': 'Starweaver',
};

export function canonicalItemId(shopType, itemId) {
  return ITEM_ID_ALIASES[`${shopType}:${itemId}`] ?? itemId;
}

export function getItemIdVariants(shopType, itemId) {
  const canonical = canonicalItemId(shopType, itemId);
  const variants = new Set([itemId, canonical]);
  for (const [key, target] of Object.entries(ITEM_ID_ALIASES)) {
    if (target === canonical && key.startsWith(`${shopType}:`)) variants.add(key.split(':')[1]);
  }
  return Array.from(variants);
}

// ---- coercion ----

export function toMs(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
    const d = new Date(v).getTime();
    if (Number.isFinite(d)) return d;
  }
  return null;
}

export function toMsDuration(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function toFloat(v) {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export function toBoolean(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1 ? true : v === 0 ? false : null;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === 't' || s === '1') return true;
    if (s === 'false' || s === 'f' || s === '0') return false;
  }
  return null;
}

function toNumberArray(v) {
  if (!Array.isArray(v)) return null;
  const out = [];
  for (const item of v) {
    const n = typeof item === 'number' ? item : Number(item);
    if (Number.isFinite(n)) out.push(n);
  }
  return out.length > 0 ? out : null;
}

function parseWeatherIntervals(v) {
  if (v == null || typeof v !== 'object' || Array.isArray(v)) return null;
  const result = {};
  let hasAny = false;
  for (const [key, val] of Object.entries(v)) {
    const arr = toNumberArray(val);
    if (key && arr) { result[key] = arr; hasAny = true; }
  }
  return hasAny ? result : null;
}

const strOrNull = (v) => (typeof v === 'string' ? v : null);

export function normalizeShopType(value) {
  const s = String(value ?? '').trim().toLowerCase();
  if (s === 'seeds') return 'seed';
  if (s === 'eggs') return 'egg';
  if (s === 'decors') return 'decor';
  if (s === 'tools') return 'tool';
  return s;
}

export function normalizeRestockItem(raw) {
  return {
    item_id: String(raw.item_id ?? raw.itemId ?? ''),
    shop_type: normalizeShopType(raw.shop_type ?? raw.shopType),
    current_probability: toFloat(raw.current_probability ?? raw.currentProbability),
    appearance_rate: toFloat(raw.appearance_rate ?? raw.appearanceRate ?? raw.base_rate ?? raw.baseRate),
    predicted_next_ms: toMs(raw.predicted_next_ms ?? raw.predictedNextMs),
    estimated_next_timestamp: toMs(raw.estimated_next_timestamp ?? raw.estimatedNextTimestamp),
    median_interval_ms: toMsDuration(
      raw.median_interval_ms ?? raw.medianIntervalMs ?? raw.expected_interval_ms ?? raw.expectedIntervalMs ?? raw.averageIntervalMs,
    ),
    last_seen: toMs(raw.last_seen ?? raw.lastSeen),
    average_quantity: toFloat(raw.average_quantity ?? raw.averageQuantity),
    total_quantity: toFloat(raw.total_quantity ?? raw.totalQuantity),
    total_occurrences: toFloat(raw.total_occurrences ?? raw.totalOccurrences),
    algorithm_version: strOrNull(raw.algorithm_version ?? raw.algorithmVersion),
    algorithm_updated_at: toMs(raw.algorithm_updated_at_ms ?? raw.algorithmUpdatedAtMs),
    recent_intervals_ms: toNumberArray(raw.recent_intervals_ms ?? raw.recentIntervalsMs),
    empirical_weight: toFloat(raw.empirical_weight ?? raw.empiricalWeight),
    empirical_probability: toFloat(raw.empirical_probability ?? raw.empiricalProbability),
    fallback_rate: toFloat(raw.fallback_rate ?? raw.fallbackRate),
    baseline_interval_ms: toMsDuration(raw.baseline_interval_ms ?? raw.baselineIntervalMs),
    ema_interval_ms: toMsDuration(raw.ema_interval_ms ?? raw.emaIntervalMs),
    weather_intervals: parseWeatherIntervals(raw.weather_intervals ?? raw.weatherIntervals),
    is_dormant: toBoolean(raw.is_dormant ?? raw.isDormant) || null,
    current_weather: strOrNull(raw.current_weather ?? raw.currentWeather),
    weather_baseline_ms: toMsDuration(raw.weather_baseline_ms ?? raw.weatherBaselineMs),
    weather_samples: toFloat(raw.weather_samples ?? raw.weatherSamples),
    weather_used: toBoolean(raw.weather_used ?? raw.weatherUsed),
    weather_rejected_reason: strOrNull(raw.weather_rejected_reason ?? raw.weatherRejectedReason),
  };
}

export function makeEmptyRestockRow(itemId, shopType) {
  return normalizeRestockItem({ item_id: itemId, shop_type: shopType });
}

export function getItemProbability(item) {
  return item.current_probability ?? item.appearance_rate ?? null;
}

// ---- dedup ----

const numOrNegInf = (v) => (v == null || !Number.isFinite(v) ? Number.NEGATIVE_INFINITY : v);

function pickPreferredRow(a, b) {
  const aLast = numOrNegInf(a.last_seen), bLast = numOrNegInf(b.last_seen);
  if (aLast !== bLast) return bLast > aLast ? b : a;
  const aOcc = numOrNegInf(a.total_occurrences), bOcc = numOrNegInf(b.total_occurrences);
  if (aOcc !== bOcc) return bOcc > aOcc ? b : a;
  return b;
}

const MAX_FIELDS = new Set(['total_quantity', 'total_occurrences']);

function mergeDuplicateItemRows(existing, incoming) {
  const preferred = pickPreferredRow(existing, incoming);
  const fallback = preferred === existing ? incoming : existing;
  const merged = {};
  for (const key of Object.keys(preferred)) {
    if (MAX_FIELDS.has(key) || key === 'last_seen' || key === 'algorithm_updated_at') {
      const m = Math.max(numOrNegInf(existing[key]), numOrNegInf(incoming[key]));
      merged[key] = Number.isFinite(m) ? m : null;
    } else {
      merged[key] = preferred[key] ?? fallback[key] ?? null;
    }
  }
  return merged;
}

export function deduplicateItems(items) {
  const map = new Map();
  for (const item of items) {
    const canonical = canonicalItemId(item.shop_type, item.item_id);
    const key = `${item.shop_type}:${canonical}`;
    const normalized = canonical !== item.item_id ? { ...item, item_id: canonical } : item;
    const existing = map.get(key);
    map.set(key, existing ? mergeDuplicateItemRows(existing, normalized) : normalized);
  }
  return Array.from(map.values());
}

// ---- envelope unwrapping (Supabase REST returns a bare array; envelopes kept for safety) ----

const ENVELOPE_KEYS = ['items', 'data', 'rows', 'results'];

export function extractItemsArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return null;
  for (const key of ENVELOPE_KEYS) {
    if (Array.isArray(raw[key])) return raw[key];
  }
  return null;
}
