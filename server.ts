import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { initDb, executeRawSql, closeDb } from './src/db/index';
import { cinemaScraper } from './src/services/scraper';
import { runBatchGeocoding } from './src/services/geocoder';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  generateResetToken,
  findUserByEmail,
  findUserById,
  authenticateToken,
  requireAuth,
  requireAdmin,
  AuthenticatedRequest
} from './src/services/auth';
import { sendConfirmationEmail, logEmail } from './src/services/email';
import { logger } from './src/utils/logger';
import { validateEnvironment } from './src/utils/env';
import {
  loginSchema,
  registerSchema,
  resetRequestSchema,
  resetPasswordSchema,
  alertSubscriptionSchema,
  favoriteSchema,
  movieUpdateSchema,
  cinemaUpdateSchema,
  toggleActiveSchema
} from './src/utils/validation';

const app = express();
const PORT = 3000;
const ADMIN_SLUG = process.env.ADMIN_SLUG || 'gestione-riservata-cv';

// Trust front-end reverse proxy / Cloud Run ingress for IP and protocol resolution
app.set('trust proxy', 1);

// 1. Startup validation (fail-fast)
try {
  validateEnvironment();
} catch (err: any) {
  logger.error(`Fatal startup configuration error: ${err.message}`);
  process.exit(1);
}

// 2. Global Security & Performance Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Allows Vite dev client & external CDNs (TMDb, OpenStreetMap, Unsplash)
  crossOriginEmbedderPolicy: false
}));

const allowedOrigins = process.env.APP_URL
  ? [process.env.APP_URL]
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.run.app') || origin.endsWith('.googleusercontent.com')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(authenticateToken); // Parses Authorization: Bearer <jwt>

// 3. Rate Limiters
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: 'Too Many Requests', message: 'Troppe richieste da questo indirizzo IP. Riprova più tardi.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: 'Too Many Requests', message: 'Troppi tentativi di accesso. Riprova tra 15 minuti.' }
});

const scraperLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: 'Too Many Requests', message: 'Limite esecuzione scraper raggiunto. Massimo 3 esecuzioni ogni 10 minuti.' }
});

app.use('/api/', globalApiLimiter);

// ==========================================
// PUBLIC API ROUTES
// ==========================================

