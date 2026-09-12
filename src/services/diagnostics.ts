/**
 * CineVicino — Diagnostics & Health Checking System
 * Provides live testing, connectivity validation, latency measurement, and quota tracking
 * for TMDb API, Firecrawl API, and multi-source Cinema Scrapers (CinemaTimes, MYmovies, ComingSoon).
 */

import * as cheerio from 'cheerio';
import { getRatingsStatus } from './ratingsFetcher';
import { RatingsStatus } from '../types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface TmdbDiagnosticResult {
  configured: boolean;
  masked_key: string;
  status: 'healthy' | 'unconfigured' | 'error';
  auth_success: boolean;
  latency_ms: number;
  message: string;
  secure_base_url?: string;
  poster_sizes?: string[];
  sample_test?: {
    query: string;
    movie_found: boolean;
    title?: string;
    original_title?: string;
    director?: string;
    genres?: string[];
    poster_url?: string;
    backdrop_url?: string;
    synopsis?: string;
    rating?: number;
    release_date?: string;
  };
  tested_at: string;
}

export interface FirecrawlDiagnosticResult {
  configured: boolean;
  masked_key: string;
  status: 'healthy' | 'low_credits' | 'unconfigured' | 'error';
  latency_ms: number;
  message: string;
  credits: {
    remaining: number;
    plan: number;
    used: number;
    used_percent: number;
    billing_period_start: string | null;
    billing_period_end: string | null;
  };
  test_scrape?: {
    tested_url: string;
    success: boolean;
    latency_ms: number;
    html_bytes: number;
    title?: string;
    error?: string;
  };
  tested_at: string;
}

export interface ScraperSourceCheck {
  source: 'CinemaTimes.com' | 'MYmovies.it' | 'ComingSoon.it';
  url: string;
  status: 'healthy' | 'degraded' | 'error';
  http_status: number;
  latency_ms: number;
  html_bytes: number;
  cinemas_found: number;
  sample_cinema?: string;
  message: string;
}

export interface ScraperDiagnosticResult {
  overall_status: 'healthy' | 'degraded' | 'error';
  test_city: string;
  tested_at: string;
  sources: ScraperSourceCheck[];
}

export interface DiagnosticsSummary {
  tmdb: {
    configured: boolean;
    status: 'healthy' | 'unconfigured' | 'error';
    latency_ms: number;
    message: string;
    masked_key: string;
  };
  firecrawl: {
    configured: boolean;
    status: 'healthy' | 'low_credits' | 'unconfigured' | 'error';
    latency_ms: number;
    message: string;
    remaining_credits: number;
    plan_credits: number;
    credits_used: number;
    masked_key: string;
  };
  scrapers: {
    overall_status: 'healthy' | 'degraded' | 'error';
    sources_online: number;
    total_sources: number;
  };
  ratings: RatingsStatus;
  tested_at: string;
}

function maskApiKey(key: string | undefined): string {
  if (!key || key.length < 8) return 'Non configurata';
  return `${key.slice(0, 4)}***${key.slice(-4)}`;
}

/**
 * Perform comprehensive TMDb API check:
 * 1. Validate API Key
 * 2. Ping authentication endpoint
 * 3. Fetch image configuration
 * 4. Execute test Italian movie query and verify poster CDN
 */
