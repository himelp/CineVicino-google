import pg from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

export let pool: pg.Pool | null = null;
export let pgliteInstance: PGlite | null = null;
export let db: any = null;
export let isPglite = false;

// Initialize Database connection
export async function getDb() {
  if (db) return db;

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && !databaseUrl.includes('placeholder')) {
    try {
      pool = new Pool({
        connectionString: databaseUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test connectivity
      const client = await pool.connect();
      client.release();
      db = drizzlePg(pool, { schema });
      isPglite = false;
      console.log('✅ Connected to external PostgreSQL database via DATABASE_URL');
      return db;
    } catch (err: any) {
      console.warn('⚠️ Could not connect to DATABASE_URL, falling back to local persistent PostgreSQL (PGlite):', err.message);
      if (pool) {
        await pool.end().catch(() => {});
        pool = null;
      }
    }
  }

  // Fallback to embedded persistent PostgreSQL engine (PGlite)
  const dataDir = path.join(process.cwd(), 'data', 'pgdata');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  pgliteInstance = new PGlite(dataDir);
  db = drizzlePglite(pgliteInstance, { schema });
  isPglite = true;
  console.log(`✅ Initialized persistent embedded PostgreSQL engine at ${dataDir}`);
  return db;
}

// Execute raw SQL query across both pool or PGlite
export async function executeRawSql(query: string, params: any[] = []) {
  if (pool) {
    return await pool.query(query, params);
  }
  if (pgliteInstance) {
    return await pgliteInstance.query(query, params);
  }
  throw new Error('Database not initialized');
}

// Run schema migrations / table creations & indexes
export async function initDb() {
  await getDb();

  console.log('🔄 Running CineVicino PostgreSQL table migrations & indexes...');

  const ddlStatements = [
    // 1. Cities table
    `CREATE TABLE IF NOT EXISTS cities (
      id VARCHAR(64) PRIMARY KEY,
      slug VARCHAR(128) NOT NULL UNIQUE,
      name VARCHAR(128) NOT NULL,
      region VARCHAR(64) NOT NULL,
      province VARCHAR(64) NOT NULL,
      province_code VARCHAR(4) NOT NULL,
      is_provincial_capital BOOLEAN NOT NULL DEFAULT FALSE,
      cadastral_code VARCHAR(8),
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      geocode_status VARCHAR(32) NOT NULL DEFAULT 'pending',
      geocoded_at TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities (slug);`,
    `CREATE INDEX IF NOT EXISTS idx_cities_region ON cities (region);`,
    `CREATE INDEX IF NOT EXISTS idx_cities_prov_code ON cities (province_code);`,

    // 2. Cinemas table
    `CREATE TABLE IF NOT EXISTS cinemas (
      id VARCHAR(64) PRIMARY KEY,
      city_id VARCHAR(64) NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
      name VARCHAR(256) NOT NULL,
      chain VARCHAR(64),
      address TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      website_url TEXT NOT NULL,
      features JSONB
    );`,
    `CREATE INDEX IF NOT EXISTS idx_cinemas_city_id ON cinemas (city_id);`,
    `CREATE INDEX IF NOT EXISTS idx_cinemas_chain ON cinemas (chain);`,

    // 3. Movies table
    `CREATE TABLE IF NOT EXISTS movies (
      id VARCHAR(64) PRIMARY KEY,
      slug VARCHAR(256) NOT NULL UNIQUE,
      title_it VARCHAR(256) NOT NULL,
      title_en VARCHAR(256) NOT NULL,
      title_original VARCHAR(256) NOT NULL,
      tmdb_id INTEGER,
      poster_url TEXT NOT NULL,
      backdrop_url TEXT NOT NULL,
      genres JSONB NOT NULL,
      duration_minutes INTEGER NOT NULL,
      rating REAL DEFAULT 0,
      synopsis_it TEXT NOT NULL,
      synopsis_en TEXT NOT NULL,
      release_year INTEGER NOT NULL,
      director VARCHAR(128) NOT NULL,
      "cast" JSONB NOT NULL,
      age_rating VARCHAR(16) DEFAULT 'T',
      is_featured BOOLEAN NOT NULL DEFAULT FALSE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies (slug);`,
    `CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies (tmdb_id);`,

    // 4. Showtimes table
    `CREATE TABLE IF NOT EXISTS showtimes (
      id VARCHAR(64) PRIMARY KEY,
      movie_id VARCHAR(64) NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      cinema_id VARCHAR(64) NOT NULL REFERENCES cinemas(id) ON DELETE CASCADE,
      show_date VARCHAR(16) NOT NULL,
      time VARCHAR(8) NOT NULL,
      format VARCHAR(32) NOT NULL DEFAULT '2D',
      language VARCHAR(16) NOT NULL DEFAULT 'IT',
      ticket_url TEXT NOT NULL,
      ticket_source VARCHAR(32) NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      clicks INTEGER NOT NULL DEFAULT 0,
      scraped_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_showtimes_movie_id ON showtimes (movie_id);`,
    `CREATE INDEX IF NOT EXISTS idx_showtimes_cinema_id ON showtimes (cinema_id);`,
    `CREATE INDEX IF NOT EXISTS idx_showtimes_date ON showtimes (show_date);`,

    // 5. Users table
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(256) NOT NULL UNIQUE,
      name VARCHAR(128) NOT NULL,
      password_hash TEXT,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      reset_token VARCHAR(128),
      reset_token_expires_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);`,

    // 6. Favorites table
    `CREATE TABLE IF NOT EXISTS favorites (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_type VARCHAR(16) NOT NULL,
      item_id VARCHAR(64) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id);`,

    // 7. Alert subscriptions table
    `CREATE TABLE IF NOT EXISTS alert_subscriptions (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(256) NOT NULL,
      city_id VARCHAR(64) NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      confirmation_token VARCHAR(64),
      unsubscribe_token VARCHAR(64),
      language VARCHAR(8) NOT NULL DEFAULT 'it',
      last_notified_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_alerts_email ON alert_subscriptions (email);`,
    `CREATE INDEX IF NOT EXISTS idx_alerts_city_id ON alert_subscriptions (city_id);`,

    // 8. Scrape logs table
    `CREATE TABLE IF NOT EXISTS scrape_logs (
      id VARCHAR(64) PRIMARY KEY,
      run_at TIMESTAMP NOT NULL DEFAULT NOW(),
      source VARCHAR(64) NOT NULL,
      cities_touched INTEGER NOT NULL,
      cinemas_touched INTEGER NOT NULL,
      movies_touched INTEGER NOT NULL,
      showtimes_touched INTEGER NOT NULL,
      firecrawl_credits_used INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(32) NOT NULL,
      details TEXT NOT NULL
    );`,

    // 9. Site settings table
    `CREATE TABLE IF NOT EXISTS site_settings (
      key VARCHAR(64) PRIMARY KEY,
      value TEXT NOT NULL
    );`,

    // 10. Email logs table
    `CREATE TABLE IF NOT EXISTS email_logs (
      id VARCHAR(64) PRIMARY KEY,
      recipient VARCHAR(256) NOT NULL,
      type VARCHAR(64) NOT NULL,
      subject TEXT,
      status VARCHAR(32) NOT NULL,
      details TEXT,
      sent_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs (recipient);`
  ];

  for (const stmt of ddlStatements) {
    await executeRawSql(stmt);
  }

  console.log('✅ PostgreSQL tables and indexes verified successfully.');

  // Seed default admin user & default settings if not present
  await seedDefaults();
}

// Seed default settings and initial admin user with bcrypt password
async function seedDefaults() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@cinevicino.it';
  const adminPassword = process.env.ADMIN_PASSWORD || 'CineVicinoAdmin2026!';

  // Check if admin user exists or update password
  const adminHash = await bcrypt.hash(adminPassword, 12);
  await executeRawSql(
    `INSERT INTO users (id, email, name, password_hash, is_admin, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (email) DO UPDATE SET password_hash = $4, is_admin = TRUE`,
    ['usr-admin-initial', adminEmail.toLowerCase(), 'Amministratore CineVicino', adminHash, true]
  );

  // Seed default demo user for instant testing
  const demoHash = await bcrypt.hash('CinefiloPass2026!', 10);
  await executeRawSql(
    `INSERT INTO users (id, email, name, password_hash, is_admin, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (email) DO UPDATE SET password_hash = $4`,
    ['usr-demo-cinefilo', 'mario.rossi@cinefilo.it', 'Mario Rossi', demoHash, false]
  );
  console.log(`👤 Verified Admin (${adminEmail}) and Demo (mario.rossi@cinefilo.it) accounts.`);

  // Check site settings
  const defaultSettings = [
    ['homepage_headline_it', 'Il cinema più vicino, ovunque ti trovi.'],
    ['homepage_headline_en', 'The nearest cinema, wherever you are.'],
    ['homepage_subtext_it', 'Tutti i film e gli orari dei cinema in Italia, da Milano a Taormina. Per tutti i 7.894 comuni.'],
    ['homepage_subtext_en', 'All movies and showtimes across Italy, from Milan to Taormina. Covering all 7,894 municipalities.'],
    ['featured_movie_ids', JSON.stringify(['mov-dune-2', 'mov-oppenheimer', 'mov-c-e-ancora-domani'])],
    ['footer_text_it', 'CineVicino — La guida cinematografica per tutti i Comuni d\'Italia.'],
    ['footer_text_en', 'CineVicino — The cinema showtime guide for all Italian municipalities.'],
    ['privacy_policy_it', 'CineVicino rispetta la tua privacy e il GDPR. Non cediamo i tuoi dati a terzi.'],
    ['privacy_policy_en', 'CineVicino complies with GDPR. We do not sell your personal data.'],
    ['firecrawl_monthly_limit', '1000'],
    ['firecrawl_credits_used', '0'],
  ];

  for (const [k, v] of defaultSettings) {
    await executeRawSql(
      `INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [k, v]
    );
  }
}

// Graceful shutdown
export async function closeDb() {
  if (pool) {
    console.log('Closing PostgreSQL connection pool...');
    await pool.end().catch(() => {});
    pool = null;
  }
  if (pgliteInstance) {
    console.log('Closing PGlite database...');
    await pgliteInstance.close().catch(() => {});
    pgliteInstance = null;
  }
  db = null;
}
