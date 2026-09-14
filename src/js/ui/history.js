// History card: filter/sort pipeline (pure) + chunked table renderer.
import { isHiddenOrExpired, getShopOrder, HISTORY_CHUNK_SIZE } from '../data/constants.js';
import { getItemName, getItemPrice, getCatalogOrder, isCelestial } from '../data/meta.js';
import { SORT_COLUMNS } from './state.js';
import { buildHistRow, el } from './rows.js';

const $ = (id) => document.getElementById(id);

const COLUMNS = [
  { key: 'item', label: 'Item', className: '' },
  { key: 'price', label: 'Price', className: 'num' },
  { key: 'sightings', label: 'Sightings', className: 'num' },
  { key: 'last', label: 'Last Seen', className: 'time' },
];

function sortValue(item, column) {
  switch (column) {
    case 'item': return getItemName(item.item_id, item.shop_type).toLowerCase();
    case 'price': return getItemPrice(item.item_id, item.shop_type);
    case 'sightings': return item.total_occurrences ?? 0;
    default: return item.last_seen ?? 0;
  }
}

function defaultCompare(a, b) {
  const shopA = getShopOrder(a.shop_type), shopB = getShopOrder(b.shop_type);
  if (shopA !== shopB) return shopA - shopB;
  const orderA = getCatalogOrder(a.item_id, a.shop_type), orderB = getCatalogOrder(b.item_id, b.shop_type);
  if (orderA !== null || orderB !== null) {
    if (orderA === null) return 1;
    if (orderB === null) return -1;
    if (orderA !== orderB) return orderA - orderB;
  }
  return getItemName(a.item_id, a.shop_type).localeCompare(getItemName(b.item_id, b.shop_type), undefined, { sensitivity: 'base' });
}

/** Pure: drop pinned/hidden/expired, apply filter + search, then sort. */
export function filterAndSort(items, { tracked, filter, search, sortColumn, sortDirection, now = Date.now() }) {
  const q = (search ?? '').trim().toLowerCase();
  const filtered = items.filter((item) => {
    const key = `${item.shop_type}:${item.item_id}`;
    if (tracked.has(key)) return false;
    if (isHiddenOrExpired(item.shop_type, item.item_id, now)) return false;
    if (filter === 'celestial') { if (!isCelestial(item.item_id)) return false; }
    else if (filter !== 'all' && item.shop_type !== filter) return false;
    if (q) {
      const name = getItemName(item.item_id, item.shop_type).toLowerCase();
      if (!name.includes(q) && !item.item_id.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  if (!sortColumn || !SORT_COLUMNS.includes(sortColumn)) return filtered.sort(defaultCompare);
  const dir = sortDirection === 'desc' ? -1 : 1;
  return filtered.sort((a, b) => {
    const av = sortValue(a, sortColumn), bv = sortValue(b, sortColumn);
    if (av === bv) return defaultCompare(a, b);
    return (av > bv ? 1 : -1) * dir;
  });
}

export function initHistory({ collapsed, sortColumn, sortDirection, onToggle, onSortChange }) {
  const card = $('history-card');
  const toggle = $('history-toggle');
  const count = $('history-count');
  const resetBtn = $('reset-sort');
  const body = $('history-body');
  let sort = { column: sortColumn, direction: sortDirection };
  let loading = true;
  let chunkRaf = null;
  let renderToken = 0;

  card.classList.toggle('collapsed', collapsed);
  toggle.addEventListener('click', (e) => {
    if (e.target.closest('#reset-sort')) return;
    const now = !card.classList.contains('collapsed');
    card.classList.toggle('collapsed', now);
    onToggle(now);
  });

  const updateResetBtn = () => { resetBtn.hidden = sort.column === null; };
  updateResetBtn();

  const setSort = (column) => {
    if (sort.column !== column) sort = { column, direction: 'asc' };
    else if (sort.direction === 'asc') sort = { column, direction: 'desc' };
    else sort = { column: null, direction: 'asc' };
    updateResetBtn();
    onSortChange(sort);
  };

  resetBtn.addEventListener('click', () => {
    if (sort.column === null) return;
    sort = { column: null, direction: 'asc' };
    updateResetBtn();
    onSortChange(sort);
  });

  const buildHead = () => {
    const thead = el('thead');
    const tr = el('tr');
    for (const col of COLUMNS) {
      const th = el('th', col.className, col.label);
      th.dataset.sort = col.key;
      if (sort.column === col.key) {
        th.classList.add('is-sorted');
        th.appendChild(el('span', 'sort-indicator active', sort.direction === 'asc' ? '▲' : '▼'));
      }
      tr.appendChild(th);
    }
    thead.appendChild(tr);
    thead.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (th) setSort(th.dataset.sort);
    });
    return thead;
  };

  return {
    getSort: () => sort,
    setLoading(v) { loading = v; },
    render(items, { tracked, filter, search, onPin }) {
      if (chunkRaf !== null) { cancelAnimationFrame(chunkRaf); chunkRaf = null; }
      const token = ++renderToken;
      const scrollTop = body.scrollTop;
      body.innerHTML = '';
      const rows = filterAndSort(items, { tracked, filter, search, sortColumn: sort.column, sortDirection: sort.direction });
      count.textContent = `· ${rows.length} item${rows.length === 1 ? '' : 's'}`;
      if (!rows.length) {
        body.appendChild(el('div', 'empty-state', loading ? 'Loading restock data…' : 'No items found.'));
        return;
      }
      const table = el('table');
      table.appendChild(buildHead());
      const tbody = el('tbody');
      table.appendChild(tbody);
      body.appendChild(table);
      tbody.addEventListener('click', (e) => {
        const tr = e.target.closest('tr[data-key]');
        if (tr) onPin(tr.dataset.key);
      });
      let idx = 0;
      const appendChunk = () => {
        if (token !== renderToken) return;
        const frag = document.createDocumentFragment();
        for (let i = 0; i < HISTORY_CHUNK_SIZE && idx < rows.length; i++, idx++) {
          const item = rows[idx];
          frag.appendChild(buildHistRow(item, `${item.shop_type}:${item.item_id}`, { onPin: () => {} }));
        }
        tbody.appendChild(frag);
        body.scrollTop = scrollTop;
        chunkRaf = idx < rows.length ? requestAnimationFrame(appendChunk) : null;
      };
      appendChunk();
    },
  };
}
