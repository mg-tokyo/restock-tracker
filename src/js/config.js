// Site-wide constants: endpoints, keys, TTLs, storage keys.

export const SUPABASE_URL = 'https://xjuvryjgrjchbhjixwzh.supabase.co/rest/v1';
// Supabase publishable key (public by design). Legacy anon JWT rotated 2026-08-16.
export const SUPABASE_KEY = 'sb_publishable_L1p4vEhYCQq11l4IYtbsBQ_FdLYZsGZ';
export const ARIEDAM_URL = 'https://mg-api.ariedam.fr';

export const TTL = {
  cache:    30 * 60 * 1000,        // restock predictions
  weather:   5 * 60 * 1000,        // weather_predictions
  registry: 24 * 60 * 60 * 1000,   // shop_type_registry
  gameData: 24 * 60 * 60 * 1000,   // ariedam /data
  live:      2 * 60 * 1000,        // ariedam /live
};

export const REFRESH_BUDGET = { max: 5, windowMs: 2 * 60 * 60 * 1000 };

export const KEYS = {
  cache:    'restock.cache.v1',
  weather:  'restock.weatherCache.v1',
  registry: 'restock.registry.v1',
  gameData: 'restock.gameData.v1',
  live:     'restock.live.v1',
  budget:   'restock.refreshBudget.v1',
  extended: 'restock.extended.v1',
  ui:       'restock.ui.v1',
  tracked:  'restock.tracked',
  theme:    'theme',
};

export const LEGACY_KEYS = [
  'historyData_restock_v9',
  'historyData_restock_v9:refresh-lock',
  'historyData_restock_v10',
  'historyData_restock_v10:refresh-lock',
  'ariedam_game_data_v1',
  'ariedam_live_weather_v1',
];

export const FETCH_TIMEOUT_MS = 15_000;
export const MAX_RETRIES = 3;
export const RETRY_DELAYS_MS = [1000, 2000, 4000];