// Health check with real PostgreSQL ping, uptime, and memory usage
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const t0 = Date.now();
    const dbTest = await executeRawSql('SELECT 1 as ping');
    const dbLatencyMs = Date.now() - t0;

    const statsRes = await executeRawSql(`
      SELECT
        (SELECT COUNT(*) FROM cities) as total_cities,
        (SELECT COUNT(*) FROM cinemas) as total_cinemas,
        (SELECT COUNT(*) FROM movies) as total_movies,
        (SELECT COUNT(*) FROM showtimes WHERE active = TRUE) as active_showtimes,
        (SELECT run_at FROM scrape_logs ORDER BY run_at DESC LIMIT 1) as last_scraped_at
    `);

    const stats = statsRes.rows[0];

    res.json({
      status: 'healthy',
      service: 'CineVicino API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      database: {
        status: dbTest.rows[0]?.ping === 1 ? 'connected' : 'degraded',
        latencyMs: dbLatencyMs,
        stats: {
          cities: parseInt(stats.total_cities || '0', 10),
          cinemas: parseInt(stats.total_cinemas || '0', 10),
          movies: parseInt(stats.total_movies || '0', 10),
          active_showtimes: parseInt(stats.active_showtimes || '0', 10),
          last_scraped_at: stats.last_scraped_at || null
        }
      }
    });
  } catch (err: any) {
    logger.error({ err }, 'Healthcheck failed');
    res.status(503).json({
      status: 'unhealthy',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Cities listing & search across all ~7,904 Italian comuni in PostgreSQL
app.get('/api/cities', async (req: Request, res: Response) => {
  try {
    const rawQuery = (req.query.q || req.query.query || req.query.search || '') as string;
    const query = rawQuery.trim();
    const region = req.query.region as string;
    const onlyWithCinemas = req.query.with_cinemas === 'true';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (query) {
      // Search normalization (Section 10 item 3): strip accents (Forlì -> forli, Cantù -> cantu)
      const normalized = query
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      const slugQuery = normalized.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

      conditions.push(
        `(name ILIKE $${pIdx} OR slug ILIKE $${pIdx + 1} OR province ILIKE $${pIdx} OR province_code ILIKE $${pIdx} OR region ILIKE $${pIdx})`
      );
      params.push(`%${query}%`, `%${slugQuery}%`);
      pIdx += 2;
    }

    if (region) {
      conditions.push(`LOWER(region) = LOWER($${pIdx})`);
      params.push(region);
      pIdx++;
    }

    if (onlyWithCinemas) {
      conditions.push(`id IN (SELECT DISTINCT city_id FROM cinemas)`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matches
    const countSql = `SELECT COUNT(*) as cnt FROM cities ${whereClause}`;
    const countRes = await executeRawSql(countSql, params);
    const total = parseInt(countRes.rows[0]?.cnt || '0', 10);

    // Fetch paginated cities with cinema count via subquery
    const fetchSql = `
      SELECT
        c.id, c.slug, c.name, c.region, c.province, c.province_code,
        c.is_provincial_capital, c.cadastral_code, c.lat, c.lng, c.geocode_status,
        (SELECT COUNT(*) FROM cinemas WHERE city_id = c.id) as cinema_count
      FROM cities c
      ${whereClause}
      ORDER BY
        (SELECT COUNT(*) FROM cinemas WHERE city_id = c.id) DESC,
        c.is_provincial_capital DESC,
        c.name ASC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;

    const citiesRes = await executeRawSql(fetchSql, [...params, limit, offset]);

    res.set('Cache-Control', 'public, max-age=300'); // 5 minute HTTP cache
    res.json({
      total,
      page,
      limit,
      cities: citiesRes.rows
    });
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/cities');
    res.status(500).json({ error: 'Errore durante la ricerca dei comuni' });
  }
});

// Single city info with cinemas OR nearest cinemas if none
app.get('/api/cities/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const cityRes = await executeRawSql(
      `SELECT c.*, (SELECT COUNT(*) FROM cinemas WHERE city_id = c.id) as cinema_count
       FROM cities c WHERE c.slug = $1 LIMIT 1`,
      [slug]
    );

    if (!cityRes.rows || cityRes.rows.length === 0) {
      return res.status(404).json({ error: 'Comune non trovato' });
    }

    const city = cityRes.rows[0];

    // Local cinemas
    const cinemasRes = await executeRawSql(
      `SELECT c.*, ci.name as city_name, ci.slug as city_slug
       FROM cinemas c
       JOIN cities ci ON c.city_id = ci.id
       WHERE c.city_id = $1`,
      [city.id]
    );
    const cityCinemas = cinemasRes.rows;

    // Find nearest cinemas across Italy using SQL Haversine formula
    const nearestRes = await executeRawSql(
      `SELECT
         c.*, ci.name as city_name, ci.slug as city_slug,
         (6371 * acos(
           cos(radians($1)) * cos(radians(c.lat)) *
           cos(radians(c.lng) - radians($2)) +
           sin(radians($1)) * sin(radians(c.lat))
         )) AS distance_km
       FROM cinemas c
       JOIN cities ci ON c.city_id = ci.id
       ORDER BY distance_km ASC
       LIMIT 6`,
      [city.lat, city.lng]
    );

    res.json({
      city,
      cinemas: cityCinemas,
      has_local_cinemas: cityCinemas.length > 0,
      nearest_cinemas: nearestRes.rows.map(r => ({
        ...r,
        distance_km: Math.round(r.distance_km * 10) / 10
      }))
    });
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/cities/:slug');
    res.status(500).json({ error: 'Errore nel caricamento del comune' });
  }
});

// Real-time Geolocation endpoint: calculates Haversine distance to all Italian cinemas in PostgreSQL
app.get('/api/nearby', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Coordinate lat e lng richieste e valide' });
    }

    // Nearest cinemas using SQL Haversine
    const cinemasRes = await executeRawSql(
      `SELECT
         c.*, ci.name as city_name, ci.slug as city_slug,
         (6371 * acos(
           cos(radians($1)) * cos(radians(c.lat)) *
           cos(radians(c.lng) - radians($2)) +
           sin(radians($1)) * sin(radians(c.lat))
         )) AS distance_km
       FROM cinemas c
       JOIN cities ci ON c.city_id = ci.id
       ORDER BY distance_km ASC
       LIMIT 10`,
      [lat, lng]
    );

    // Closest municipality
    const closestCityRes = await executeRawSql(
      `SELECT
         c.*,
         (6371 * acos(
           cos(radians($1)) * cos(radians(c.lat)) *
           cos(radians(c.lng) - radians($2)) +
           sin(radians($1)) * sin(radians(c.lat))
         )) AS distance_km
       FROM cities c
       ORDER BY distance_km ASC
       LIMIT 1`,
      [lat, lng]
    );

    const closestCity = closestCityRes.rows[0];
    if (closestCity) {
      closestCity.distance_km = Math.round(closestCity.distance_km * 10) / 10;
    }

    res.json({
      user_location: { lat, lng },
      closest_city: closestCity || null,
      cinemas: cinemasRes.rows.map(r => ({
        ...r,
        distance_km: Math.round(r.distance_km * 10) / 10
      }))
    });
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/nearby');
    res.status(500).json({ error: 'Errore durante la geolocalizzazione' });
  }
});

// Cinemas listing & filtering with SQL joins
app.get('/api/cinemas', async (req: Request, res: Response) => {
  try {
    const citySlug = req.query.city as string;
    const chain = req.query.chain as string;
    const query = (req.query.q as string || '').trim();

    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (citySlug) {
      conditions.push(`ci.slug = $${pIdx}`);
      params.push(citySlug);
      pIdx++;
    }

    if (chain && chain !== 'all') {
      if (chain === 'independent') {
        conditions.push(`(c.chain IS NULL OR c.chain = 'independent')`);
      } else {
        conditions.push(`c.chain = $${pIdx}`);
        params.push(chain);
        pIdx++;
      }
    }

    if (query) {
      conditions.push(`(c.name ILIKE $${pIdx} OR c.address ILIKE $${pIdx} OR ci.name ILIKE $${pIdx})`);
      params.push(`%${query}%`);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        c.*, ci.name as city_name, ci.slug as city_slug
      FROM cinemas c
      JOIN cities ci ON c.city_id = ci.id
      ${whereClause}
      ORDER BY c.name ASC
    `;

    const result = await executeRawSql(sql, params);
    res.set('Cache-Control', 'public, max-age=180');
    res.json(result.rows);
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/cinemas');
    res.status(500).json({ error: 'Errore nel caricamento dei cinema' });
  }
});

// Single cinema with active showtimes
app.get('/api/cinemas/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cinemaRes = await executeRawSql(
      `SELECT c.*, ci.name as city_name, ci.slug as city_slug
       FROM cinemas c
       JOIN cities ci ON c.city_id = ci.id
       WHERE c.id = $1 OR c.slug = $1 LIMIT 1`,
      [id]
    );

    if (!cinemaRes.rows || cinemaRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cinema non trovato' });
    }

    const cinema = cinemaRes.rows[0];

    const showtimesRes = await executeRawSql(
      `SELECT
         s.*, m.title_it as movie_title, m.poster_url as movie_poster
       FROM showtimes s
       JOIN movies m ON s.movie_id = m.id
       WHERE s.cinema_id = $1 AND s.active = TRUE
       ORDER BY s.show_date ASC, s.time ASC`,
      [cinema.id]
    );

    res.json({
      cinema,
      showtimes: showtimesRes.rows
    });
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/cinemas/:id');
    res.status(500).json({ error: 'Errore nel caricamento del cinema' });
  }
});

// Movies listing & search
app.get('/api/movies', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim();
    const genre = req.query.genre as string;
    const featuredOnly = req.query.featured === 'true';

    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (query) {
      conditions.push(`(title_it ILIKE $${pIdx} OR title_original ILIKE $${pIdx} OR director ILIKE $${pIdx})`);
      params.push(`%${query}%`);
      pIdx++;
    }

    if (genre && genre !== 'all') {
      conditions.push(`genres @> $${pIdx}::jsonb`);
      params.push(JSON.stringify([genre]));
      pIdx++;
    }

    if (featuredOnly) {
      conditions.push(`is_featured = TRUE`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT * FROM movies
      ${whereClause}
      ORDER BY is_featured DESC, rating DESC, title_it ASC
    `;

    const result = await executeRawSql(sql, params);
    res.set('Cache-Control', 'public, max-age=180');
    res.json(result.rows);
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/movies');
    res.status(500).json({ error: 'Errore nel caricamento dei film' });
  }
});

// Single movie detail by slug with all active showtimes joined with cinema & city
app.get('/api/movies/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const movieRes = await executeRawSql(
      `SELECT * FROM movies WHERE slug = $1 LIMIT 1`,
      [slug]
    );

    if (!movieRes.rows || movieRes.rows.length === 0) {
      return res.status(404).json({ error: 'Film non trovato' });
    }

    const movie = movieRes.rows[0];

    const showtimesRes = await executeRawSql(
      `SELECT
         s.*,
         c.name as cinema_name, c.chain as cinema_chain, c.address as cinema_address,
         ci.name as city_name, ci.slug as city_slug
       FROM showtimes s
       JOIN cinemas c ON s.cinema_id = c.id
       JOIN cities ci ON c.city_id = ci.id
       WHERE s.movie_id = $1 AND s.active = TRUE
       ORDER BY s.show_date ASC, s.time ASC`,
      [movie.id]
    );

    res.json({
      movie,
      showtimes: showtimesRes.rows
    });
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/movies/:slug');
    res.status(500).json({ error: 'Errore nel caricamento del film' });
  }
});

// Showtimes query with multi-filtering
app.get('/api/showtimes', async (req: Request, res: Response) => {
  try {
    const movieId = req.query.movie_id as string;
    const cinemaId = req.query.cinema_id as string;
    const citySlug = req.query.city as string;
    const date = req.query.date as string;
    const format = req.query.format as string;
    const language = req.query.language as string;

    const conditions: string[] = ['s.active = TRUE'];
    const params: any[] = [];
    let pIdx = 1;

    if (movieId) {
      conditions.push(`s.movie_id = $${pIdx}`);
      params.push(movieId);
      pIdx++;
    }

    if (cinemaId) {
      conditions.push(`s.cinema_id = $${pIdx}`);
      params.push(cinemaId);
      pIdx++;
    }

    if (citySlug) {
      conditions.push(`ci.slug = $${pIdx}`);
      params.push(citySlug);
      pIdx++;
    }

    if (date) {
      conditions.push(`s.show_date = $${pIdx}`);
      params.push(date);
      pIdx++;
    }

    if (format && format !== 'all') {
      conditions.push(`s.format = $${pIdx}`);
      params.push(format);
      pIdx++;
    }

    if (language && language !== 'all') {
      conditions.push(`s.language = $${pIdx}`);
      params.push(language);
      pIdx++;
    }

    const sql = `
      SELECT
        s.*,
        m.title_it as movie_title, m.poster_url as movie_poster,
        c.name as cinema_name, c.chain as cinema_chain, c.address as cinema_address,
        ci.name as city_name, ci.slug as city_slug
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      JOIN cinemas c ON s.cinema_id = c.id
      JOIN cities ci ON c.city_id = ci.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.show_date ASC, s.time ASC
      LIMIT 300
    `;

    const result = await executeRawSql(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/showtimes');
    res.status(500).json({ error: 'Errore nel caricamento degli orari' });
  }
});

// Section 8: Ticket Click-Through Tracking
app.post('/api/showtimes/:id/click', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await executeRawSql(
      `UPDATE showtimes
       SET clicks = clicks + 1
       WHERE id = $1
       RETURNING id, ticket_url, clicks`,
      [id]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Orario non trovato' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      showtime_id: row.id,
      ticket_url: row.ticket_url,
      clicks: row.clicks
    });
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/showtimes/:id/click');
    res.status(500).json({ error: 'Errore nella registrazione del click' });
  }
});

// Public Site Settings
app.get('/api/settings', async (req: Request, res: Response) => {
  try {
    const resSettings = await executeRawSql('SELECT key, value FROM site_settings');
    const settingsObj: Record<string, any> = {};
    for (const r of resSettings.rows) {
      try {
        settingsObj[r.key] = JSON.parse(r.value);
      } catch {
        settingsObj[r.key] = r.value;
      }
    }
    res.json(settingsObj);
  } catch (err: any) {
    logger.error({ err }, 'Error fetching settings');
    res.status(500).json({ error: 'Errore nel caricamento delle impostazioni' });
  }
});

// ==========================================
// AUTHENTICATION & USER MANAGEMENT
// ==========================================

// Register new user
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { email, password, name } = parsed.data;

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Questo indirizzo email è già registrato' });
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    await executeRawSql(
      `INSERT INTO users (id, email, name, password_hash, is_admin, created_at)
       VALUES ($1, $2, $3, $4, FALSE, NOW())`,
      [userId, email.toLowerCase(), name, passwordHash]
    );

    const user = { id: userId, email: email.toLowerCase(), name, is_admin: false, created_at: new Date().toISOString() };
    const token = generateSessionToken(user);

    res.status(201).json({ success: true, token, user });
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/auth/register');
    res.status(500).json({ error: 'Errore durante la registrazione' });
  }
});

// Login (Strict rate limiting applied)
app.post('/api/auth/login', authLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { email, password } = parsed.data;

  try {
    const user = await findUserByEmail(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      is_admin: user.is_admin,
      created_at: user.created_at
    };

    const token = generateSessionToken(authUser);
    res.json({ success: true, token, user: authUser });
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/auth/login');
    res.status(500).json({ error: 'Errore durante il login' });
  }
});

// Current authenticated user (Requires valid session token)
app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// Request Password Reset
app.post('/api/auth/reset-request', async (req: Request, res: Response) => {
  const parsed = resetRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { email } = parsed.data;

  try {
    const user = await findUserByEmail(email);
    if (user) {
      const { token, expiresAt } = generateResetToken();
      await executeRawSql(
        `UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3`,
        [token, expiresAt.toISOString(), user.id]
      );
      // Log for audit
      await logEmail(email, 'password_reset', 'Recupero Password CineVicino', 'pending', `Token valido 1 ora`);
    }

    // Always return 200 to prevent email enumeration
    res.json({ success: true, message: 'Se l\'email è registrata, riceverai a breve un link di recupero.' });
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/auth/reset-request');
    res.status(500).json({ error: 'Errore durante la richiesta di recupero' });
  }
});

// Complete Password Reset
app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { token, newPassword } = parsed.data;

  try {
    const userRes = await executeRawSql(
      `SELECT id, reset_token_expires_at FROM users WHERE reset_token = $1`,
      [token]
    );

    if (!userRes.rows || userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Token di recupero non valido o scaduto' });
    }

    const user = userRes.rows[0];
    if (new Date(user.reset_token_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token di recupero scaduto. Richiedine uno nuovo.' });
    }

    const newHash = await hashPassword(newPassword);
    await executeRawSql(
      `UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL WHERE id = $2`,
      [newHash, user.id]
    );

    res.json({ success: true, message: 'Password aggiornata con successo. Ora puoi effettuare il login.' });
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/auth/reset-password');
    res.status(500).json({ error: 'Errore durante l\'aggiornamento della password' });
  }
});

// User Favorites (Persistent in PostgreSQL)
app.get('/api/favorites', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await executeRawSql(
      `SELECT * FROM favorites WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    logger.error({ err }, 'Error in GET /api/favorites');
    res.status(500).json({ error: 'Errore nel caricamento dei preferiti' });
  }
});

app.post('/api/favorites', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = favoriteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { item_type, item_id } = parsed.data;

  try {
    const favId = `fav-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await executeRawSql(
      `INSERT INTO favorites (id, user_id, item_type, item_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [favId, req.user!.id, item_type, item_id]
    );
    res.status(201).json({ success: true, id: favId });
  } catch (err: any) {
    logger.error({ err }, 'Error in POST /api/favorites');
    res.status(500).json({ error: 'Errore nel salvataggio del preferito' });
  }
});

app.delete('/api/favorites/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await executeRawSql(
      `DELETE FROM favorites WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.id]
    );
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'Error in DELETE /api/favorites');
    res.status(500).json({ error: 'Errore nella cancellazione del preferito' });
  }
});

// ==========================================
// SECTION 9: NEWSLETTER / ALERTS
// ==========================================

// Subscribe with Double Opt-in
app.post('/api/alerts', async (req: Request, res: Response) => {
  const parsed = alertSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { email, city_id } = parsed.data;

  try {
    const cityRes = await executeRawSql('SELECT name FROM cities WHERE id = $1', [city_id]);
    const cityName = cityRes.rows[0]?.name || 'la tua città';

    const subId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const confirmToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const unsubscribeToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

    await executeRawSql(
      `INSERT INTO alert_subscriptions (
         id, email, city_id, active, confirmed, confirmation_token, unsubscribe_token, created_at
       ) VALUES ($1, $2, $3, TRUE, FALSE, $4, $5, NOW())`,
      [subId, email.toLowerCase(), city_id, confirmToken, unsubscribeToken]
    );

    // Send Double Opt-in confirmation email
    await sendConfirmationEmail(email, cityName, confirmToken, unsubscribeToken);

    res.status(201).json({
      success: true,
      message: `Abbiamo inviato un'email di conferma a ${email}. Clicca sul link per attivare gli avvisi.`
    });
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/alerts');
    res.status(500).json({ error: 'Errore durante l\'iscrizione agli avvisi' });
  }
});

