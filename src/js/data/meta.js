// Item metadata (names, rarity, prices, sprites, catalog order) and fallback rows.
import { ARIEDAM_URL } from '../config.js';
import { getItemIdVariants, makeEmptyRestockRow } from './parser.js';
import { STANDARD_SHOP_TYPES, isWeatherShopType, getWeatherShopIds, getShopWeatherKind } from './registry.js';
import { WEATHER_RARITY, getWeatherIconUrl } from './weather.js';
import { CELESTIAL_IDS } from './constants.js';
import { getShopEligibleItemIds, getItemEligibleShops, isEligibilityLoaded } from './gameData.js';

const itemMetaCache = new Map();   // "shop:item" → { name, rarity, price, priceMagicDust?, spriteUrl }
const itemCatalogOrder = new Map(); // "shop:item" → index within family
// Family-agnostic catalog view keyed by bare id (site equivalent of QPM-GR getCatalogItemMeta):
// id → { name, rarity, price, priceMagicDust?, spriteUrl, expiryMs }. First family wins: plant, egg, item, decor.
const catalogMeta = new Map();

const str = (v, fallback) => (typeof v === 'string' && v.trim() ? v : fallback);
const sprite = (def) => (typeof def?.sprite === 'string' ? def.sprite : null);
// Ariedam names the field `dustPrice`; `magicDustPrice` kept for parity with QPM-GR getItemCatalogPricing.
const dustOf = (def) => Number(def?.magicDustPrice ?? def?.dustPrice);
const isCoinPrice = (n) => Number.isFinite(n) && n > 0 && n < 1_000_000_000; // sentinel prices = not coin-purchasable

function toExpiryMs(v) {
  if (typeof v !== 'string' || !v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

function addCatalogMeta(id, def) {
  if (!def || typeof def !== 'object' || catalogMeta.has(id)) return;
  const coin = Number(def.coinPrice);
  const dust = dustOf(def);
  catalogMeta.set(id, {
    name: str(def.name, id), rarity: String(def.rarity ?? 'common').toLowerCase(),
    price: isCoinPrice(coin) ? coin : 0, ...(Number.isFinite(dust) && dust > 0 ? { priceMagicDust: dust } : {}),
    spriteUrl: sprite(def), expiryMs: toExpiryMs(def.expiryDate),
  });
}

export function buildItemMetaCache(gameData) {
  itemMetaCache.clear();
  itemCatalogOrder.clear();
  catalogMeta.clear();
  // Sprite URLs derive from itemMetaCache; drop cached null entries from any renders that ran
  // before this cache was populated (e.g. restock predictions arriving before Ariedam /data).
  spriteUrlCache.clear();
  if (!gameData || typeof gameData !== 'object') return;
  let order = 0;
  for (const [id, plant] of Object.entries(gameData.plants ?? {})) {
    const seed = plant?.seed;
    if (!seed) continue;
    addCatalogMeta(id, seed);
    itemMetaCache.set(`seed:${id}`, {
      name: str(seed.name, `${id} Seed`), rarity: String(seed.rarity ?? 'common').toLowerCase(),
      price: Number(seed.coinPrice ?? 0), spriteUrl: sprite(seed),
    });
    itemCatalogOrder.set(`seed:${id}`, order++);
  }
  order = 0;
  for (const [id, egg] of Object.entries(gameData.eggs ?? {})) {
    addCatalogMeta(id, egg);
    itemMetaCache.set(`egg:${id}`, {
      name: str(egg?.name, id), rarity: String(egg?.rarity ?? 'common').toLowerCase(),
      price: Number(egg?.coinPrice ?? 0), spriteUrl: sprite(egg),
    });
    itemCatalogOrder.set(`egg:${id}`, order++);
  }
  order = 0;
  for (const [id, decor] of Object.entries(gameData.decor ?? {})) {
    addCatalogMeta(id, decor);
    itemMetaCache.set(`decor:${id}`, {
      name: str(decor?.name, id), rarity: String(decor?.rarity ?? 'common').toLowerCase(),
      price: Number(decor?.coinPrice ?? 0), spriteUrl: sprite(decor),
    });
    itemCatalogOrder.set(`decor:${id}`, order++);
  }
  order = 0;
  for (const [id, item] of Object.entries(gameData.items ?? {})) {
    addCatalogMeta(id, item);
    const coin = Number(item?.coinPrice);
    const dust = dustOf(item);
    const hasCoin = isCoinPrice(coin);
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

/**
 * Port of QPM-GR restockWindowMeta getItemMeta: shop-family meta first; the family-agnostic catalog
 * covers ids the shop's family lacks (e.g. Tool Shack sells DecorShed, filed under decor) or names by raw id.
 */
export function getItemMeta(itemId, shopType) {
  const direct = lookup(itemMetaCache, itemId, shopType) ?? null;
  if (direct && direct.name !== itemId) return direct;
  const catalog = catalogMeta.get(itemId);
  if (!catalog) return direct;
  return direct ? { ...direct, name: catalog.name } : catalog;
}

/** Catalog expiry in ms, null when the catalog lists the id without one, undefined when the id is unknown. */
export function getItemExpiry(itemId) {
  const entry = catalogMeta.get(itemId);
  return entry ? entry.expiryMs : undefined;
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
  return catalogMeta.get(itemId)?.rarity === 'celestial';
}

/** Weather an item is locked behind: its weather shop's kind, unless a standard shop also sells it. */
export function getRequiredWeather(itemId) {
  const shops = getItemEligibleShops(itemId);
  if (shops.length === 0) return null;
  if (shops.some((s) => STANDARD_SHOP_TYPES.has(s))) return null;
  for (const s of shops) {
    const kind = getShopWeatherKind(s);
    if (kind) return kind;
  }
  return null;
}

// ---- fallback rows ----

/** Tool shop membership from eligibleShops; priced Ariedam items only when eligibility is unavailable. */
function toolCatalogIds() {
  if (isEligibilityLoaded()) return getShopEligibleItemIds('tool');
  return Array.from(itemMetaCache.keys()).filter((k) => k.startsWith('tool:')).map((k) => k.slice(5));
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

/** Adds an empty row for every item a registry weather shop can carry. Server rows only until eligibility loads. */
export function mergeWeatherShopFallbackRows(items) {
  if (!isEligibilityLoaded()) return items;
  let merged = null;
  for (const shop of getWeatherShopIds()) {
    const ids = getShopEligibleItemIds(shop);
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
  // Shop and catalog family diverge for cross-shop items (e.g. Tool Shack sells DecorShed,
  // which lives under `decor` in the catalog). Fall through to any family's sprite for this id.
  if (!url) url = catalogMeta.get(id)?.spriteUrl ?? null;
  if (!url && shop === 'decor') url = `./decor-sprites/${encodeURIComponent(id)}.png`;
  if (!url && shop === 'tool') {
    const normalized = id.endsWith('s') && id.length > 1 ? id.slice(0, -1) : id;
    url = `${ARIEDAM_URL}/assets/sprites/items/${encodeURIComponent(normalized)}.png`;
  }
  spriteUrlCache.set(key, url);
  return url;
}

export function clearSpriteUrlCache() { spriteUrlCache.clear(); }
