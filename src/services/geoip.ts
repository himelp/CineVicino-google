import fs from 'fs';
import path from 'path';
import { Request } from 'express';
import maxmind, { Reader, CityResponse } from 'maxmind';
import { executeRawSql } from '../db/index';
import { logger } from '../utils/logger';

const GEOIP_DIR = path.join(process.cwd(), 'data', 'geoip');
const MMDB_PATH = path.join(GEOIP_DIR, 'GeoLite2-City.mmdb');

let geoReader: Reader<CityResponse> | null = null;
let isInitializing = false;
let isDownloading = false;

// Ensure persistent directory exists
if (!fs.existsSync(GEOIP_DIR)) {
  try {
    fs.mkdirSync(GEOIP_DIR, { recursive: true });
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Could not create data/geoip directory');
  }
}

/**
 * Extracts the real client IP address.
 * Priority:
 * 1. Cloudflare CF-Connecting-IP (set reliably at Cloudflare edge before Nginx/Tunnel)
 * 2. True-Client-IP (Cloudflare Enterprise / Akamai)
 * 3. X-Forwarded-For (leftmost client IP)
 * 4. Express req.ip or socket.remoteAddress
 */
export function extractClientIp(req: Request): string {
  // Allow test IP in development or via query parameter (?ip=...)
  if (process.env.NODE_ENV !== 'production' || req.query.test_ip || req.query.ip) {
    const testIp = (req.query.test_ip || req.query.ip) as string;
    if (testIp && typeof testIp === 'string' && testIp.trim()) {
      return testIp.trim();
    }
  }

  // 1. Cloudflare Edge header (highest priority behind Cloudflare Tunnel)
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cfIp.trim().split(',')[0].trim();
  }

  // 2. True-Client-IP header
  const trueClientIp = req.headers['true-client-ip'];
  if (typeof trueClientIp === 'string' && trueClientIp.trim()) {
    return trueClientIp.trim().split(',')[0].trim();
  }

  // 3. X-Forwarded-For (first IP in comma-separated list)
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }

  // 4. Fallback to Express req.ip or socket
  const rawIp = req.ip || req.socket?.remoteAddress || '';
  return rawIp.replace(/^::ffff:/, '').trim();
}

/**
 * Checks if an IP is in a private, loopback, or link-local range.
 */
export function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/, '').trim();
  if (
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean === 'localhost' ||
    clean === 'unknown' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean) ||
    clean.startsWith('169.254.') || // Link-local
    clean.startsWith('fc00:') ||
    clean.startsWith('fe80:')
  ) {
    return true;
  }
  return false;
}

/**
 * Masks an IP address for privacy in API responses (e.g. 93.45.xxx.xxx or 2a00:xxxx)
 */
