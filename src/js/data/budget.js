// Manual-refresh budget: REFRESH_BUDGET.max refreshes per REFRESH_BUDGET.windowMs (port of QPM dataService).
import { KEYS, REFRESH_BUDGET } from '../config.js';
import { readRaw, writeRaw } from './cache.js';

function readEntry() {
  const saved = readRaw(KEYS.budget);
  if (!saved || typeof saved !== 'object') return null;
  const used = Number(saved.used);
  const windowStartedAt = Number(saved.windowStartedAt);
  if (!Number.isFinite(used) || !Number.isFinite(windowStartedAt)) return null;
  return { used: Math.max(0, Math.floor(used)), windowStartedAt: Math.max(0, Math.floor(windowStartedAt)) };
}

function normalize(now) {
  const { windowMs, max } = REFRESH_BUDGET;
  const raw = readEntry();
  if (!raw || raw.windowStartedAt <= 0 || now - raw.windowStartedAt >= windowMs) {
    return { entry: { used: 0, windowStartedAt: now }, changed: true };
  }
  const used = Math.min(max, raw.used);
  return { entry: { used, windowStartedAt: raw.windowStartedAt }, changed: used !== raw.used };
}

function toState(entry) {
  const { windowMs, max } = REFRESH_BUDGET;
  const used = Math.min(max, Math.max(0, entry.used));
  const remaining = Math.max(0, max - used);
  return {
    max, used, remaining, windowMs,
    windowStartedAt: entry.windowStartedAt,
    resetAt: entry.windowStartedAt + windowMs,
    blocked: remaining <= 0,
  };
}

export function getRefreshBudget(now = Date.now()) {
  const n = normalize(now);
  if (n.changed) writeRaw(KEYS.budget, n.entry);
  return toState(n.entry);
}

export function tryConsumeRefresh(now = Date.now()) {
  const { entry } = normalize(now);
  if (entry.used < REFRESH_BUDGET.max) entry.used += 1;
  writeRaw(KEYS.budget, entry);
  return toState(entry);
}