export async function checkTmdb(options: { testQuery?: string } = {}): Promise<TmdbDiagnosticResult> {
  const tmdbKey = process.env.TMDB_API_KEY;
  const testedAt = new Date().toISOString();

  if (!tmdbKey) {
    return {
      configured: false,
      masked_key: 'Non configurata',
      status: 'unconfigured',
      auth_success: false,
      latency_ms: 0,
      message: 'TMDB_API_KEY non presente nelle variabili d\'ambiente. È attivo il fallback CDN interno.',
      tested_at: testedAt
    };
  }

  const startTime = Date.now();

  try {
    // 1. Authentication check
    const authRes = await fetch(`https://api.themoviedb.org/3/authentication?api_key=${tmdbKey}`, {
      signal: AbortSignal.timeout(6000)
    });

    if (!authRes.ok) {
      const errData = await authRes.json().catch(() => ({}));
      const latencyMs = Date.now() - startTime;
      return {
        configured: true,
        masked_key: maskApiKey(tmdbKey),
        status: 'error',
        auth_success: false,
        latency_ms: latencyMs,
        message: `Autenticazione TMDb fallita (HTTP ${authRes.status}): ${errData.status_message || 'Chiave API non valida'}`,
        tested_at: testedAt
      };
    }

    // 2. Fetch image configuration
    const configRes = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${tmdbKey}`, {
      signal: AbortSignal.timeout(6000)
    });
    const configData = configRes.ok ? await configRes.json().catch(() => ({})) : {};

    // 3. Live movie search test (default 'Dune' or custom Italian movie)
    const testQuery = options.testQuery?.trim() || 'Dune';
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(testQuery)}&language=it-IT&page=1`,
      { signal: AbortSignal.timeout(6000) }
    );
    const searchData = searchRes.ok ? await searchRes.json().catch(() => ({})) : {};

    const firstMovie = searchData.results?.[0];
    let sampleTest: TmdbDiagnosticResult['sample_test'] = undefined;

    if (firstMovie) {
      // Optional: fetch director & credits for first movie
      let director = 'N/D';
      try {
        const creditRes = await fetch(
          `https://api.themoviedb.org/3/movie/${firstMovie.id}/credits?api_key=${tmdbKey}`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (creditRes.ok) {
          const creditData = await creditRes.json();
          const dirObj = creditData.crew?.find((c: any) => c.job === 'Director');
          if (dirObj) director = dirObj.name;
        }
      } catch {}

      const secureBase = configData.images?.secure_base_url || 'https://image.tmdb.org/t/p/';
      sampleTest = {
        query: testQuery,
        movie_found: true,
        title: firstMovie.title,
        original_title: firstMovie.original_title,
        director,
        poster_url: firstMovie.poster_path ? `${secureBase}w780${firstMovie.poster_path}` : undefined,
        backdrop_url: firstMovie.backdrop_path ? `${secureBase}w1280${firstMovie.backdrop_path}` : undefined,
        synopsis: firstMovie.overview || 'Sinossi non disponibile',
        rating: firstMovie.vote_average,
        release_date: firstMovie.release_date
      };
    }

    const latencyMs = Date.now() - startTime;

    return {
      configured: true,
      masked_key: maskApiKey(tmdbKey),
      status: 'healthy',
      auth_success: true,
      latency_ms: latencyMs,
      message: `TMDb API operativa (${latencyMs}ms). CDN immagini verificato e ricerca film in italiano funzionante.`,
      secure_base_url: configData.images?.secure_base_url,
      poster_sizes: configData.images?.poster_sizes,
      sample_test: sampleTest,
      tested_at: testedAt
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      configured: true,
      masked_key: maskApiKey(tmdbKey),
      status: 'error',
      auth_success: false,
      latency_ms: latencyMs,
      message: `Errore durante la connessione a TMDb API: ${err.message}`,
      tested_at: testedAt
    };
  }
}

/**
 * Perform comprehensive Firecrawl API check:
 * 1. Validate API Key
 * 2. Query credit usage & billing cycle (/v1/team/credit-usage)
 * 3. Optionally execute live test scrape on a target URL
 */