export function maskIp(ip: string): string {
  if (!ip) return '';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
  } else if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts[0]}:${parts[1] || ''}:xxxx:xxxx`;
  }
  return ip;
}

/**
 * Initializes the MaxMind Reader if GeoLite2-City.mmdb is present on disk.
 */
export async function initGeoIp(): Promise<boolean> {
  if (geoReader) return true;
  if (isInitializing) return false;

  isInitializing = true;
  try {
    if (fs.existsSync(MMDB_PATH)) {
      geoReader = await maxmind.open<CityResponse>(MMDB_PATH, {
        cache: {
          max: 10000 // Cache up to 10k recent IP lookups in RAM
        }
      });
      logger.info('MaxMind GeoLite2-City database loaded successfully into memory.');
      isInitializing = false;
      return true;
    } else {
      logger.info('MaxMind GeoLite2-City database not found at data/geoip/GeoLite2-City.mmdb');
      isInitializing = false;
      return false;
    }
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to initialize MaxMind GeoLite2 database');
    isInitializing = false;
    return false;
  }
}

/**
 * Downloads the official GeoLite2-City.mmdb using MAXMIND_LICENSE_KEY.
 */
export async function downloadGeoLite2(customKey?: string): Promise<{ success: boolean; message: string }> {
  const licenseKey = customKey || process.env.MAXMIND_LICENSE_KEY;
  if (!licenseKey) {
    return {
      success: false,
      message: 'MAXMIND_LICENSE_KEY is not configured in .env. Get a free key at https://www.maxmind.com/en/geolite2/signup'
    };
  }

  if (isDownloading) {
    return { success: false, message: 'Download already in progress.' };
  }

  isDownloading = true;
  const tempTarPath = path.join(GEOIP_DIR, 'geolite2-temp.tar.gz');

  try {
    logger.info('Starting download of official MaxMind GeoLite2-City database...');
    const downloadUrl = `https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${encodeURIComponent(licenseKey)}&suffix=tar.gz`;

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      isDownloading = false;
      return {
        success: false,
        message: `MaxMind download failed with HTTP ${response.status}: ${response.statusText}. Please verify your MAXMIND_LICENSE_KEY.`
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(tempTarPath, buffer);

    // Extract .tar.gz using system tar
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Extract specifically the .mmdb file from the archive
    await execAsync(`tar -xzf "${tempTarPath}" --wildcards --strip-components=1 -C "${GEOIP_DIR}" '*/GeoLite2-City.mmdb'`);

    // Clean up temporary archive
    if (fs.existsSync(tempTarPath)) {
      fs.unlinkSync(tempTarPath);
    }

    // Re-initialize Reader
    if (fs.existsSync(MMDB_PATH)) {
      if (geoReader) {
        // Allow garbage collection of old reader
        geoReader = null;
      }
      geoReader = await maxmind.open<CityResponse>(MMDB_PATH, { cache: { max: 10000 } });
      isDownloading = false;
      logger.info('MaxMind GeoLite2-City database successfully downloaded and reloaded.');
      return {
        success: true,
        message: 'MaxMind GeoLite2-City database downloaded and activated successfully.'
      };
    } else {
      isDownloading = false;
      return { success: false, message: 'Archive extracted but GeoLite2-City.mmdb not found in destination.' };
    }
  } catch (err: any) {
    isDownloading = false;
    if (fs.existsSync(tempTarPath)) {
      fs.unlinkSync(tempTarPath);
    }
    logger.error({ err: err.message }, 'Error downloading MaxMind GeoLite2-City database');
    return { success: false, message: `Error: ${err.message}` };
  }
}

export interface DetectedCityResult {
  city_slug: string | null;
  city_name?: string;
  province_code?: string;
  region?: string;
  lat?: number;
  lng?: number;
  distance_km?: number;
  confidence?: 'high' | 'medium' | 'low';
  method?: 'maxmind_geolite2' | 'fallback_ip' | 'gps';
  client_ip?: string;
  reason?: string;
}

/**
 * Queries CineVicino's cities table using Haversine distance formula
 * to locate the closest Italian comune to the given coordinates.
 */
export async function findNearestCityToCoords(lat: number, lng: number): Promise<DetectedCityResult | null> {
  try {
    const query = `
      SELECT
        c.id, c.slug, c.name, c.region, c.province, c.province_code,
        c.lat, c.lng,
        (6371 * acos(
          least(1.0, greatest(-1.0,
            cos(radians($1)) * cos(radians(c.lat)) *
            cos(radians(c.lng) - radians($2)) +
            sin(radians($1)) * sin(radians(c.lat))
          ))
        )) AS distance_km
      FROM cities c
      ORDER BY distance_km ASC
      LIMIT 1;
    `;

    const res = await executeRawSql(query, [lat, lng]);
    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    const city = res.rows[0];
    const dist = Math.round(Number(city.distance_km) * 10) / 10;

    let confidence: 'high' | 'medium' | 'low' = 'high';
    if (dist > 50) {
      confidence = 'medium';
    }
    if (dist > 120) {
      confidence = 'low';
    }

    return {
      city_slug: city.slug,
      city_name: city.name,
      province_code: city.province_code,
      region: city.region,
      lat: city.lat,
      lng: city.lng,
      distance_km: dist,
      confidence
    };
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error finding nearest city to coordinates');
    return null;
  }
}

/**
 * Resolves the visitor's city based on their IP address.
 */
export async function detectCityFromIp(ip: string): Promise<DetectedCityResult> {
  if (isPrivateOrLocalIp(ip)) {
    return {
      city_slug: null,
      client_ip: maskIp(ip),
      reason: 'private_or_local_ip'
    };
  }

  // 1. Primary: Self-hosted MaxMind GeoLite2-City lookup (0 latency, 0 external API cost)
  if (!geoReader) {
    await initGeoIp();
  }

  if (geoReader) {
    try {
      const geo = geoReader.get(ip);
      if (geo && geo.location?.latitude && geo.location?.longitude) {
        const lat = geo.location.latitude;
        const lng = geo.location.longitude;

        const match = await findNearestCityToCoords(lat, lng);
        if (match && match.city_slug) {
          return {
            ...match,
            client_ip: maskIp(ip),
            method: 'maxmind_geolite2'
          };
        }
      }
    } catch (err: any) {
      logger.warn({ ip: maskIp(ip), err: err.message }, 'Error in MaxMind GeoLite2 IP lookup');
    }
  }

  // 2. Secondary: If MaxMind mmdb is not downloaded yet (e.g. pending MAXMIND_LICENSE_KEY),
  // use a lightweight free fallback lookup so the feature still functions out-of-the-box.
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const fallbackRes = await fetch(`https://freeipapi.com/api/json/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'CineVicino/1.0' }
    });
    clearTimeout(timeout);

    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json();
      if (fbData.latitude && fbData.longitude) {
        const match = await findNearestCityToCoords(Number(fbData.latitude), Number(fbData.longitude));
        if (match && match.city_slug) {
          return {
            ...match,
            client_ip: maskIp(ip),
            method: 'fallback_ip'
          };
        }
      }
    }
  } catch (err: any) {
    logger.debug({ err: err.message }, 'Fallback IP geolocation skipped or timed out');
  }

  return {
    city_slug: null,
    client_ip: maskIp(ip),
    reason: 'ip_unresolved_or_foreign'
  };
}

/**
 * Returns current status of the self-hosted GeoIP subsystem.
 */
export function getGeoIpStatus() {
  const fileExists = fs.existsSync(MMDB_PATH);
  let fileSizeMb = 0;
  let lastModified: Date | null = null;

  if (fileExists) {
    try {
      const stats = fs.statSync(MMDB_PATH);
      fileSizeMb = Math.round((stats.size / (1024 * 1024)) * 10) / 10;
      lastModified = stats.mtime;
    } catch {
      // ignore
    }
  }

  return {
    is_active: !!geoReader,
    database_file: fileExists ? 'GeoLite2-City.mmdb' : 'not_found',
    database_path: MMDB_PATH,
    database_size_mb: fileSizeMb,
    last_modified: lastModified,
    has_license_key: !!process.env.MAXMIND_LICENSE_KEY,
    is_downloading: isDownloading
  };
}
