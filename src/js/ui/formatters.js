// Formatting helpers (port of QPM restockWindowFormatters.ts). Colours are CSS classes from app.css.
import { getShopCycleInterval } from '../data/registry.js';
import { RARITY_COLORS, RARITY_GLOW } from '../data/constants.js';

const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;

export function formatETA(ts) {
  if (!ts) return '--';
  const diff = ts - Date.now();
  if (diff <= 0) return 'Overdue';
  const min = Math.ceil(diff / MIN);
  if (min < 60) return `~${min}m`;
  const hr = Math.ceil(min / 60);
  if (hr < 24) return `~${hr}h`;
  return `~${Math.ceil(hr / 24)}d`;
}

export function etaClass(ts) {
  if (!ts) return 'restock-eta-none';
  const diff = ts - Date.now();
  if (diff <= 0) return 'restock-eta-now';
  const h = diff / HOUR;
  if (h < 1) return 'restock-eta-imminent';
  if (h < 6) return 'restock-eta-soon';
  if (h < 24) return 'restock-eta-today';
  const d = diff / DAY;
  if (d < 7) return 'restock-eta-week';
  if (d < 14) return 'restock-eta-fortnight';
  return 'restock-eta-far';
}

export function ratePercent(rate) {
  if (rate === null || rate === undefined) return '--';
  if (rate >= 1) return '100%';
  if (rate <= 0) return '0%';
  const pct = rate * 100;
  let formatted;
  if (pct > 99) {
    formatted = pct.toString().slice(0, 5);
    if (parseFloat(formatted) >= 100) formatted = '99.99';
  } else if (pct < 0.01) {
    formatted = '< 0.01';
  } else {
    formatted = pct.toFixed(pct >= 10 ? 1 : 2);
  }
  if (parseFloat(formatted) >= 100) formatted = '99.9';
  if (parseFloat(formatted) === 0) formatted = '0.01';
  return `${formatted}%`;
}

export function rateClass(rate) {
  if (rate === null || rate === undefined) return 'restock-rate-low';
  const pct = rate * 100;
  if (pct >= 80) return 'restock-rate-high';
  if (pct >= 40) return 'restock-rate-mid';
  return 'restock-rate-low';
}

export function formatFrequency(rate, shopType) {
  if (rate === null || rate === undefined || rate <= 0) return '';
  const interval = getShopCycleInterval(shopType);
  if (!interval) return '';
  if (rate >= 0.95) return 'Every restock';
  const min = Math.round(interval / rate / MIN);
  if (min < 60) return `Every ~${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `Every ~${hr}h`;
  return `Every ~${Math.round(hr / 24)}d`;
}

export function formatAvgQty(qty) {
  if (!qty || qty <= 0) return '';
  if (qty >= 10) return `~${Math.round(qty)} avg`;
  if (Number.isInteger(qty)) return `~${qty} avg`;
  return `~${qty.toFixed(1)} avg`;
}

export function formatPrice(value) {
  if (!value || value < 1000) return `${value ?? 0}`;
  const units = ['K', 'M', 'B', 'T', 'Q'];
  let v = value, idx = -1;
  while (v >= 1000 && idx < units.length - 1) { v /= 1000; idx++; }
  const rounded = v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${rounded}${units[idx]}`;
}

export function formatRelative(ms) {
  if (!ms) return '--';
  const diff = Date.now() - ms;
  if (diff < 0) return 'just now';
  const min = Math.floor(diff / MIN);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function formatClock(ms) {
  if (!ms) return '--';
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatWindowCountdown(ms) {
  const totalMinutes = Math.floor(Math.max(0, ms) / MIN);
  return `${Math.floor(totalMinutes / 60)}hr ${totalMinutes % 60}min`;
}

export function formatRelativeDay(ms) {
  if (!ms) return null;
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const target = new Date(ms); target.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((startOfToday.getTime() - target.getTime()) / DAY);
  if (!Number.isFinite(diffDays) || diffDays <= 0) return null;
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'always' }).format(-diffDays, 'day');
}

export function formatUpdatedAgo(fetchedAt) {
  if (!fetchedAt) return '';
  const m = Math.round((Date.now() - fetchedAt) / MIN);
  return m < 1 ? 'Updated now' : `Updated ${m}m ago`;
}

// ---- rarity ----

const RARITY_CLASS_ALIAS = { mythic: 'mythical', epic: 'mythical' };

/** CSS suffix class used by .restock-icon-wrap.rarity-* and .restock-text-*. */
export function rarityClass(rarity) {
  const r = String(rarity ?? 'common').toLowerCase();
  return `rarity-${RARITY_CLASS_ALIAS[r] ?? (RARITY_COLORS[r] ? r : 'common')}`;
}

export function rarityBorderStyle(rarity) {
  const r = String(rarity ?? 'common').toLowerCase();
  const color = RARITY_COLORS[r] ?? RARITY_COLORS.common;
  const glow = RARITY_GLOW[r] ?? '';
  return `border:2px solid ${color};${glow ? `box-shadow:${glow};` : ''}`;
}