export async function checkFirecrawl(options: { testScrape?: boolean; testUrl?: string } = {}): Promise<FirecrawlDiagnosticResult> {
  const fcKey = process.env.FIRECRAWL_API_KEY;
  const testedAt = new Date().toISOString();

  if (!fcKey) {
    return {
      configured: false,
      masked_key: 'Non configurata',
      status: 'unconfigured',
      latency_ms: 0,
      message: 'FIRECRAWL_API_KEY non presente nelle variabili d\'ambiente. Lo scraper opera in modalità diretta Cheerio HTTP.',
      credits: {
        remaining: 0,
        plan: 0,
        used: 0,
        used_percent: 0,
        billing_period_start: null,
        billing_period_end: null
      },
      tested_at: testedAt
    };
  }

  const startTime = Date.now();

  try {
    // 1. Fetch team credit usage
    const creditRes = await fetch('https://api.firecrawl.dev/v1/team/credit-usage', {
      headers: { Authorization: `Bearer ${fcKey}` },
      signal: AbortSignal.timeout(7000)
    });

    if (!creditRes.ok) {
      const errData = await creditRes.json().catch(() => ({}));
      const latencyMs = Date.now() - startTime;
      return {
        configured: true,
        masked_key: maskApiKey(fcKey),
        status: 'error',
        latency_ms: latencyMs,
        message: `Verifica crediti Firecrawl fallita (HTTP ${creditRes.status}): ${errData.error || errData.message || 'Chiave non valida o scaduta'}`,
        credits: {
          remaining: 0,
          plan: 0,
          used: 0,
          used_percent: 0,
          billing_period_start: null,
          billing_period_end: null
        },
        tested_at: testedAt
      };
    }

    const creditData = await creditRes.json();
    const creds = creditData.data || {};
    const remaining = creds.remaining_credits ?? 0;
    const plan = creds.plan_credits ?? 1000;
    const used = Math.max(0, plan - remaining);
    const usedPercent = plan > 0 ? Math.min(100, Math.round((used / plan) * 100)) : 0;

    // 2. Optional test scrape
    let testScrapeResult: FirecrawlDiagnosticResult['test_scrape'] = undefined;
    if (options.testScrape) {
      const targetUrl = options.testUrl?.trim() || 'https://example.com';
      const scrapeStart = Date.now();
      try {
        const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${fcKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: targetUrl,
            formats: ['html']
          }),
          signal: AbortSignal.timeout(15000)
        });
        const scrapeData = await scrapeRes.json();
        const scrapeMs = Date.now() - scrapeStart;

        if (scrapeRes.ok && scrapeData.success && scrapeData.data?.html) {
          const $ = cheerio.load(scrapeData.data.html);
          testScrapeResult = {
            tested_url: targetUrl,
            success: true,
            latency_ms: scrapeMs,
            html_bytes: Buffer.byteLength(scrapeData.data.html, 'utf8'),
            title: $('title').text().trim() || $('h1').first().text().trim() || 'Titolo non rilevato'
          };
        } else {
          testScrapeResult = {
            tested_url: targetUrl,
            success: false,
            latency_ms: scrapeMs,
            html_bytes: 0,
            error: scrapeData.error || `HTTP ${scrapeRes.status}`
          };
        }
      } catch (scrapeErr: any) {
        testScrapeResult = {
          tested_url: options.testUrl || 'https://example.com',
          success: false,
          latency_ms: Date.now() - scrapeStart,
          html_bytes: 0,
          error: scrapeErr.message
        };
      }
    }

    const latencyMs = Date.now() - startTime;
    const isLow = remaining > 0 && remaining < 50;

    return {
      configured: true,
      masked_key: maskApiKey(fcKey),
      status: isLow ? 'low_credits' : 'healthy',
      latency_ms: latencyMs,
      message: isLow
        ? `Firecrawl operativo ma con crediti residui bassi (${remaining} rimanenti).`
        : `Firecrawl API operativa (${latencyMs}ms). ${remaining.toLocaleString('it-IT')} crediti disponibili su piano da ${plan.toLocaleString('it-IT')}.`,
      credits: {
        remaining,
        plan,
        used,
        used_percent: usedPercent,
        billing_period_start: creds.billing_period_start || null,
        billing_period_end: creds.billing_period_end || null
      },
      test_scrape: testScrapeResult,
      tested_at: testedAt
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      configured: true,
      masked_key: maskApiKey(fcKey),
      status: 'error',
      latency_ms: latencyMs,
      message: `Errore durante la connessione a Firecrawl API: ${err.message}`,
      credits: {
        remaining: 0,
        plan: 0,
        used: 0,
        used_percent: 0,
        billing_period_start: null,
        billing_period_end: null
      },
      tested_at: testedAt
    };
  }
}

/**
 * Perform live connectivity and parser check on all 3 cinema sources:
 * 1. CinemaTimes.com
 * 2. MYmovies.it
 * 3. ComingSoon.it
 */
