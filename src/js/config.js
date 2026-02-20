export const CONFIG = {
  API_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdXZyeWpncmpjaGJoaml4d3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDYyODMsImV4cCI6MjA4NTY4MjI4M30.MqQCBG-UMR4HYJU44Tz2orHUj9gMgJTMJtxpb_MHeps",
  API_URL:
    "https://xjuvryjgrjchbhjixwzh.supabase.co/functions/v1/restock-history",
  // How long to keep the Supabase prediction data in localStorage before re-fetching.
  CACHE_DURATION: 30 * 60 * 1000,      // 30 minutes
  // Minimum time between fetch attempts (prevents tab-thrash hammering the API).
  MIN_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
};
