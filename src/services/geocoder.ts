/**
 * CineVicino — OpenStreetMap Nominatim Geocoding Service
 * Compliant with Nominatim Usage Policy (max 1 req/sec, descriptive User-Agent, local caching, resume support).
 */
import fs from 'fs';
import path from 'path';
import { executeRawSql } from '../db/index';

export type GeocodeStatus = 'pending' | 'complete' | 'not_found' | 'rate_limited' | 'error';

export interface GeocodeResult {
  status: GeocodeStatus;
  lat?: number;
  lng?: number;
  displayName?: string;
  error?: string;
}

const CACHE_FILE = path.join(process.cwd(), 'data', 'nominatim-cache.json');
let cache: Record<string, { lat: number; lng: number; displayName: string }> = {};

// Load cache on module load
try {
  if (fs.existsSync(CACHE_FILE)) {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  }
} catch {
  cache = {};
}

function saveCache() {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save nominatim cache:', err);
  }
}

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 1100; // Nominatim strictly requires max 1 request per second

async function rateLimitWait(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Geocode a single Italian comune by name and province/region
 */
export async function geocodeComune(name: string, province: string, region: string): Promise<GeocodeResult> {
  const cacheKey = `${name.toLowerCase().trim()}|${(province || region).toLowerCase().trim()}`;

  // Check cache first
  if (cache[cacheKey]) {
    return {
      status: 'complete',
      lat: cache[cacheKey].lat,
      lng: cache[cacheKey].lng,
      displayName: cache[cacheKey].displayName
    };
  }

  // Rate limit wait (1 req/sec)
  await rateLimitWait();

  const searchQuery = `${name}, ${province || region}, Italia`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=it&limit=1&q=${encodeURIComponent(searchQuery)}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CineVicino/1.0 (+https://cinevicino.it; info@cinevicino.it)',
        'Accept': 'application/json'
      }
    });

    if (res.status === 429) {
      return { status: 'rate_limited', error: 'HTTP 429 Too Many Requests from Nominatim' };
    }

    if (!res.ok) {
      return { status: 'error', error: `HTTP ${res.status}: ${res.statusText}` };
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      const displayName = data[0].display_name;

      if (!isNaN(lat) && !isNaN(lng)) {
        cache[cacheKey] = { lat, lng, displayName };
        saveCache();
        return { status: 'complete', lat, lng, displayName };
      }
    }

    return { status: 'not_found' };
  } catch (err: any) {
    return { status: 'error', error: err.message };
  }
}

/**
 * Batch geocoding runner: supports resuming interrupted runs
 */
export async function runBatchGeocoding(options: {
  limit?: number;
  onProgress?: (progress: { current: number; total: number; city: string; result: GeocodeResult }) => void;
} = {}): Promise<{ processed: number; completed: number; errors: number; notFound: number }> {
  const limit = options.limit || 50;

  // Find pending or rate_limited cities
  const rows = await executeRawSql(
    `SELECT id, name, province, region, geocode_status
     FROM cities
     WHERE geocode_status IN ('pending', 'rate_limited', 'error')
     ORDER BY is_provincial_capital DESC, name ASC
     LIMIT $1`,
    [limit]
  );

  const citiesToGeocode = rows.rows || [];
  let completed = 0;
  let errors = 0;
  let notFound = 0;

  for (let i = 0; i < citiesToGeocode.length; i++) {
    const c = citiesToGeocode[i];
    const res = await geocodeComune(c.name, c.province, c.region);

    if (res.status === 'complete' && res.lat && res.lng) {
      completed++;
      await executeRawSql(
        `UPDATE cities
         SET lat = $1, lng = $2, geocode_status = 'complete', geocoded_at = NOW()
         WHERE id = $3`,
        [res.lat, res.lng, c.id]
      );
    } else {
      if (res.status === 'not_found') notFound++;
      else errors++;

      await executeRawSql(
        `UPDATE cities
         SET geocode_status = $1, geocoded_at = NOW()
         WHERE id = $2`,
        [res.status, c.id]
      );
    }

    if (options.onProgress) {
      options.onProgress({
        current: i + 1,
        total: citiesToGeocode.length,
        city: c.name,
        result: res
      });
    }

    // Stop early if hit rate limit
    if (res.status === 'rate_limited') {
      console.warn('⚠️ OSM Nominatim rate limit reached. Halting batch.');
      break;
    }
  }

  return {
    processed: citiesToGeocode.length,
    completed,
    errors,
    notFound
  };
}
