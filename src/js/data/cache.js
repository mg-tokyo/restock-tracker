// localStorage wrapper with TTL entries. Safe when storage is unavailable.
import { LEGACY_KEYS } from '../config.js';

function store() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function readRaw(key) {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeRaw(key, value) {
  const s = store();
  if (!s) return;
  try { s.setItem(key, JSON.stringify(value)); } catch { /* quota / private mode */ }
}

export function removeKey(key) {
  const s = store();
  if (!s) return;
  try { s.removeItem(key); } catch { /* ignore */ }
}

/** Returns { data, timestamp, stale } or null. Stale entries are returned so callers can fall back. */
export function readEntry(key, ttlMs) {
  const rec = readRaw(key);
  if (!rec || typeof rec !== 'object' || typeof rec.timestamp !== 'number') return null;
  const age = Date.now() - rec.timestamp;
  return { data: rec.data, timestamp: rec.timestamp, stale: age > ttlMs };
}

export function writeEntry(key, data) {
  writeRaw(key, { data, timestamp: Date.now() });
}

export function purgeLegacyKeys() {
  for (const k of LEGACY_KEYS) removeKey(k);
}