// Confirm Double Opt-in
app.get('/api/alerts/confirm', async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(400).send('Token di conferma mancante.');
  }

  try {
    const result = await executeRawSql(
      `UPDATE alert_subscriptions
       SET confirmed = TRUE
       WHERE confirmation_token = $1
       RETURNING id, email`,
      [token]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).send('Token di conferma non valido o già utilizzato.');
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <body style="background: #0a0a0a; color: #fff; font-family: sans-serif; text-align: center; padding: 60px 20px;">
          <h1 style="color: #38bdf8;">Iscrizione confermata con successo!</h1>
          <p style="color: #94a3b8; font-size: 16px;">Riceverai gli avvisi sulle nuove uscite cinematografiche nella tua zona.</p>
          <a href="/" style="display: inline-block; margin-top: 20px; background: #D4AF37; color: #000; padding: 10px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold;">Torna a CineVicino</a>
        </body>
      </html>
    `);
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/alerts/confirm');
    res.status(500).send('Errore durante la conferma dell\'iscrizione.');
  }
});

// 1-Click Unsubscribe
app.get('/api/alerts/unsubscribe', async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(400).send('Token di disiscrizione mancante.');
  }

  try {
    await executeRawSql(
      `UPDATE alert_subscriptions SET active = FALSE WHERE unsubscribe_token = $1`,
      [token]
    );

    res.send(`
      <!DOCTYPE html>
      <html>
        <body style="background: #0a0a0a; color: #fff; font-family: sans-serif; text-align: center; padding: 60px 20px;">
          <h1 style="color: #ef4444;">Disiscrizione completata</h1>
          <p style="color: #94a3b8; font-size: 16px;">Non riceverai più notifiche email per questo comune.</p>
          <a href="/" style="display: inline-block; margin-top: 20px; background: #262626; color: #fff; padding: 10px 24px; border-radius: 9999px; text-decoration: none;">Torna alla Home</a>
        </body>
      </html>
    `);
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/alerts/unsubscribe');
    res.status(500).send('Errore durante la disiscrizione.');
  }
});

// ==========================================
// SECTIONS 2 & 3: RESTRICTED ADMIN API
// ==========================================

// Admin Status Overview
app.get('/api/admin/status', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await executeRawSql(`
      SELECT
        (SELECT COUNT(*) FROM cities) as total_cities,
        (SELECT COUNT(*) FROM cities WHERE geocode_status = 'complete') as geocoded_cities,
        (SELECT COUNT(*) FROM cinemas) as total_cinemas,
        (SELECT COUNT(*) FROM movies) as total_movies,
        (SELECT COUNT(*) FROM showtimes WHERE active = TRUE) as active_showtimes,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM alert_subscriptions WHERE active = TRUE) as alert_subscribers,
        (SELECT run_at FROM scrape_logs ORDER BY run_at DESC LIMIT 1) as last_scrape_time
    `);

    res.json(stats.rows[0]);
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/admin/status');
    res.status(500).json({ error: 'Errore nel recupero dello stato di sistema' });
  }
});

// Admin Scraper: Run Real Cheerio Scrape (Strict rate limiting applied)
app.post('/api/admin/scrape/run', requireAdmin, scraperLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetCity = (req.query.city as string) || req.body?.city;
    const targetLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : req.body?.limit;
    logger.info({ user: req.user!.email, targetCity, targetLimit }, 'Admin triggered real Cheerio cinema scrape');
    const result = await cinemaScraper.executeFullScrape({
      useFirecrawl: req.body?.useFirecrawl === true,
      city: targetCity,
      limit: targetLimit
    });
    res.json({ success: true, result });
  } catch (err: any) {
    logger.error({ err }, 'Error executing admin scrape');
    res.status(500).json({ error: 'Errore durante l\'esecuzione dello scraping', details: err?.message });
  }
});

// Admin Scraper Logs
app.get('/api/admin/scrape/logs', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await executeRawSql('SELECT * FROM scrape_logs ORDER BY run_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/admin/scrape/logs');
    res.status(500).json({ error: 'Errore nel recupero dei log' });
  }
});

// Admin Email Logs
app.get('/api/admin/email/logs', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await executeRawSql('SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/admin/email/logs');
    res.status(500).json({ error: 'Errore nel recupero dei log email' });
  }
});

// Admin Geocoding Runner
app.post('/api/admin/geocode/run', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.body?.limit as string) || 5));
    const result = await runBatchGeocoding({ limit });
    res.json({ success: true, result });
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/admin/geocode/run');
    res.status(500).json({ error: 'Errore durante la geocodifica' });
  }
});

// Admin Settings: Read & Write
app.get('/api/admin/settings', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await executeRawSql('SELECT key, value FROM site_settings');
    const settings: Record<string, any> = {};
    for (const r of result.rows) {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch {
        settings[r.key] = r.value;
      }
    }
    res.json(settings);
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/admin/settings');
    res.status(500).json({ error: 'Errore nel recupero delle impostazioni' });
  }
});

app.put('/api/admin/settings', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await executeRawSql(
        `INSERT INTO site_settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, valStr]
      );
    }
    res.json({ success: true, message: 'Impostazioni aggiornate con successo' });
  } catch (err: any) {
    logger.error({ err }, 'Error updating settings');
    res.status(500).json({ error: 'Errore durante il salvataggio delle impostazioni' });
  }
});

