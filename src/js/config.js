export const CONFIG = {
  // Supabase publishable key (public by design). The legacy anon JWT was rotated 2026-08-16.
  API_KEY: "sb_publishable_L1p4vEhYCQq11l4IYtbsBQ_FdLYZsGZ",
  API_URL: "https://xjuvryjgrjchbhjixwzh.supabase.co/rest/v1/restock_predictions_mat?select=*",
  WEATHER_URL: "https://xjuvryjgrjchbhjixwzh.supabase.co/rest/v1/weather_predictions?select=*",
  // How long to keep the Supabase prediction data in localStorage before re-fetching.
  CACHE_DURATION: 30 * 60 * 1000,      // 30 minutes
  // Minimum time between fetch attempts (prevents tab-thrash hammering the API).
  MIN_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
};
