// Persisted UI state, tracked (pinned) set and theme.
import { KEYS } from '../config.js';
import { readRaw, writeRaw, removeKey } from '../data/cache.js';
import { UI_STATE_SAVE_DEBOUNCE_MS } from '../data/constants.js';

export const SORT_COLUMNS = ['item', 'price', 'sightings', 'last'];
const LEGACY_TRACKED_KEY = 'trackedItems';

export function loadUiState() {
  const s = readRaw(KEYS.ui) ?? {};
  return {
    filter: typeof s.filter === 'string' ? s.filter : 'all',
    search: typeof s.search === 'string' ? s.search : '',
    sortColumn: SORT_COLUMNS.includes(s.sortColumn) ? s.sortColumn : null,
    sortDirection: s.sortDirection === 'desc' ? 'desc' : 'asc',
    pinnedCollapsed: !!s.pinnedCollapsed,
    historyCollapsed: !!s.historyCollapsed,
  };
}

export function saveUiState(state) {
  writeRaw(KEYS.ui, {
    filter: state.filter, search: state.search, sortColumn: state.sortColumn,
    sortDirection: state.sortDirection, pinnedCollapsed: !!state.pinnedCollapsed, historyCollapsed: !!state.historyCollapsed,
  });
}

let saveTimer = null;
/** Debounced save; getState is called when the timer fires. */
export function scheduleSaveUiState(getState) {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; saveUiState(getState()); }, UI_STATE_SAVE_DEBOUNCE_MS);
}

export function loadTracked() {
  let saved = readRaw(KEYS.tracked);
  if (!Array.isArray(saved)) {
    const legacy = readRaw(LEGACY_TRACKED_KEY);
    saved = Array.isArray(legacy) ? legacy : [];
    writeRaw(KEYS.tracked, saved);
    removeKey(LEGACY_TRACKED_KEY);
  }
  return new Set(saved.filter((k) => typeof k === 'string' && k.includes(':')));
}

export function saveTracked(set) {
  writeRaw(KEYS.tracked, Array.from(set));
}

export function loadTheme() {
  return readRaw(KEYS.theme) === 'light' ? 'light' : 'dark';
}

export function saveTheme(theme) {
  writeRaw(KEYS.theme, theme === 'light' ? 'light' : 'dark');
}