// Admin Content Management
app.post('/api/admin/content/movie', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = movieUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { id, title_it, title_en, synopsis_it, rating, poster_url, backdrop_url, is_featured } = parsed.data;

  try {
    await executeRawSql(
      `UPDATE movies SET
         title_it = COALESCE($1, title_it),
         title_en = COALESCE($2, title_en),
         synopsis_it = COALESCE($3, synopsis_it),
         rating = COALESCE($4, rating),
         poster_url = COALESCE($5, poster_url),
         backdrop_url = COALESCE($6, backdrop_url),
         is_featured = COALESCE($7, is_featured)
       WHERE id = $8`,
      [title_it, title_en, synopsis_it, rating, poster_url, backdrop_url, is_featured, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'Error updating movie');
    res.status(500).json({ error: 'Errore durante l\'aggiornamento del film' });
  }
});

app.post('/api/admin/content/cinema', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = cinemaUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { id, name, address, website_url, features } = parsed.data;

  try {
    await executeRawSql(
      `UPDATE cinemas SET
         name = COALESCE($1, name),
         address = COALESCE($2, address),
         website_url = COALESCE($3, website_url),
         features = COALESCE($4, features)
       WHERE id = $5`,
      [name, address, website_url, features ? JSON.stringify(features) : null, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'Error updating cinema');
    res.status(500).json({ error: 'Errore durante l\'aggiornamento del cinema' });
  }
});

