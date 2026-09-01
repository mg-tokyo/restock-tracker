// Row builders for the Pinned list and History table (port of QPM restockWindowRows.ts, class-based styling).
import { getItemProbability } from '../data/parser.js';
import { getCurrentWeather } from '../data/gameData.js';
import { shopLabel } from '../data/constants.js';
import {
  getItemName, getItemRarity, getItemPrice, getItemDustPrice, isCelestial, getRequiredWeather, getSpriteUrl,
} from '../data/meta.js';
import {
  formatETA, etaClass, ratePercent, rateClass, formatFrequency, formatAvgQty, formatPrice,
  formatRelative, formatClock, formatRelativeDay, rarityClass,
} from './formatters.js';

export function el(tag, className = '', text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

const ETA_CLASSES = ['restock-eta-none', 'restock-eta-now', 'restock-eta-imminent', 'restock-eta-soon',
  'restock-eta-today', 'restock-eta-week', 'restock-eta-fortnight', 'restock-eta-far'];

function applyEta(node, ts) {
  node.textContent = formatETA(ts);
  node.classList.remove(...ETA_CLASSES);
  node.classList.add(etaClass(ts));
}

/** Re-apply ETA text/colour to refs from buildPredRow (called by the 30s ticker). */
export function refreshEtaRefs(refs) {
  for (const ref of refs) applyEta(ref.el, ref.ts);
}

// ---- shared pieces ----

export function makeIconWrap(item) {
  const wrap = el('div', `restock-icon-wrap ${rarityClass(getItemRarity(item.item_id, item.shop_type))}`);
  const url = getSpriteUrl(item);
  if (url) {
    const img = el('img', 'restock-item-sprite');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    wrap.appendChild(img);
  }
  return wrap;
}

function badgeText(required, current) {
  return current === required ? `${required} ACTIVE` : `${required} only`;
}

export function makeWeatherBadge(itemId) {
  const required = getRequiredWeather(itemId);
  if (!required) return null;
  const badge = el('span', 'weather-badge');
  badge.dataset.weather = required;
  const current = getCurrentWeather();
  badge.textContent = badgeText(required, current);
  badge.classList.toggle('is-active', current === required);
  return badge;
}

export function refreshWeatherBadges(root) {
  const current = getCurrentWeather();
  for (const badge of root.querySelectorAll('.weather-badge')) {
    const required = badge.dataset.weather;
    badge.textContent = badgeText(required, current);
    badge.classList.toggle('is-active', current === required);
  }
}

function makeNameLine(item) {
  const line = el('div', 'restock-pred-line1');
  const rarity = getItemRarity(item.item_id, item.shop_type);
  line.appendChild(el('span', `restock-item-name restock-text-${rarityClass(rarity).slice(7)}`, getItemName(item.item_id, item.shop_type)));
  const badge = makeWeatherBadge(item.item_id);
  if (badge) line.appendChild(badge);
  return line;
}

function makeMetric(valueText, valueClass, label) {
  const wrap = el('div', 'restock-pred-metric-wrap');
  const value = el('div', `restock-pred-metric-value ${valueClass}`, valueText);
  wrap.append(value, el('div', 'restock-pred-metric-label', label));
  return { wrap, value };
}

// ---- pinned (prediction) row ----

export function buildPredRow(item, key, { onUnpin }) {
  const ts = item.estimated_next_timestamp ?? 0;
  const hasData = (item.total_occurrences ?? 0) >= 2 && ts > 0;
  const rate = getItemProbability(item);
  const row = el('div', 'restock-pred-row');
  row.dataset.key = key;
  row.title = 'Click ✕ to unpin';
  if (isCelestial(item.item_id)) row.classList.add('is-celestial');

  const left = el('div', 'restock-pred-left');
  left.appendChild(makeIconWrap(item));
  const text = el('div', 'restock-pred-text');
  text.appendChild(makeNameLine(item));
  const sub = el('div', 'restock-pred-line2');
  if (!hasData) {
    const seen = item.total_occurrences ?? 0;
    sub.textContent = seen > 0 ? `${seen} sighting${seen === 1 ? '' : 's'} recorded` : 'Not enough data';
  } else {
    sub.textContent = item.last_seen ? `Seen ${formatRelative(item.last_seen)}` : 'Tracked';
  }
  text.appendChild(sub);
  left.appendChild(text);
  row.appendChild(left);

  const metrics = el('div', 'restock-pred-metrics');
  let etaRef = null;
  if (!hasData) {
    metrics.appendChild(el('div', 'restock-pred-metric-value restock-nodata', '--'));
  } else if (item.is_dormant === true) {
    row.classList.add('is-dormant');
    metrics.appendChild(makeMetric('Seasonal', 'restock-seasonal', 'next').wrap);
    metrics.appendChild(makeMetric('—', 'restock-eta-none', 'rate').wrap);
  } else {
    const eta = makeMetric('', '', 'next');
    applyEta(eta.value, ts);
    etaRef = { el: eta.value, ts };
    const rateMetric = makeMetric(ratePercent(rate), rateClass(rate), 'rate');
    const tooltip = [formatAvgQty(item.average_quantity), formatFrequency(rate, item.shop_type)].filter(Boolean).join('\n');
    if (tooltip) rateMetric.wrap.dataset.tooltip = tooltip;
    metrics.append(eta.wrap, rateMetric.wrap);
  }
  const unpin = el('button', 'unpin-btn', '✕');
  unpin.type = 'button';
  unpin.title = 'Unpin';
  unpin.addEventListener('click', (e) => { e.stopPropagation(); onUnpin(key); });
  metrics.appendChild(unpin);
  row.appendChild(metrics);
  return { row, etaRef };
}

// ---- history row ----

function makePriceCell(item) {
  const td = el('td', 'num');
  const price = getItemPrice(item.item_id, item.shop_type);
  const dust = getItemDustPrice(item.item_id, item.shop_type);
  if (price <= 0 && dust <= 0) { td.textContent = '--'; return td; }
  const sub = el('div', 'restock-item-sub');
  if (price > 0) {
    const wrap = el('span', 'restock-price-wrap');
    const coin = el('img', 'restock-coin-icon');
    coin.src = './coin.png'; coin.alt = 'Coins';
    wrap.append(coin, el('span', '', formatPrice(price)));
    sub.appendChild(wrap);
  }
  if (dust > 0) {
    const wrap = el('span', 'restock-dust-wrap');
    wrap.append(el('span', '', '✨'), el('span', '', formatPrice(dust)));
    sub.appendChild(wrap);
  }
  td.appendChild(sub);
  return td;
}

export function buildHistRow(item, key, { onPin }) {
  const tr = el('tr');
  tr.dataset.key = key;
  tr.title = 'Click to pin to predictions';
  if (isCelestial(item.item_id)) tr.classList.add('is-celestial');

  const itemTd = el('td');
  const cell = el('div', 'restock-item-cell');
  cell.appendChild(makeIconWrap(item));
  const info = el('div', 'restock-item-info');
  info.appendChild(makeNameLine(item));
  info.appendChild(el('span', 'restock-shop-label', shopLabel(item.shop_type)));
  cell.appendChild(info);
  itemTd.appendChild(cell);

  const qty = item.average_quantity;
  const qtyTd = el('td', 'num', qty && qty > 0 ? (Number.isInteger(qty) ? String(qty) : qty.toFixed(1)) : '--');

  const lastTd = el('td', 'time');
  lastTd.title = item.last_seen ? new Date(item.last_seen).toLocaleString() : '--';
  const timeCell = el('div', 'restock-time-cell');
  timeCell.appendChild(el('div', '', formatClock(item.last_seen)));
  const relDay = formatRelativeDay(item.last_seen);
  if (relDay) timeCell.appendChild(el('div', 'restock-rel-day', relDay));
  lastTd.appendChild(timeCell);

  tr.append(itemTd, makePriceCell(item), qtyTd, lastTd);
  tr.addEventListener('click', () => onPin(key));
  return tr;
}
