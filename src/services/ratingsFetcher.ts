/**
 * CineVicino — Letterboxd & Rotten Tomatoes Ratings Fetcher
 * Fetches external ratings non-blockingly and stores them in PostgreSQL.
 * Designed to be polite (rate-limited, batched, cached) to minimize external footprint.
 */

import * as cheerio from 'cheerio';
import { executeRawSql } from '../db';
import { RatingsStatus } from '../types';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const COMMON_HEADERS = {
  'User-Agent': BROWSER_USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

export interface LetterboxdResult {
  rating: number;
  count?: number;
  url?: string;
}

export interface RottenTomatoesResult {
  score: number;
  url?: string;
}

export interface RatingsBatchResult {
  moviesProcessed: number;
  ratingsUpdated: number;
  letterboxdCount: number;
  rottenTomatoesCount: number;
  errors: number;
  durationMs: number;
  details: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTitle(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Fetch Letterboxd rating by TMDb ID.
 * Letterboxd provides a direct redirect endpoint: https://letterboxd.com/tmdb/${tmdbId}/
 * which redirects straight to the film's canonical Letterboxd page.
 */
export async function fetchLetterboxdRating(tmdbId: number): Promise<LetterboxdResult | null> {
  if (!tmdbId || isNaN(tmdbId) || tmdbId <= 0) {
    return null;
  }

  try {
    const url = `https://letterboxd.com/tmdb/${tmdbId}/`;
    const res = await fetch(url, {
      method: 'GET',
      headers: COMMON_HEADERS,
      redirect: 'follow'
    });

    if (!res.ok) {
      return null;
    }

    const html = await res.text();
    if (!html || !html.includes('application/ld+json')) {
      return null;
    }

    const $ = cheerio.load(html);
    let result: LetterboxdResult | null = null;

    $('script[type="application/ld+json"]').each((_, el) => {
      if (result) return;
      try {
        const raw = $(el).text().replace(/\/\*\s*<!\[CDATA\[\s*\*\/|\/\*\s*\]\]>\s*\*\//g, '').trim();
        const parsed = JSON.parse(raw);
        if (parsed && (parsed['@type'] === 'Movie' || parsed['@type'] === 'schema:Movie') && parsed.aggregateRating) {
          const rawVal = parseFloat(parsed.aggregateRating.ratingValue);
          if (!isNaN(rawVal) && rawVal >= 0.5 && rawVal <= 5.0) {
            const count = parseInt(parsed.aggregateRating.ratingCount, 10);
            result = {
              rating: Math.round(rawVal * 10) / 10, // round to 1 decimal place (e.g. 4.4)
              count: !isNaN(count) && count > 0 ? count : undefined,
              url: res.url || undefined
            };
          }
        }
      } catch {
        // Skip malformed script block
      }
    });

    return result;
  } catch {
    // Non-blocking best-effort: return null on any error
    return null;
  }
}

interface RtCandidate {
  title: string;
  year: number | null;
  scoreFromSearch: number | null;
  href: string;
  matchScore: number;
}

/**
 * Score how well a candidate movie on Rotten Tomatoes matches our target title and release year.
 */
function scoreRtCandidate(
  targetTitle: string,
  targetYear: number | null,
  candTitle: string,
  candYear: number | null
): number {
  const normTarget = normalizeTitle(targetTitle);
  const normCand = normalizeTitle(candTitle);

  if (!normTarget || !normCand) return 0;

  let score = 0;

  // Title similarity
  if (normTarget === normCand) {
    score += 100;
  } else if (normCand.startsWith(normTarget) || normTarget.startsWith(normCand)) {
    score += 65;
  } else if (normCand.includes(normTarget) || normTarget.includes(normCand)) {
    score += 45;
  } else {
    // Check word overlap
    const targetWords = targetTitle.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
    const candWords = candTitle.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
    const common = targetWords.filter(w => candWords.includes(w));
    if (targetWords.length > 0 && common.length === targetWords.length) {
      score += 40;
    } else if (common.length > 0) {
      score += (common.length / targetWords.length) * 30;
    }
  }

  // Release year comparison
  if (targetYear && candYear) {
    const diff = Math.abs(targetYear - candYear);
    if (diff === 0) {
      score += 50;
    } else if (diff === 1) {
      score += 25;
    } else if (diff > 2) {
      score -= 60; // strong penalty for mismatching eras
    }
  }

  return score;
}

/**
 * Search Rotten Tomatoes for a movie title and parse candidates.
 */
async function searchRtCandidates(
  query: string,
  releaseYear: number | null
): Promise<RtCandidate[]> {
  try {
    const searchUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      method: 'GET',
      headers: COMMON_HEADERS
    });

    if (!res.ok) {
      return [];
    }

    const html = await res.text();
    if (!html) return [];

    const $ = cheerio.load(html);
    const candidates: RtCandidate[] = [];

    $('search-page-media-row').each((_, el) => {
      const row = $(el);
      const titleLink = row.find('a[slot="title"], a[data-qa="info-name"], a[data-qa="thumbnail-link"]').first();
      const href = titleLink.attr('href') || row.find('a').attr('href') || '';
      const titleText = row.find('a[slot="title"], a[data-qa="info-name"]').text().trim();

      // Only consider movie links, ignore /tv/ or /celebrity/
      if (!href || (!href.includes('/m/') && !href.includes('rottentomatoes.com/m/'))) {
        return;
      }

      const yearAttr = row.attr('release-year');
      const year = yearAttr ? parseInt(yearAttr, 10) : null;
      const scoreAttr = row.attr('tomatometer-score');
      const scoreFromSearch = scoreAttr ? parseInt(scoreAttr, 10) : null;

      const cand: RtCandidate = {
        title: titleText,
        year: !isNaN(year as number) ? year : null,
        scoreFromSearch: !isNaN(scoreFromSearch as number) ? scoreFromSearch : null,
        href,
        matchScore: scoreRtCandidate(query, releaseYear, titleText, year)
      };

      candidates.push(cand);
    });

    return candidates.sort((a, b) => b.matchScore - a.matchScore);
  } catch {
    return [];
  }
}

/**
 * Fetch Rotten Tomatoes Tomatometer score by movie title and release year.
 * Searches RT, picks the highest-confidence match, fetches the film page,
 * and extracts the schema.org JSON-LD aggregateRating score.
 */
export async function fetchRottenTomatoesScore(
  title: string,
  releaseYear: number | null,
  alternativeTitles?: string[]
): Promise<RottenTomatoesResult | null> {
  if (!title || !title.trim()) {
    return null;
  }

  try {
    // 1. Search primary title
    let candidates = await searchRtCandidates(title.trim(), releaseYear);

    // 2. If no confident match and alternative titles exist (e.g. English or Original title), try them
    if ((candidates.length === 0 || candidates[0].matchScore < 60) && alternativeTitles && alternativeTitles.length > 0) {
      for (const alt of alternativeTitles) {
        if (!alt || alt.trim() === title.trim()) continue;
        const altCandidates = await searchRtCandidates(alt.trim(), releaseYear);
        if (altCandidates.length > 0 && altCandidates[0].matchScore >= 60) {
          candidates = altCandidates;
          break;
        }
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    const winner = candidates[0];
    // Threshold: must have a confident match (>= 60) to avoid guessing wrong films
    if (winner.matchScore < 60) {
      return null;
    }

    const filmUrl = winner.href.startsWith('http')
      ? winner.href
      : `https://www.rottentomatoes.com${winner.href.startsWith('/') ? '' : '/'}${winner.href}`;

    // 3. Fetch canonical film page and extract JSON-LD aggregateRating
    const filmRes = await fetch(filmUrl, {
      method: 'GET',
      headers: COMMON_HEADERS
    });

    if (!filmRes.ok) {
      // Fallback: if film page fails but the search row had a score attribute
      if (winner.scoreFromSearch !== null && winner.scoreFromSearch >= 0 && winner.scoreFromSearch <= 100) {
        return { score: winner.scoreFromSearch, url: filmUrl };
      }
      return null;
    }

    const filmHtml = await filmRes.text();
    const $ = cheerio.load(filmHtml);
    let parsedScore: number | null = null;

    $('script[type="application/ld+json"]').each((_, el) => {
      if (parsedScore !== null) return;
      try {
        const raw = $(el).text().trim();
        const parsed = JSON.parse(raw);
        if (parsed && parsed.aggregateRating && parsed.aggregateRating.ratingValue !== undefined) {
          const val = parseInt(String(parsed.aggregateRating.ratingValue), 10);
          if (!isNaN(val) && val >= 0 && val <= 100) {
            parsedScore = val;
          }
        }
      } catch {
        // Skip malformed script
      }
    });

    // If JSON-LD didn't have aggregateRating, fallback to score on the search row if valid
    if (parsedScore === null && winner.scoreFromSearch !== null && winner.scoreFromSearch >= 0 && winner.scoreFromSearch <= 100) {
      parsedScore = winner.scoreFromSearch;
    }

    if (parsedScore !== null) {
      return {
        score: parsedScore,
        url: filmUrl
      };
    }

    return null;
  } catch {
    // Non-blocking best-effort: return null on any error
    return null;
  }
}

/**
 * Lightweight periodic enrichment step for external ratings.
 * Selects a small batch of movies that have never been fetched or were fetched > 10 days ago.
 * Rates-limits requests with deliberate delays to remain polite and compliant.
 */
export async function enrichMoviesWithExternalRatings(options?: {
  batchSize?: number;
  delayMs?: number;
  movieId?: string;
}): Promise<RatingsBatchResult> {
  const batchSize = Math.max(1, Math.min(options?.batchSize || 6, 20));
  const delayMs = options?.delayMs !== undefined ? options?.delayMs : 2500;
  const startTime = Date.now();

  const querySql = options?.movieId
    ? `SELECT id, slug, title_it, title_en, title_original, tmdb_id, release_year, letterboxd_rating, rotten_tomatoes_score
       FROM movies WHERE id = $1 LIMIT 1`
    : `SELECT id, slug, title_it, title_en, title_original, tmdb_id, release_year, letterboxd_rating, rotten_tomatoes_score
       FROM movies
       WHERE (ratings_fetched_at IS NULL OR ratings_fetched_at < NOW() - INTERVAL '10 days')
       ORDER BY (ratings_fetched_at IS NULL) DESC, ratings_fetched_at ASC NULLS FIRST
       LIMIT ${batchSize}`;

  const queryParams = options?.movieId ? [options.movieId] : [];
  const moviesRes = await executeRawSql(querySql, queryParams);
  const movies = moviesRes.rows || [];

  if (movies.length === 0) {
    return {
      moviesProcessed: 0,
      ratingsUpdated: 0,
      letterboxdCount: 0,
      rottenTomatoesCount: 0,
      errors: 0,
      durationMs: Date.now() - startTime,
      details: 'Nessun film da arricchire (tutte le valutazioni sono aggiornate negli ultimi 10 giorni).'
    };
  }

  let ratingsUpdated = 0;
  let letterboxdCount = 0;
  let rottenTomatoesCount = 0;
  let errors = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];

    // Politeness delay between movies
    if (i > 0 && delayMs > 0) {
      await sleep(delayMs);
    }

    let lbRating: number | null = null;
    let lbCount: number | null = null;
    let rtScore: number | null = null;

    try {
      // 1. Letterboxd fetch (using tmdb_id)
      if (movie.tmdb_id) {
        const lbRes = await fetchLetterboxdRating(Number(movie.tmdb_id));
        if (lbRes) {
          lbRating = lbRes.rating;
          lbCount = lbRes.count || null;
          letterboxdCount++;
        }
      }

      // Small pause between Letterboxd and Rotten Tomatoes
      if (delayMs > 0) {
        await sleep(Math.min(1000, delayMs));
      }

      // 2. Rotten Tomatoes fetch (using best titles & release year)
      const primaryTitle = movie.title_en || movie.title_original || movie.title_it;
      const altTitles = [movie.title_original, movie.title_it, movie.title_en].filter(
        t => t && t !== primaryTitle
      );

      const rtRes = await fetchRottenTomatoesScore(
        primaryTitle,
        movie.release_year ? Number(movie.release_year) : null,
        altTitles
      );

      if (rtRes) {
        rtScore = rtRes.score;
        rottenTomatoesCount++;
      }

      // Update movie record with timestamp and whatever ratings were retrieved
      await executeRawSql(
        `UPDATE movies
         SET
           letterboxd_rating = COALESCE($1, letterboxd_rating),
           letterboxd_rating_count = COALESCE($2, letterboxd_rating_count),
           rotten_tomatoes_score = COALESCE($3, rotten_tomatoes_score),
           ratings_fetched_at = NOW()
         WHERE id = $4`,
        [lbRating, lbCount, rtScore, movie.id]
      );

      if (lbRating !== null || rtScore !== null) {
        ratingsUpdated++;
      }
    } catch (err) {
      errors++;
      console.warn(`[RatingsFetcher] Non-fatal error enriching movie ${movie.slug}:`, err);
      // Still update ratings_fetched_at so a single failing movie does not loop on every scrape run
      try {
        await executeRawSql(`UPDATE movies SET ratings_fetched_at = NOW() WHERE id = $1`, [movie.id]);
      } catch {
        // Ignore
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const details = `Processati ${movies.length} film in ${(durationMs / 1000).toFixed(1)}s (Letterboxd: ${letterboxdCount}, Rotten Tomatoes: ${rottenTomatoesCount})`;

  return {
    moviesProcessed: movies.length,
    ratingsUpdated,
    letterboxdCount,
    rottenTomatoesCount,
    errors,
    durationMs,
    details
  };
}

/**
 * Diagnostic metrics for external ratings status.
 */
export async function getRatingsStatus(): Promise<RatingsStatus> {
  try {
    const statsRes = await executeRawSql(`
      SELECT
        COUNT(*) as total_movies,
        COUNT(CASE WHEN letterboxd_rating IS NOT NULL THEN 1 END) as letterboxd_populated,
        COUNT(CASE WHEN rotten_tomatoes_score IS NOT NULL THEN 1 END) as rotten_tomatoes_populated,
        COUNT(CASE WHEN letterboxd_rating IS NOT NULL AND rotten_tomatoes_score IS NOT NULL THEN 1 END) as both_populated,
        COUNT(CASE WHEN ratings_fetched_at IS NOT NULL THEN 1 END) as ratings_fetched_count,
        COUNT(CASE WHEN ratings_fetched_at IS NULL OR ratings_fetched_at < NOW() - INTERVAL '10 days' THEN 1 END) as pending_enrichment,
        MAX(ratings_fetched_at) as last_batch_run_at
      FROM movies;
    `);

    const row = statsRes.rows?.[0] || {};
    const total = parseInt(row.total_movies || '0', 10);
    const lbCount = parseInt(row.letterboxd_populated || '0', 10);
    const rtCount = parseInt(row.rotten_tomatoes_populated || '0', 10);
    const bothCount = parseInt(row.both_populated || '0', 10);
    const fetchedCount = parseInt(row.ratings_fetched_count || '0', 10);
    const pending = parseInt(row.pending_enrichment || '0', 10);

    const lbPct = total > 0 ? Math.round((lbCount / total) * 100) : 0;
    const rtPct = total > 0 ? Math.round((rtCount / total) * 100) : 0;

    let status: 'healthy' | 'pending' | 'idle' = 'idle';
    if (total > 0) {
      if (lbCount > 0 || rtCount > 0) {
        status = pending > 0 ? 'pending' : 'healthy';
      } else if (pending > 0) {
        status = 'pending';
      }
    }

    return {
      total_movies: total,
      letterboxd_populated: lbCount,
      letterboxd_percentage: lbPct,
      rotten_tomatoes_populated: rtCount,
      rotten_tomatoes_percentage: rtPct,
      both_populated: bothCount,
      ratings_fetched_count: fetchedCount,
      pending_enrichment: pending,
      last_batch_run_at: row.last_batch_run_at || null,
      status
    };
  } catch (err: any) {
    console.warn('[RatingsFetcher] Error getting ratings status:', err?.message);
    return {
      total_movies: 0,
      letterboxd_populated: 0,
      letterboxd_percentage: 0,
      rotten_tomatoes_populated: 0,
      rotten_tomatoes_percentage: 0,
      both_populated: 0,
      ratings_fetched_count: 0,
      pending_enrichment: 0,
      last_batch_run_at: null,
      status: 'idle'
    };
  }
}