app.post('/api/admin/content/toggle-active', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = toggleActiveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { showtime_id, active } = parsed.data;

  try {
    await executeRawSql(
      `UPDATE showtimes SET active = $1 WHERE id = $2`,
      [active, showtime_id]
    );
    res.json({ success: true, active });
  } catch (err: any) {
    logger.error({ err }, 'Error toggling showtime active status');
    res.status(500).json({ error: 'Errore durante l\'aggiornamento dell\'orario' });
  }
});

// Admin Content Data Endpoint
app.get('/api/admin/content/all', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [citiesCountRes, cinemasRes, moviesRes, showtimesRes] = await Promise.all([
      executeRawSql('SELECT COUNT(*) as count FROM cities'),
      executeRawSql('SELECT c.*, ci.name as city_name, ci.slug as city_slug FROM cinemas c JOIN cities ci ON c.city_id = ci.id ORDER BY c.name ASC'),
      executeRawSql('SELECT * FROM movies ORDER BY title_it ASC'),
      executeRawSql('SELECT s.*, m.title_it as movie_title, c.name as cinema_name FROM showtimes s JOIN movies m ON s.movie_id = m.id JOIN cinemas c ON s.cinema_id = c.id ORDER BY s.show_date DESC LIMIT 300')
    ]);

    res.json({
      citiesCount: parseInt(citiesCountRes.rows[0]?.count || '0', 10),
      cinemasCount: cinemasRes.rows.length,
      moviesCount: moviesRes.rows.length,
      showtimesCount: showtimesRes.rows.length,
      activeShowtimesCount: showtimesRes.rows.filter((s: any) => s.active).length,
      cinemas: cinemasRes.rows,
      movies: moviesRes.rows,
      showtimes: showtimesRes.rows
    });
  } catch (err: any) {
    logger.error({ err }, 'Error in /api/admin/content/all');
    res.status(500).json({ error: 'Errore nel recupero dei contenuti' });
  }
});

