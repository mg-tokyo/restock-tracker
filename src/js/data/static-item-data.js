// Minimal static data — only things the game API (mg-api.ariedam.fr/data) cannot provide.
// Everything else (item names, prices, rarities) is fetched dynamically from the API.

// Weather metadata: the API /data endpoint has weather names but no rarity or event duration.
// Add new weathers here when the game adds them (keys must match the DB-normalised weather_id).
export const WEATHER_META = {
  Sunny:        { name: "Sunny",        rarity: "common"    },
  Rain:         { name: "Rain",         rarity: "uncommon"  },
  Snow:         { name: "Snow",         rarity: "rare"      }, // game ID: Frost
  Thunderstorm: { name: "Thunderstorm", rarity: "mythic"    },
  Dawn:         { name: "Dawn",         rarity: "legendary" },
  AmberMoon:    { name: "Amber Moon",   rarity: "divine"    },
};

// Time-limited items: hidden from the tracker after their end date.
// Key format: "shopType:itemId"   Value: expiry timestamp (ms UTC)
export const ITEM_EXPIRY = {
  "seed:PineTree":              1768179600000,
  "seed:Poinsettia":            1768179600000,
  "egg:WinterEgg":              1768179600000,
  "decor:Cauldron":             1762477200000,
  "decor:ColoredStringLights":  1768179600000,
  "decor:LargeGravestone":      1762477200000,
  "decor:MarbleCaribou":        1768179600000,
  "decor:MediumGravestone":     1762477200000,
  "decor:SmallGravestone":      1762477200000,
  "decor:StoneCaribou":         1768179600000,
  "decor:WoodCaribou":          1768179600000,
};
