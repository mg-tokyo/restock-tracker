// Status bar + toolbar: filter chips, search, refresh button with budget, "updated" text.
import { getShopFilters, SEARCH_DEBOUNCE_MS } from '../data/constants.js';
import { formatWindowCountdown, formatUpdatedAgo } from './formatters.js';
import { el } from './rows.js';

const $ = (id) => document.getElementById(id);

export function initToolbar({ filter, search, onFilter, onSearch, onRefresh }) {
  const chips = $('filter-chips');
  const searchInput = $('search-input');
  const statusDot = $('status-dot');
  const statusText = $('status-text');
  const lastUpdated = $('last-updated');
  const refreshBtn = $('refresh-btn');
  const budgetEl = $('refresh-budget');

  let currentFilter = filter;

  const buildChips = () => {
    chips.innerHTML = '';
    const filters = getShopFilters();
    if (!filters.some((f) => f.value === currentFilter)) currentFilter = 'all';
    for (const f of filters) {
      const btn = el('button', `filter-btn chip-${f.value}`, f.label);
      btn.type = 'button';
      btn.dataset.filter = f.value;
      btn.classList.toggle('active', f.value === currentFilter);
      chips.appendChild(btn);
    }
  };
  buildChips();

  chips.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn || btn.dataset.filter === currentFilter) return;
    currentFilter = btn.dataset.filter;
    for (const b of chips.querySelectorAll('button')) b.classList.toggle('active', b === btn);
    onFilter(currentFilter);
  });

  searchInput.value = search;
  let timer = null;
  searchInput.addEventListener('input', () => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; onSearch(searchInput.value.trim()); }, SEARCH_DEBOUNCE_MS);
  });

  refreshBtn.addEventListener('click', () => onRefresh());

  return {
    /** Rebuild chips (e.g. after the registry loads) keeping the active filter. */
    setFilter(value) { currentFilter = value; buildChips(); },
    rebuildChips: buildChips,
    getFilter: () => currentFilter,
    getSearch: () => searchInput.value.trim(),
    setStatus(text, kind = 'ok') {
      statusText.textContent = text;
      statusDot.classList.toggle('is-error', kind === 'error');
      statusDot.classList.toggle('is-stale', kind === 'stale');
    },
    setBudget(budget, loading) {
      const countdown = formatWindowCountdown(Math.max(0, budget.resetAt - Date.now()));
      budgetEl.textContent = `${budget.remaining} refresh${budget.remaining === 1 ? '' : 'es'} left · ${countdown}`;
      refreshBtn.disabled = loading || budget.blocked;
      refreshBtn.textContent = loading ? 'Loading…' : 'Refresh';
    },
    setUpdated(fetchedAt, suffix = '') {
      lastUpdated.textContent = `${formatUpdatedAgo(fetchedAt)}${suffix}`;
    },
  };
}
