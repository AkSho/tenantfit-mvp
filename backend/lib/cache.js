const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, '../cache');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// ─────────────────────────────────────────
// KEY HELPERS
// ─────────────────────────────────────────

function hashKey(key) {
  return crypto.createHash('md5').update(String(key)).digest('hex');
}

function cacheFile(key) {
  return path.join(CACHE_DIR, `${hashKey(key)}.json`);
}

// Canonical geo key: round to 4 decimal places (~11m precision) to maximise cache hits
function geoKey(source, lat, lng) {
  const rlat = Math.round(lat * 10000) / 10000;
  const rlng = Math.round(lng * 10000) / 10000;
  return `${source}:${rlat}:${rlng}`;
}

function zipKey(source, zip) {
  return `${source}:zip:${zip}`;
}

function tractKey(source, fips) {
  return `${source}:tract:${fips}`;
}

// ─────────────────────────────────────────
// CORE OPS
// ─────────────────────────────────────────

function get(key) {
  try {
    const file = cacheFile(key);
    if (!fs.existsSync(file)) return null;
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Date.now() > raw.expires_at) {
      fs.unlinkSync(file);
      return null;
    }
    return raw.data;
  } catch {
    return null;
  }
}

function set(key, data, ttlDays = 30) {
  try {
    const payload = {
      key,
      cached_at:  Date.now(),
      expires_at: Date.now() + ttlDays * 24 * 60 * 60 * 1000,
      data,
    };
    fs.writeFileSync(cacheFile(key), JSON.stringify(payload), 'utf8');
  } catch (err) {
    console.warn('[Cache] Write failed:', err.message);
  }
}

function clear(key) {
  try {
    const file = cacheFile(key);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch {}
}

function clearAll() {
  try {
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    files.forEach(f => fs.unlinkSync(path.join(CACHE_DIR, f)));
    console.log(`[Cache] Cleared ${files.length} entries`);
  } catch (err) {
    console.warn('[Cache] clearAll failed:', err.message);
  }
}

function stats() {
  try {
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    let valid = 0, expired = 0;
    files.forEach(f => {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8'));
        Date.now() > raw.expires_at ? expired++ : valid++;
      } catch { expired++; }
    });
    return { total: files.length, valid, expired };
  } catch {
    return { total: 0, valid: 0, expired: 0 };
  }
}

// ─────────────────────────────────────────
// CONVENIENCE WRAPPER
// Wraps any async fn with cache-aside logic
// Usage: cachedFetch('source', lat, lng, async () => { ... }, ttlDays)
// ─────────────────────────────────────────

async function cachedFetch(key, fetchFn, ttlDays = 30) {
  const cached = get(key);
  if (cached !== null) {
    console.log(`[Cache] HIT — ${key.slice(0, 60)}`);
    return cached;
  }
  const data = await fetchFn();
  if (data !== null && data !== undefined) {
    set(key, data, ttlDays);
  }
  return data;
}

module.exports = { get, set, clear, clearAll, stats, cachedFetch, geoKey, zipKey, tractKey };

// CHECKPOINT — 2026-04-16
// Completed: File-based cache with MD5-keyed JSON files, TTL, geo/zip/tract key helpers,
//            cachedFetch wrapper for cache-aside pattern, stats utility
// State: working
// Next: Wire into all lib files starting with lib/lehd.js
// Dependencies: none
