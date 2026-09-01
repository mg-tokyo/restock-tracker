// Item metadata (names, rarity, prices, sprites, catalog order) and fallback rows.
import { ARIEDAM_URL } from '../config.js';
import { getItemIdVariants, makeEmptyRestockRow } from './parser.js';
import { STANDARD_SHOP_TYPES, isWeatherShopType, getWeatherShopIds, getShopWeatherKind } from './registry.js';
import { WEATHER_RARITY, getWeatherIconUrl } from './weather.js';
import { CELESTIAL_IDS } from './constants.js';
import { getShopEligibleItemIds, getItemEligibleShops, isEligibilityLoaded } from './gameData.js';

const itemMetaCache = new Map();   // "shop:item" → { name, rarity, price, priceMagicDust?, spriteUrl }
const itemCatalogOrder = new Map(); // "shop:item" → index within family

const str = (v, fallback) => (typeof v === 'string' && v.trim() ? v : fallback);
const sprite = (def) => (typeof def?.sprite === 'string' ? def.sprite : null);

export function buildItemMetaCache(gameData) {
  itemMetaCache.clear();
  itemCatalogOrder.clear();
  if (!gameData || typeof gameData !== 'object') return;
  let order = 0;
  for (const [id, plant] of Object.entries(gameData.plants ?? {})) {
    const seed = plant?.seed;
    if (!seed) continue;
    itemMetaCache.set(`seed:${id}`, {
      name: str(seed.name, `${id} Seed`), rarity: String(seed.rarity ?? 'common').toLowerCase(),
      price: Number(seed.coinPrice ?? 0), spriteUrl: sprite(seed),
    });
    itemCatalogOrder.set(`seed:${id}`, order++);
  }
  order = 0;
  for (const [id, egg] of Object.entries(gameData.eggs ?? {})) {
    itemMetaCache.set(`egg:${id}`, {
      name: str(egg?.name, id), rarity: String(egg?.rarity ?? 'common').toLowerCase(),
      price: Number(egg?.coinPrice ?? 0), spriteUrl: sprite(egg),
    });
    itemCatalogOrder.set(`egg:${id}`, order++);
  }
  order = 0;
  for (const [id, decor] of Object.entries(gameData.decor ?? {})) {
    itemMetaCache.set(`decor:${id}`, {
      name: str(decor?.name, id), rarity: String(decor?.rarity ?? 'common').toLowerCase(),
      price: Number(decor?.coinPrice ?? 0), spriteUrl: sprite(decor),
    });
    itemCatalogOrder.set(`decor:${id}`, order++);
  }
  order = 0;
  for (const [id, item] of Object.entries(gameData.items ?? {})) {
    const coin = Number(item?.coinPrice);
    const dust = Number(item?.magicDustPrice);
    const hasCoin = Number.isFinite(coin) && coin > 0 && coin < 1_000_000_000; // sentinel prices = not coin-purchasable
    const hasDust = Number.isFinite(dust) && dust > 0;
    if (!hasCoin && !hasDust) continue; // non-shop items (mutation potions, DawnCapsule)
    itemMetaCache.set(`tool:${id}`, {
      name: str(item?.name, id), rarity: String(item?.rarity ?? 'common').toLowerCase(),
      price: hasCoin ? coin : 0, ...(hasDust ? { priceMagicDust: dust } : {}), spriteUrl: sprite(item),
    });
    itemCatalogOrder.set(`tool:${id}`, order++);
  }
}

const FAMILIES = ['seed', 'egg', 'tool', 'decor'];

function lookup(map, itemId, shopType) {
  const direct = map.get(`${shopType}:${itemId}`);
  if (direct !== undefined) return direct;
  if (!isWeatherShopType(shopType)) return undefined;
  for (const fam of FAMILIES) {
    const v = map.get(`${fam}:${itemId}`);
    if (v !== undefined) return v;
  }
  return undefined;
}

export function getItemMeta(itemId, shopType) {
  return lookup(itemMetaCache, itemId, shopType) ?? null;
}

