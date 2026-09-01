// Static constants for the restock tracker (port of QPM restockWindowConstants.ts).
import { getWeatherShopIds } from './registry.js';

// Permanently hidden entries (stale/bad data).
export const ITEM_HIDDEN = new Set([
  'seed:StoneBirdbath',
  'seed:StoneGnome',
  'seed:WoodBirdhouse',
  'seed:WoodOwl',
]);

// Time-limited seasonal items — hidden after expiry. Key "shop:item", value ms UTC.
export const ITEM_EXPIRY = {
  'seed:PineTree':             1768179600000,
  'seed:Poinsettia':           1768179600000,
  'egg:WinterEgg':             1768179600000,
  'decor:Cauldron':            1762477200000,
  'decor:ColoredStringLights': 1768179600000,
  'decor:LargeGravestone':     1762477200000,
  'decor:MarbleCaribou':       1768179600000,
  'decor:MediumGravestone':    1762477200000,
  'decor:SmallGravestone':     1762477200000,
  'decor:StoneCaribou':        1768179600000,
  'decor:WoodCaribou':         1768179600000,
};

export function isHiddenOrExpired(shopType, itemId, now = Date.now()) {
  const key = `${shopType}:${itemId}`;
  if (ITEM_HIDDEN.has(key)) return true;
  const exp = ITEM_EXPIRY[key];
  return typeof exp === 'number' && exp <= now;
}

export const RARITY_COLORS = {
  common:    '#E7E7E7',
  uncommon:  '#67BD4D',
  rare:      '#0071C6',
  epic:      '#9944A7',
  legendary: '#FFC734',
  mythic:    '#9944A7',
  mythical:  '#9944A7',
  divine:    '#FF7835',
  celestial: '#FF00FF',
};

export const RARITY_GLOW = {
  legendary: '0 0 8px rgba(255,199,52,0.3)',
  mythic:    '0 0 10px rgba(153,68,167,0.4)',
  mythical:  '0 0 10px rgba(153,68,167,0.4)',
  epic:      '0 0 10px rgba(153,68,167,0.4)',
  divine:    '0 0 12px rgba(255,120,53,0.5)',
  celestial: '0 0 12px rgba(255,0,255,0.5)',
};

// Curated highlight set on top of catalog rarity "celestial".
export const CELESTIAL_IDS = new Set([
  'Starweaver', 'StarweaverPod',
  'Moonbinder', 'MoonbinderPod', 'MoonCelestial',
  'Dawnbinder', 'DawnbinderPod', 'DawnCelestial',
  'Dawnbreaker',
  'SunCelestial', 'MythicalEgg',
]);

export const SHOP_LABELS = {
  all: 'All', celestial: 'Celestial', seed: 'Seeds', egg: 'Eggs', decor: 'Decor', tool: 'Tools', weather: 'Weather',
};

export function shopLabel(shop) {
  return SHOP_LABELS[shop] ?? (shop.charAt(0).toUpperCase() + shop.slice(1));
}

const STANDARD_SHOP_ORDER = { seed: 0, egg: 1, decor: 2, tool: 3 };

/** Standard shops first, weather shops in registry order, weather events last. */
export function getShopOrder(shopType) {
  const standard = STANDARD_SHOP_ORDER[shopType];
  if (standard !== undefined) return standard;
  if (shopType === 'weather') return 99;
  const index = getWeatherShopIds().indexOf(shopType);
  return index >= 0 ? 10 + index : 98;
}

/** Fixed chips plus one per registry weather shop. */
export function getShopFilters() {
  const head = ['all', 'celestial', 'seed', 'egg', 'decor', 'tool'];
  const weatherShops = getWeatherShopIds();
  return [...head, ...weatherShops, 'weather'].map((value) => ({ value, label: shopLabel(value) }));
}

export const HISTORY_CHUNK_SIZE = 40;
export const SEARCH_DEBOUNCE_MS = 140;
export const UI_STATE_SAVE_DEBOUNCE_MS = 180;
export const ETA_TICK_MS = 30_000;