const getPublicSiteUrl = (): string => {
  const envUrl = process.env.SITE_URL || process.env.PUBLIC_BASE_URL || process.env.APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'https://cinemavicino.minhazbinsanto.com';
};

// Robots.txt Handler (Section 4 item 2)
app.get('/robots.txt', (req: Request, res: Response) => {
  const publicUrl = getPublicSiteUrl();
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /gestione-riservata-cv/
Disallow: /admin/
Disallow: /api/admin/
Disallow: /api/auth/

Sitemap: ${publicUrl}/sitemap.xml
`);
});

// Dynamic Sitemap.xml Handler
app.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const publicUrl = getPublicSiteUrl();
    const [citiesRes, moviesRes] = await Promise.all([
      executeRawSql('SELECT slug FROM cities WHERE is_provincial_capital = TRUE LIMIT 120'),
      executeRawSql('SELECT slug FROM movies LIMIT 200')
    ]);

    const urls = [
      `${publicUrl}/`,
      `${publicUrl}/film`,
      `${publicUrl}/comuni`
    ];

    for (const c of citiesRes.rows) {
      urls.push(`${publicUrl}/citta/${c.slug}`);
      urls.push(`${publicUrl}/cinema/${c.slug}`);
    }

    for (const m of moviesRes.rows) {
      urls.push(`${publicUrl}/film/${m.slug}`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u}</loc>
    <changefreq>daily</changefreq>
    <priority>${u === publicUrl + '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.type('application/xml');
    res.send(xml);
  } catch (err: any) {
    logger.error({ err }, 'Error generating sitemap.xml');
    res.status(500).send('Error generating sitemap');
  }
});

// 4. Global Error Handler (Section 5 item 5)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled application error');
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Si è verificato un errore interno al server.',
    code: 500
  });
});

// ==========================================
// DYNAMIC SEO & SOCIAL META INJECTION
// ==========================================

function escapeHtml(str: string = ''): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function getPageMeta(reqPath: string, host: string): Promise<{
  title: string;
  description: string;
  image?: string;
  url: string;
  jsonLd?: any;
} | null> {
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  // 1. Film route: /film/:slug
  const filmMatch = reqPath.match(/^\/film\/([a-zA-Z0-9_-]+)\/?$/);
  if (filmMatch) {
    const slug = filmMatch[1];
    try {
      const movieRes = await executeRawSql(
        'SELECT * FROM movies WHERE slug = $1 LIMIT 1',
        [slug]
      );
      if (movieRes.rows && movieRes.rows.length > 0) {
        const m = movieRes.rows[0];
        const title = `${m.title_it} (${m.release_year}) — Cinema e Orari Spettacoli | CineVicino`;
        const desc = m.synopsis_it 
          ? `${m.title_it} (${m.release_year}, regia di ${m.director}). ${m.synopsis_it.slice(0, 150)}... Orari e biglietti ufficiali.`
          : `Orari spettacoli nei cinema italiani e biglietti ufficiali per ${m.title_it} diretto da ${m.director}.`;
        return {
          title,
          description: desc,
          image: m.poster_url || m.backdrop_url,
          url: `${baseUrl}/film/${m.slug}`,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Movie',
            name: m.title_it,
            director: { '@type': 'Person', name: m.director },
            image: m.poster_url,
            description: m.synopsis_it,
            datePublished: String(m.release_year),
            url: `${baseUrl}/film/${m.slug}`
          }
        };
      }
    } catch (e) {
      logger.error({ e }, 'Error fetching movie meta');
    }
  }

  // 2. Cinema route: /cinema/:slug
  const cinemaMatch = reqPath.match(/^\/cinema\/([a-zA-Z0-9_-]+)\/?$/);
  if (cinemaMatch) {
    const slug = cinemaMatch[1];
    try {
      const cinRes = await executeRawSql(
        `SELECT c.*, ci.name as city_name, ci.slug as city_slug, ci.province_code 
         FROM cinemas c 
         LEFT JOIN cities ci ON c.city_id = ci.id 
         WHERE c.slug = $1 OR c.id = $1 OR c.id = ('cin-' || $1) 
         LIMIT 1`,
        [slug]
      );
      if (cinRes.rows && cinRes.rows.length > 0) {
        const c = cinRes.rows[0];
        const cityName = c.city_name ? `${c.city_name} (${c.province_code})` : 'Italia';
        const title = `${c.name} (${cityName}) — Film in Programmazione & Orari | CineVicino`;
        const desc = `Consulta la programmazione completa, gli orari degli spettacoli e acquista i biglietti ufficiali per il cinema ${c.name} in ${c.address}.`;
        return {
          title,
          description: desc,
          image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
          url: `${baseUrl}/cinema/${slug}`,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'MovieTheater',
            name: c.name,
            address: c.address,
            url: `${baseUrl}/cinema/${slug}`
          }
        };
      }
    } catch (e) {
      logger.error({ e }, 'Error fetching cinema meta');
    }
  }

  // 3. City route: /citta/:slug or /city/:slug
  const cityMatch = reqPath.match(/^\/(citta|city)\/([a-zA-Z0-9_-]+)\/?$/);
  if (cityMatch) {
    const slug = cityMatch[2];
    try {
      const cityRes = await executeRawSql(
        'SELECT * FROM cities WHERE slug = $1 LIMIT 1',
        [slug]
      );
      if (cityRes.rows && cityRes.rows.length > 0) {
        const ci = cityRes.rows[0];
        const title = `Cinema a ${ci.name} (${ci.province_code}) — Film in Programmazione & Sale | CineVicino`;
        const desc = `Scopri tutti i cinema, multisala e sale d'essai a ${ci.name} (${ci.region}). Orari sempre aggiornati e link alle biglietterie ufficiali senza commissioni.`;
        return {
          title,
          description: desc,
          image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80',
          url: `${baseUrl}/citta/${ci.slug}`,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Place',
            name: `Cinema a ${ci.name}`,
            address: {
              '@type': 'PostalAddress',
              addressLocality: ci.name,
              addressRegion: ci.region,
              addressCountry: 'IT'
            },
            url: `${baseUrl}/citta/${ci.slug}`
          }
        };
      }
    } catch (e) {
      logger.error({ e }, 'Error fetching city meta');
    }
  }

  return null;
}