export function humanizeId(id) {
  return String(id ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getItemName(itemId, shopType) {
  if (shopType === 'weather') return humanizeId(itemId);
  return getItemMeta(itemId, shopType)?.name ?? humanizeId(itemId);
}

export function getItemRarity(itemId, shopType) {
  if (shopType === 'weather') return WEATHER_RARITY[itemId] ?? 'common';
  return getItemMeta(itemId, shopType)?.rarity ?? 'common';
}

export function getItemPrice(itemId, shopType) {
  if (shopType === 'weather') return 0;
  return getItemMeta(itemId, shopType)?.price ?? 0;
}

export function getItemDustPrice(itemId, shopType) {
  if (shopType === 'weather') return 0;
  return getItemMeta(itemId, shopType)?.priceMagicDust ?? 0;
}

export function getCatalogOrder(itemId, shopType) {
  const order = lookup(itemCatalogOrder, itemId, shopType);
  return Number.isFinite(order) ? order : null;
}

export function isCelestial(itemId) {
  if (!itemId) return false;
  if (CELESTIAL_IDS.has(itemId)) return true;
  for (const fam of FAMILIES) {
    if (itemMetaCache.get(`${fam}:${itemId}`)?.rarity === 'celestial') return true;
  }
  return false;
}

// Offline fallback when the Ariedam catalog is unavailable.
const WEATHER_LOCK_FALLBACK = { SnowEgg: 'Snow', DawnEgg: 'Dawn', ThunderEgg: 'Thunderstorm' };

/** Weather an item is locked behind: its weather shop's kind, unless a standard shop also sells it. */
export function getRequiredWeather(itemId) {
  const shops = getItemEligibleShops(itemId);
  if (shops.length > 0) {
    if (shops.some((s) => STANDARD_SHOP_TYPES.has(s))) return null;
    for (const s of shops) {
      const kind = getShopWeatherKind(s);
      if (kind) return kind;
    }
    return null;
  }
  return isEligibilityLoaded() ? null : (WEATHER_LOCK_FALLBACK[itemId] ?? null);
}

// ---- fallback rows ----

function toolCatalogIds() {
  const ids = new Set();
  if (isEligibilityLoaded()) for (const id of getShopEligibleItemIds('tool')) ids.add(id);
  for (const k of itemMetaCache.keys()) if (k.startsWith('tool:')) ids.add(k.slice(5));
  return Array.from(ids);
}

/** Adds an empty row for every catalog tool the API has not seen yet. */
export function mergeToolFallbackRows(items) {
  const ids = toolCatalogIds();
  if (!ids.length) return items;
  const existing = new Set(items.filter((r) => r.shop_type === 'tool').map((r) => r.item_id));
  const merged = items.slice();
  for (const id of ids) if (!existing.has(id)) merged.push(makeEmptyRestockRow(id, 'tool'));
  return merged;
}

const WEATHER_SHOP_FALLBACK_ITEM_IDS = {
  dawn: ['Daisy', 'Lavender', 'Saffron', 'Eggplant', 'Ube', 'Dawnbreaker', 'DawnCelestial', 'DawnEgg'],
  snow: ['Snowdrop', 'Leek', 'PineTree', 'Squash', 'Poinsettia', 'SnowEgg', 'ChilledPotion', 'FrozenPotion',
    'WoodCaribou', 'StoneCaribou', 'MarbleCaribou', 'ColoredStringLights'],
};

/** Adds an empty row for every item a registry weather shop can carry. */
export function mergeWeatherShopFallbackRows(items) {
  const loaded = isEligibilityLoaded();
  const shopIds = loaded ? getWeatherShopIds() : Object.keys(WEATHER_SHOP_FALLBACK_ITEM_IDS);
  let merged = null;
  for (const shop of shopIds) {
    const ids = loaded ? getShopEligibleItemIds(shop) : (WEATHER_SHOP_FALLBACK_ITEM_IDS[shop] ?? []);
    if (!ids.length) continue;
    const existing = new Set(items.filter((r) => r.shop_type === shop).map((r) => r.item_id));
    for (const id of ids) {
      if (existing.has(id)) continue;
      (merged ??= items.slice()).push(makeEmptyRestockRow(id, shop));
    }
  }
  return merged ?? items;
}

// ---- sprites ----

const spriteUrlCache = new Map();

export function getSpriteUrl(item) {
  const id = item?.item_id;
  if (!id) return null;
  const shop = item.shop_type;
  if (shop === 'weather') return getWeatherIconUrl(id);
  const key = `${shop}:${id}`;
  if (spriteUrlCache.has(key)) return spriteUrlCache.get(key);
  let url = null;
  for (const variant of getItemIdVariants(shop, id)) {
    url = getItemMeta(variant, shop)?.spriteUrl ?? null;
    if (url) break;
  }
  if (!url && shop === 'decor') url = `./decor-sprites/${encodeURIComponent(id)}.png`;
  if (!url && shop === 'tool') {
    const normalized = id.endsWith('s') && id.length > 1 ? id.slice(0, -1) : id;
    url = `${ARIEDAM_URL}/assets/sprites/items/${encodeURIComponent(normalized)}.png`;
  }
  spriteUrlCache.set(key, url);
  return url;
}

export function clearSpriteUrlCache() { spriteUrlCache.clear(); }
