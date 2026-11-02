// Entry point: wires data loaders to the UI.
import { purgeLegacyKeys } from './data/cache.js';
import { loadRegistry, loadRestockItems, loadWeatherPredictions } from './data/api.js';
import {
  loadGameData, refreshLiveWeather, onWeatherChange, startLiveWeatherPolling, pruneStaleShopTypeRows, remapStalePins,
} from './data/gameData.js';
import { buildItemMetaCache, mergeToolFallbackRows, mergeWeatherShopFallbackRows } from './data/meta.js';
import { weatherPredictionsAsRestockItems } from './data/weather.js';
import { getRefreshBudget } from './data/budget.js';
import { ETA_TICK_MS } from './data/constants.js';
import { loadUiState, scheduleSaveUiState, loadTracked, saveTracked, loadTheme, saveTheme } from './ui/state.js';
import { initToolbar } from './ui/toolbar.js';
import { initPinned } from './ui/pinned.js';
import { initHistory } from './ui/history.js';
import { refreshEtaRefs, refreshWeatherBadges } from './ui/rows.js';

function applyTheme(theme) {
  document.body.classList.toggle('theme-light', theme === 'light');
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'light' ? '🌙' : '☀️';
}

export async function initApp() {
  purgeLegacyKeys();
  const theme = loadTheme();
  applyTheme(theme);
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = document.body.classList.contains('theme-light') ? 'dark' : 'light';
    applyTheme(next);
    saveTheme(next);
  });

  const ui = loadUiState();
  const tracked = loadTracked();
  let shopData = [];
  let weatherRows = [];
  let allData = [];
  let fetchedAt = null;
  let lastLoad = null; // { stale } after a successful load; null before or after a failure
  let loading = false;
  let etaRefs = [];

  const uiState = () => ({
    filter: toolbar.getFilter(), search: toolbar.getSearch(),
    sortColumn: history.getSort().column, sortDirection: history.getSort().direction,
    pinnedCollapsed: document.getElementById('pinned-card').classList.contains('collapsed'),
    historyCollapsed: document.getElementById('history-card').classList.contains('collapsed'),
  });
  const persistUi = () => scheduleSaveUiState(uiState);

  // ---- render scheduling ----
  let queued = false, wantPinned = false, wantHistory = false;
  const renderNow = () => {
    if (wantPinned) {
      wantPinned = false;
      etaRefs = pinned.render(allData, tracked, unpin);
    }
    if (wantHistory) {
      wantHistory = false;
      history.render(allData, { tracked, filter: toolbar.getFilter(), search: toolbar.getSearch(), onPin: pin });
    }
  };
  const scheduleRender = (p, h) => {
    wantPinned ||= p; wantHistory ||= h;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; renderNow(); });
  };
  // Prune here, not at fetch time: restock data can arrive before Ariedam /data (eligibility) has loaded,
  // and this runs again once it does. The cache keeps unpruned rows.
  const rebuildAllData = () => {
    const shopRows = pruneStaleShopTypeRows(shopData);
    allData = [...mergeWeatherShopFallbackRows(mergeToolFallbackRows(shopRows)), ...weatherRows];
    if (lastLoad && !loading) { // don't overwrite "Refreshing…" if /data lands mid-refresh
      const { stale } = lastLoad;
      toolbar.setStatus(`Tracking ${shopRows.length} items${stale ? ' (cached — refresh failed)' : ''}`, stale ? 'stale' : 'ok');
    }
    scheduleRender(true, true);
  };

  function pin(key) { tracked.add(key); saveTracked(tracked); scheduleRender(true, true); }
  function unpin(key) { tracked.delete(key); saveTracked(tracked); scheduleRender(true, true); }

  // ---- UI modules ----
  const toolbar = initToolbar({
    filter: ui.filter, search: ui.search,
    onFilter: () => { persistUi(); scheduleRender(false, true); },
    onSearch: () => { persistUi(); scheduleRender(false, true); },
    onRefresh: () => load(true),
  });
  const pinned = initPinned({ collapsed: ui.pinnedCollapsed, onToggle: persistUi });
  const history = initHistory({
    collapsed: ui.historyCollapsed, sortColumn: ui.sortColumn, sortDirection: ui.sortDirection,
    onToggle: persistUi,
    onSortChange: () => { persistUi(); scheduleRender(false, true); },
  });

  const updateBudget = () => toolbar.setBudget(getRefreshBudget(), loading);
  updateBudget();

  // ---- data loading ----
  async function load(force = false) {
    if (loading) return;
    if (force && getRefreshBudget().blocked) { updateBudget(); return; }
    loading = true;
    history.setLoading(true);
    updateBudget();
    toolbar.setStatus(force ? 'Refreshing…' : 'Loading…');
    try {
      const [restock, weather] = await Promise.all([
        loadRestockItems({ force, onRetry: (n, max) => toolbar.setStatus(`Retrying… (${n}/${max})`) }),
        loadWeatherPredictions({ force }),
      ]);
      shopData = restock.items;
      weatherRows = weatherPredictionsAsRestockItems(weather);
      fetchedAt = restock.fetchedAt;
      lastLoad = { stale: !!(restock.fromCache && restock.error) };
      toolbar.setUpdated(fetchedAt);
    } catch (err) {
      console.error('[restock] load failed', err);
      lastLoad = null;
      toolbar.setStatus('Error loading data', 'error');
      toolbar.setUpdated(null, err?.message ?? 'Unknown error');
    } finally {
      loading = false;
      history.setLoading(false);
      updateBudget();
      rebuildAllData();
    }
  }

  await loadRegistry();
  toolbar.rebuildChips();

  const gameDataReady = loadGameData().then((data) => {
    buildItemMetaCache(data);
    // Pins whose shop was reshuffled would otherwise vanish with the pruned row.
    const remapped = remapStalePins(tracked);
    if (remapped.changed) {
      tracked.clear();
      for (const key of remapped.set) tracked.add(key);
      saveTracked(tracked);
    }
    rebuildAllData();
  });
  void refreshLiveWeather();
  await Promise.all([load(false), gameDataReady]);

  // ---- timers ----
  onWeatherChange(() => refreshWeatherBadges(document.body));
  const stopWeather = startLiveWeatherPolling();
  const tick = () => {
    if (document.hidden) return;
    refreshEtaRefs(etaRefs);
    toolbar.setUpdated(fetchedAt);
    updateBudget();
  };
  const ticker = setInterval(tick, ETA_TICK_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  window.addEventListener('pagehide', () => { clearInterval(ticker); stopWeather(); });
}

initApp();