function injectMeta(html: string, meta: {
  title: string;
  description: string;
  image?: string;
  url: string;
  jsonLd?: any;
}): string {
  let updated = html;

  // Title tags
  updated = updated.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);
  updated = updated.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${escapeHtml(meta.title)}" />`);

  // Description tags
  updated = updated.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeHtml(meta.description)}" />`);
  updated = updated.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${escapeHtml(meta.description)}" />`);

  // Open Graph URL & Canonical
  if (meta.url) {
    const urlTag = `<meta property="og:url" content="${escapeHtml(meta.url)}" />\n    <link rel="canonical" href="${escapeHtml(meta.url)}" />`;
    updated = updated.replace('</head>', `    ${urlTag}\n  </head>`);
  }

  // Open Graph Image
  if (meta.image) {
    const imgTag = `<meta property="og:image" content="${escapeHtml(meta.image)}" />\n    <meta name="twitter:image" content="${escapeHtml(meta.image)}" />`;
    updated = updated.replace('</head>', `    ${imgTag}\n  </head>`);
  }

  // JSON-LD structured data
  if (meta.jsonLd) {
    const jsonLdTag = `<script type="application/ld+json">\n${JSON.stringify(meta.jsonLd, null, 2)}\n    </script>`;
    updated = updated.replace('</head>', `    ${jsonLdTag}\n  </head>`);
  }

  return updated;
}

