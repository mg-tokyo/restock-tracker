// Supabase REST access with TTL caching, extended-column autodetect and retry.
import { SUPABASE_URL, SUPABASE_KEY, TTL, KEYS, FETCH_TIMEOUT_MS, MAX_RETRIES, RETRY_DELAYS_MS } from '../config.js';
import { readEntry, writeEntry, readRaw, writeRaw } from './cache.js';
import { normalizeRestockItem, deduplicateItems, extractItemsArray } from './parser.js';
import { isAllowedShopType, setRegistry } from './registry.js';
import { normalizeWeatherPrediction } from './weather.js';
import { getRefreshBudget, tryConsumeRefresh } from './budget.js';

export const RESTOCK_COLUMNS = [
  'item_id', 'shop_type', 'current_probability', 'base_rate', 'estimated_next_timestamp',
  'median_interval_ms', 'expected_interval_ms', 'last_seen', 'average_quantity', 'total_quantity',
  'total_occurrences', 'algorithm_version', 'algorithm_updated_at_ms', 'current_weather',
  'weather_baseline_ms', 'weather_samples', 'weather_used', 'weather_rejected_reason',
];
export const RESTOCK_EXTENDED_COLUMNS = [
  ...RESTOCK_COLUMNS,
  'recent_intervals_ms', 'empirical_weight', 'empirical_probability', 'fallback_rate',
  'baseline_interval_ms', 'ema_interval_ms', 'weather_intervals', 'is_dormant',
];
const WEATHER_COLUMNS = [
  'weather_id', 'total_occurrences', 'last_seen', 'average_interval_ms',
  'estimated_next_timestamp', 'appearance_rate', 'duration_ms',
];

const RESTOCK_URL = `${SUPABASE_URL}/restock_predictions_mat?select=${RESTOCK_COLUMNS.join(',')}`;
const RESTOCK_URL_EXTENDED = `${SUPABASE_URL}/restock_predictions_mat?select=${RESTOCK_EXTENDED_COLUMNS.join(',')}`;
const WEATHER_URL = `${SUPABASE_URL}/weather_predictions?select=${WEATHER_COLUMNS.join(',')}`;
const REGISTRY_URL = `${SUPABASE_URL}/shop_type_registry?select=shop_type,cycle_interval_ms,is_active,config`;

const SUPABASE_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  // Tool label for Supabase API-log usage counts (Gemini-server `npm run usage`).
  'x-client-info': 'restock-tracker',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET JSON with per-attempt timeout; retries on 5xx/timeout only. Throws Error with .status. */
export async function requestJson(url, opts = {}) {
  const {
    headers = {}, timeoutMs = FETCH_TIMEOUT_MS, retries = MAX_RETRIES,
    retryDelaysMs = RETRY_DELAYS_MS, onRetry = null,
  } = opts;
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return await res.json();
      const text = await res.text().catch(() => '');
      const err = new Error(`HTTP ${res.status}${text ? `: ${text.slice(0, 160)}` : ''}`);
      err.status = res.status;
      if (res.status < 500) throw err;
      lastError = err;
    } catch (err) {
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      const isServer = typeof err?.status === 'number' && err.status >= 500;
      const isNetwork = err instanceof TypeError; // fetch network failure
      if (!isTimeout && !isServer && !isNetwork) throw err;
      lastError = err;
    }
    if (attempt < retries) {
      onRetry?.(attempt + 1, retries);
      await sleep(retryDelaysMs[attempt] ?? retryDelaysMs[retryDelaysMs.length - 1] ?? 0);
    }
  }
  throw lastError ?? new Error('request failed');
}

function sanitizeItems(items) {
  return deduplicateItems(items.filter((i) => !!i.item_id && isAllowedShopType(i.shop_type)));
}

export function getRestockCacheEntry() {
  const e = readEntry(KEYS.cache, TTL.cache);
  return e && Array.isArray(e.data) ? e : null;
}

// ---- registry ----

export async function loadRegistry() {
  const cached = readEntry(KEYS.registry, TTL.registry);
  if (cached && !cached.stale && Array.isArray(cached.data) && cached.data.length) {
    setRegistry(cached.data);
    return cached.data;
  }
  try {
    const rows = await requestJson(REGISTRY_URL, { headers: SUPABASE_HEADERS, retries: 1 });
    if (Array.isArray(rows) && rows.length) {
      writeEntry(KEYS.registry, rows);
      setRegistry(rows);
      return rows;
    }
  } catch { /* fall through */ }
  if (cached?.data?.length) { setRegistry(cached.data); return cached.data; }
  setRegistry(null);
  return null;
}

// ---- restock predictions ----

let inflight = null;

function readExtendedFlag() {
  const v = readRaw(KEYS.extended);
  return typeof v === 'boolean' ? v : null;
}

async function fetchRestockRows(onRetry, retryDelaysMs) {
  let supportsExtended = readExtendedFlag();
  if (supportsExtended !== false) {
    try {
      const raw = await requestJson(RESTOCK_URL_EXTENDED, { headers: SUPABASE_HEADERS, onRetry, retryDelaysMs });
      const items = extractItemsArray(raw);
      if (items) {
        if (supportsExtended === null) writeRaw(KEYS.extended, true);
        return items;
      }
    } catch (err) {
      if (err?.status && err.status < 500) writeRaw(KEYS.extended, false);
      else throw err;
    }
  }
  const raw = await requestJson(RESTOCK_URL, { headers: SUPABASE_HEADERS, onRetry, retryDelaysMs });
  const items = extractItemsArray(raw);
  if (!items) throw new Error('Unexpected response shape');
  return items;
}

/**
 * Returns { items, fetchedAt, fromCache, error? }.
 * Non-force: cache if fresh, else network (no budget). Force: consumes budget; refused when blocked.
 */
export async function loadRestockItems({ force = false, onRetry = null, retryDelaysMs = RETRY_DELAYS_MS } = {}) {
  const cached = getRestockCacheEntry();
  const cachedResult = cached ? { items: sanitizeItems(cached.data), fetchedAt: cached.timestamp, fromCache: true } : null;
  if (!force && cachedResult && !cached.stale && cachedResult.items.length > 0) return cachedResult;
  if (force && getRefreshBudget().blocked && cachedResult) return cachedResult;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const rawItems = await fetchRestockRows(onRetry, retryDelaysMs);
      const items = sanitizeItems(rawItems.map((r) => normalizeRestockItem(r)));
      if (force) tryConsumeRefresh();
      writeEntry(KEYS.cache, items);
      return { items, fetchedAt: Date.now(), fromCache: false };
    } catch (err) {
      if (cachedResult) return { ...cachedResult, error: err };
      throw err;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// ---- weather predictions ----

export async function loadWeatherPredictions({ force = false } = {}) {
  const cached = readEntry(KEYS.weather, TTL.weather);
  const cachedList = cached && Array.isArray(cached.data) ? cached.data : null;
  if (!force && cachedList && !cached.stale) return cachedList;
  try {
    const raw = await requestJson(WEATHER_URL, { headers: SUPABASE_HEADERS, retries: 1, timeoutMs: 10_000 });
    const list = (Array.isArray(raw) ? raw : []).map(normalizeWeatherPrediction).filter(Boolean);
    writeEntry(KEYS.weather, list);
    return list;
  } catch {
    return cachedList ?? [];
  }
}
