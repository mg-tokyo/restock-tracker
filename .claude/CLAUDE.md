# Restock Tracker

## TL;DR
Shop restock history and prediction tracker for Magic Garden. Shows restock timing patterns and upcoming predictions using Supabase data.

## Architecture type
Web app — vanilla JavaScript, HTML/CSS, no build step

## Repo map
- `index.html` — page shell (ids bound by `src/js/ui/*`)
- `src/css/{base,rows,table}.css` — glass theme + light mode; rows/badges; history table
- `src/js/main.js` — entry: loaders → renders → timers
- `src/js/config.js` — endpoints, key, TTLs, storage keys
- `src/js/data/` — `api.js` (Supabase), `gameData.js` (Ariedam), `parser.js`, `weather.js`, `registry.js`, `meta.js`, `constants.js`, `budget.js`, `cache.js`
- `src/js/ui/` — `toolbar.js`, `pinned.js`, `history.js`, `rows.js`, `formatters.js`, `state.js`
- `tests/` — `node --test` unit tests (`npm test`)
- `decor-sprites/`, `weathericon/`, `coin.png` — local image fallbacks
- `docs/superpowers/` — design spec and implementation plan

## Deployment
Hosted via GitHub Pages at `mg-tokyo.github.io`. Remote: `mg-tokyo/restock-tracker`.

## Data sources
- Supabase REST (`xjuvryjgrjchbhjixwzh`): `restock_predictions_mat`, `weather_predictions`, `shop_type_registry`. Publishable key in `src/js/config.js`.
- Ariedam API (`mg-api.ariedam.fr`): `/data` catalog (24h cache), `/live` weather (2m cache), sprite URLs.
- Parity source of truth: QPM-GR `src/utils/restock/*` and `src/ui/shop/restockWindow*.ts`. Port logic changes from there; do not fork behaviour.
- Item detail view (events/accuracy RPCs) is not implemented; `get_item_restock_events` and `restock_prediction_accuracy_by_item` currently time out server-side.