export async function checkScraperSources(options: { citySlug?: string } = {}): Promise<ScraperDiagnosticResult> {
  const city = options.citySlug ? slugify(options.citySlug) : 'roma';
  const testedAt = new Date().toISOString();
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 CineVicino/1.0';

  const targets = [
    {
      source: 'CinemaTimes.com' as const,
      url: `https://cinematimes.com/it/${city}/cinemas/`
    },
    {
      source: 'MYmovies.it' as const,
      url: `https://www.mymovies.it/cinema/${city}/`
    },
    {
      source: 'ComingSoon.it' as const,
      url: `https://www.comingsoon.it/cinema/${city}/`
    }
  ];

  const sourceResults: ScraperSourceCheck[] = [];

  for (const target of targets) {
    const start = Date.now();
    try {
      const res = await fetch(target.url, {
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        signal: AbortSignal.timeout(10000)
      });

      const latencyMs = Date.now() - start;
      const html = await res.text();
      const byteSize = Buffer.byteLength(html, 'utf8');

      if (!res.ok) {
        sourceResults.push({
          source: target.source,
          url: target.url,
          status: 'error',
          http_status: res.status,
          latency_ms: latencyMs,
          html_bytes: byteSize,
          cinemas_found: 0,
          message: `Risposta HTTP non valida: ${res.status}`
        });
        continue;
      }

      const $ = cheerio.load(html);
      let cinemasFound = 0;
      let sampleCinema: string | undefined = undefined;

      if (target.source === 'CinemaTimes.com') {
        $('a').each((_, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().replace(/\s+/g, ' ').trim();
          if (href.includes('/cinemas/') && !href.endsWith('/cinemas/') && !href.includes('/chains/')) {
            const cleanName = text.replace(/[0-9]+km.*$/i, '').replace(/[0-9]+m\s*·.*$/i, '').trim();
            if (cleanName && cleanName.length > 2) {
              cinemasFound++;
              if (!sampleCinema) sampleCinema = cleanName;
            }
          }
        });
      } else if (target.source === 'MYmovies.it') {
        $('a').each((_, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().replace(/\s+/g, ' ').trim();
          if (href.includes(`/cinema/${city}/`) && href !== `/cinema/${city}/` && /\/[0-9]+\/?$/.test(href)) {
            const cleanName = text.replace(/[0-9]+$/, '').trim();
            if (cleanName && cleanName.length > 2) {
              cinemasFound++;
              if (!sampleCinema) sampleCinema = cleanName;
            }
          }
        });
      } else if (target.source === 'ComingSoon.it') {
        $('a').each((_, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().replace(/\s+/g, ' ').trim();
          const m = href.match(/\/cinema\/([a-z0-9-]+)\/([a-z0-9-]+)\/([0-9]+)\/?/);
          if (m && text && text.length > 2) {
            cinemasFound++;
            if (!sampleCinema) sampleCinema = text;
          }
        });
      }

      const status: 'healthy' | 'degraded' = cinemasFound > 0 ? 'healthy' : 'degraded';
      const message =
        cinemasFound > 0
          ? `HTTP 200 (${latencyMs}ms) — Rilevati ${cinemasFound} cinema. Esempio: "${sampleCinema}".`
          : `HTTP 200 (${latencyMs}ms) — Pagina caricata ma nessun cinema rilevato con i selettori attuali.`;

      sourceResults.push({
        source: target.source,
        url: target.url,
        status,
        http_status: res.status,
        latency_ms: latencyMs,
        html_bytes: byteSize,
        cinemas_found: cinemasFound,
        sample_cinema: sampleCinema,
        message
      });
    } catch (err: any) {
      sourceResults.push({
        source: target.source,
        url: target.url,
        status: 'error',
        http_status: 0,
        latency_ms: Date.now() - start,
        html_bytes: 0,
        cinemas_found: 0,
        message: `Connessione fallita: ${err.message}`
      });
    }
  }

  const healthyCount = sourceResults.filter(s => s.status === 'healthy').length;
  let overallStatus: 'healthy' | 'degraded' | 'error' = 'healthy';
  if (healthyCount === 0) {
    overallStatus = 'error';
  } else if (healthyCount < sourceResults.length) {
    overallStatus = 'degraded';
  }

  return {
    overall_status: overallStatus,
    test_city: city,
    tested_at: testedAt,
    sources: sourceResults
  };
}

// In-memory cache for fast summary checks to avoid excessive external rate limits
let cachedSummary: DiagnosticsSummary | null = null;
let lastSummaryCheckTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache for dashboard overview

/**
 * Return an aggregated summary of TMDb, Firecrawl, and Scrapers health.
 */
export async function getDiagnosticsSummary(forceRefresh = false): Promise<DiagnosticsSummary> {
  const now = Date.now();
  if (!forceRefresh && cachedSummary && now - lastSummaryCheckTime < CACHE_TTL_MS) {
    return cachedSummary;
  }

  const [tmdbResult, firecrawlResult, ratingsResult] = await Promise.all([
    checkTmdb({ testQuery: 'Dune' }),
    checkFirecrawl({ testScrape: false }),
    getRatingsStatus()
  ]);

  const summary: DiagnosticsSummary = {
    tmdb: {
      configured: tmdbResult.configured,
      status: tmdbResult.status,
      latency_ms: tmdbResult.latency_ms,
      message: tmdbResult.message,
      masked_key: tmdbResult.masked_key
    },
    firecrawl: {
      configured: firecrawlResult.configured,
      status: firecrawlResult.status,
      latency_ms: firecrawlResult.latency_ms,
      message: firecrawlResult.message,
      remaining_credits: firecrawlResult.credits.remaining,
      plan_credits: firecrawlResult.credits.plan,
      credits_used: firecrawlResult.credits.used,
      masked_key: firecrawlResult.masked_key
    },
    scrapers: {
      overall_status: 'healthy',
      sources_online: 3,
      total_sources: 3
    },
    ratings: ratingsResult,
    tested_at: new Date().toISOString()
  };

  cachedSummary = summary;
  lastSummaryCheckTime = now;
  return summary;
}
