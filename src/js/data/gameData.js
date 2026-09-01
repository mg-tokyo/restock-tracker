// Ariedam community API: /data (item catalog) and /live (current weather).
import { ARIEDAM_URL, TTL, KEYS } from '../config.js';
import { readEntry, writeEntry } from './cache.js';
import { requestJson } from './api.js';
import { canonicalWeatherId } from './weather.js';

// ---- eligibility (shop → item ids, item id → shops) ----

const shopToItems = new Map();
const itemToShops = new Map();
let eligibilityLoaded = false;

function addEligibility(itemId, shops) {
  if (!Array.isArray(shops)) return;
  const lower = shops.map((s) => String(s).toLowerCase());
  const existing = itemToShops.get(itemId) ?? [];
  for (const shop of lower) {
    if (!existing.includes(shop)) existing.push(shop);
    const list = shopToItems.get(shop) ?? [];
    if (!list.includes(itemId)) list.push(itemId);
    shopToItems.set(shop, list);
  }
  itemToShops.set(itemId, existing);
}

export function buildEligibility(gameData) {
  shopToItems.clear();
  itemToShops.clear();
  eligibilityLoaded = false;
  if (!gameData || typeof gameData !== 'object') return;
  for (const [id, plant] of Object.entries(gameData.plants ?? {})) addEligibility(id, plant?.seed?.eligibleShops);
  for (const family of ['eggs', 'items', 'decor']) {
    for (const [id, def] of Object.entries(gameData[family] ?? {})) addEligibility(id, def?.eligibleShops);
  }
  eligibilityLoaded = shopToItems.size > 0;
}

export function isEligibilityLoaded() { return eligibilityLoaded; }
export function getShopEligibleItemIds(shopId) { return shopToItems.get(String(shopId).toLowerCase()) ?? []; }
export function getItemEligibleShops(itemId) { return itemToShops.get(itemId) ?? []; }

// ---- /data ----

let gameDataPromise = null;

export function loadGameData() {
  if (gameDataPromise) return gameDataPromise;
  gameDataPromise = (async () => {
    const cached = readEntry(KEYS.gameData, TTL.gameData);
    if (cached?.data && !cached.stale) {
      buildEligibility(cached.data);
      return cached.data;
    }
    try {
      const data = await requestJson(`${ARIEDAM_URL}/data`, { retries: 1, timeoutMs: 10_000 });
      writeEntry(KEYS.gameData, data);
      buildEligibility(data);
      return data;
    } catch {
      if (cached?.data) { buildEligibility(cached.data); return cached.data; }
      return null;
    } finally {
      gameDataPromise = null;
    }
  })();
  return gameDataPromise;
}

// ---- /live weather ----

let currentWeather = null;
const listeners = new Set();

export function getCurrentWeather() { return currentWeather; }

export function onWeatherChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function setWeather(next) {
  if (next === currentWeather) return;
  currentWeather = next;
  for (const cb of listeners) { try { cb(next); } catch { /* listener error */ } }
}

export async function refreshLiveWeather({ force = false } = {}) {
  const cached = readEntry(KEYS.live, TTL.live);
  if (!force && cached && !cached.stale) {
    setWeather(canonicalWeatherId(cached.data));
    return currentWeather;
  }
  try {
    const live = await requestJson(`${ARIEDAM_URL}/live`, { retries: 0, timeoutMs: 5_000 });
    const raw = typeof live?.weather === 'string' ? live.weather : null;
    writeEntry(KEYS.live, raw);
    setWeather(canonicalWeatherId(raw));
  } catch {
    if (cached) setWeather(canonicalWeatherId(cached.data));
  }
  return currentWeather;
}

/** Polls /live every intervalMs while the tab is visible. Returns a stop function. */
export function startLiveWeatherPolling(intervalMs = TTL.live) {
  const tick = () => { if (typeof document === 'undefined' || !document.hidden) void refreshLiveWeather(); };
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}
