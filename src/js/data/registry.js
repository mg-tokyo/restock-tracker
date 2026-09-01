// Shop-type registry state (from Supabase shop_type_registry) with a hardcoded fallback.

export const STANDARD_SHOP_TYPES = new Set(['seed', 'egg', 'decor', 'tool']);

// Snapshot of the live registry on 2026-09-01. Used until the network copy loads.
export const FALLBACK_REGISTRY = [
  { shop_type: 'seed',    cycle_interval_ms: 300000,  is_active: true, config: {} },
  { shop_type: 'egg',     cycle_interval_ms: 900000,  is_active: true, config: {} },
  { shop_type: 'decor',   cycle_interval_ms: 3600000, is_active: true, config: {} },
  { shop_type: 'tool',    cycle_interval_ms: 600000,  is_active: true, config: {} },
  { shop_type: 'dawn',    cycle_interval_ms: 300000,  is_active: true, config: { weather_gated: 'Dawn' } },
  { shop_type: 'snow',    cycle_interval_ms: 300000,  is_active: true, config: { weather_gated: 'Frost' } },
  { shop_type: 'thunder', cycle_interval_ms: 600000,  is_active: true, config: {} },
  { shop_type: 'amber',   cycle_interval_ms: 600000,  is_active: true, config: {} },
  { shop_type: 'rain',    cycle_interval_ms: 600000,  is_active: true, config: {} },
];

// Shop id → canonical weather id when the registry config lacks weather_gated.
const SHOP_WEATHER_FALLBACK = {
  dawn: 'Dawn', snow: 'Snow', thunder: 'Thunderstorm', amber: 'AmberMoon', rain: 'Rain',
};
const GATE_ALIASES = { Frost: 'Snow', Thunder: 'Thunderstorm', Amber: 'AmberMoon', 'Amber Moon': 'AmberMoon' };

let rows = normalize(FALLBACK_REGISTRY);

function normalize(list) {
  const out = [];
  for (const r of Array.isArray(list) ? list : []) {
    const shop = String(r?.shop_type ?? '').trim().toLowerCase();
    if (!shop || r?.is_active === false) continue;
    const cycle = Number(r?.cycle_interval_ms);
    const config = r?.config && typeof r.config === 'object' ? r.config : {};
    out.push({ shop_type: shop, cycle_interval_ms: Number.isFinite(cycle) ? cycle : 0, config });
  }
  return out;
}

/** Pass null/empty to reset to the fallback snapshot. */
export function setRegistry(list) {
  const n = normalize(list);
  rows = n.length > 0 ? n : normalize(FALLBACK_REGISTRY);
}

export function getRegistry() { return rows; }

function find(shop) { return rows.find((r) => r.shop_type === shop) ?? null; }

export function isAllowedShopType(shop) {
  return shop === 'weather' || find(shop) !== null;
}

export function isWeatherShopType(shop) {
  return !STANDARD_SHOP_TYPES.has(shop) && shop !== 'weather' && find(shop) !== null;
}

/** Non-standard registry shops, in registry order (dawn, snow, thunder, …). */
export function getWeatherShopIds() {
  return rows.filter((r) => !STANDARD_SHOP_TYPES.has(r.shop_type)).map((r) => r.shop_type);
}

/** 0 for the weather pseudo-type or unknown shops. */
export function getShopCycleInterval(shop) {
  return find(shop)?.cycle_interval_ms ?? 0;
}

/** Canonical weather id a shop is gated behind, or null for standard/unknown shops. */
export function getShopWeatherKind(shop) {
  if (!isWeatherShopType(shop)) return null;
  const gated = find(shop)?.config?.weather_gated;
  if (typeof gated === 'string' && gated.trim()) {
    const g = gated.trim();
    return GATE_ALIASES[g] ?? g;
  }
  return SHOP_WEATHER_FALLBACK[shop] ?? null;
}
