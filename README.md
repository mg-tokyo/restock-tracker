# Restock Tracker

A web-based tool that tracks and predicts shop restock times for Magic Garden. It is the website version of the QPM-GR in-game Shop Restock Tracker and shares its prediction logic.

**[Use it here →](https://mg-tokyo.github.io/restock-tracker/)**

## Features

- **Restock predictions** — pin any item from History to see a live countdown to its next restock and its per-restock probability
- **Every shop** — Seeds, Eggs, Decor, Tools (with coin and magic-dust prices) and the weather-gated shops (Dawn, Snow, Thunder, Amber, Rain), discovered from the shop registry
- **Weather events** — per-cycle probabilities for Dawn, Amber Moon, Rain, Snow, Thunderstorm and Sunny
- **Weather badges** — items locked behind a weather show "Dawn only" / "Dawn ACTIVE" from the live game state
- **Celestial filter** — one click to see all celestial items
- **Seasonal awareness** — dormant items are marked "Seasonal" instead of showing a stale countdown
- **Search and sorting** — sort by item, price, quantity or last seen; third click restores the default shop/catalog order
- **Manual refresh** — 5 refreshes per 2 hours; data otherwise refreshes automatically every 30 minutes
- **Dark / light theme** — preference, filters, sort and pinned items are saved locally

## How it works

- Predictions come from the Supabase REST views `restock_predictions_mat`, `weather_predictions` and `shop_type_registry` (read-only publishable key).
- Item names, prices, rarities, sprites and shop eligibility come from the [Ariedam community API](https://mg-api.ariedam.fr) (`/data`, `/live`).
- Everything is cached in `localStorage` with per-source TTLs. No build step — plain ES modules served by GitHub Pages.

## Development

```bash
npm test          # unit tests (node --test)
npm run serve     # http://localhost:8080
```

Source layout: `src/js/data/` (fetching, parsing, catalog) · `src/js/ui/` (DOM) · `src/css/`.