// ==========================================
// BOOTSTRAP SERVER & VITE INTEGRATION
// ==========================================

async function startServer() {
  try {
    // Initialize PostgreSQL schema, tables, indexes, and defaults
    await initDb();

    // In development, hook up Vite middleware; in production, serve dist static files
    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });

      // Intercept dynamic SEO routes in development
      app.get(['/film/:slug', '/cinema/:slug', '/citta/:slug', '/city/:slug'], async (req, res, next) => {
        try {
          const rawHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
          const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
          const meta = await getPageMeta(req.path, req.get('host') || 'localhost:3000');
          const finalHtml = meta ? injectMeta(transformed, meta) : transformed;
          res.type('html').send(finalHtml);
        } catch (e) {
          next(e);
        }
      });

      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));

      app.get('*', async (req, res) => {
        try {
          const indexHtmlPath = path.join(distPath, 'index.html');
          if (fs.existsSync(indexHtmlPath)) {
            const rawHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
            const meta = await getPageMeta(req.path, req.get('host') || 'cinemavicino.minhazbinsanto.com');
            if (meta) {
              const htmlWithMeta = injectMeta(rawHtml, meta);
              return res.type('html').send(htmlWithMeta);
            }
            return res.type('html').send(rawHtml);
          }
          res.sendFile(indexHtmlPath);
        } catch (err) {
          res.sendFile(path.join(distPath, 'index.html'));
        }
      });
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 CineVicino Production Server listening on http://0.0.0.0:${PORT}`);
      logger.info(`🛡️ Admin area configured at: /${ADMIN_SLUG}`);
    });

    // Graceful shutdown handling (Section 10 item 3)
    const handleShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down CineVicino server gracefully...`);
      server.close(async () => {
        await closeDb();
        logger.info('Closed database connections and HTTP server. Exiting.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

  } catch (err: any) {
    logger.error({ err }, 'Fatal error during server startup');
    process.exit(1);
  }
}

startServer();
