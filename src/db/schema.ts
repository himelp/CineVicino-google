import { pgTable, text, varchar, integer, real, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const cities = pgTable('cities', {
  id: varchar('id', { length: 64 }).primaryKey(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  name: varchar('name', { length: 128 }).notNull(),
  region: varchar('region', { length: 64 }).notNull(),
  province: varchar('province', { length: 64 }).notNull(),
  province_code: varchar('province_code', { length: 4 }).notNull(),
  is_provincial_capital: boolean('is_provincial_capital').default(false).notNull(),
  cadastral_code: varchar('cadastral_code', { length: 8 }),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  geocode_status: varchar('geocode_status', { length: 32 }).default('pending').notNull(), // 'pending' | 'complete' | 'not_found' | 'rate_limited' | 'error'
  geocoded_at: timestamp('geocoded_at'),
}, (table) => [
  index('idx_cities_slug').on(table.slug),
  index('idx_cities_region').on(table.region),
  index('idx_cities_prov_code').on(table.province_code),
]);

export const cinemas = pgTable('cinemas', {
  id: varchar('id', { length: 64 }).primaryKey(),
  city_id: varchar('city_id', { length: 64 }).notNull().references(() => cities.id),
  name: varchar('name', { length: 256 }).notNull(),
  chain: varchar('chain', { length: 64 }), // 'UCI', 'The Space Cinema', 'Notorious', 'Arcadia', 'Anteo', 'independent'
  address: text('address').notNull(),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  website_url: text('website_url').notNull(),
  features: jsonb('features').$type<string[]>(),
}, (table) => [
  index('idx_cinemas_city_id').on(table.city_id),
  index('idx_cinemas_chain').on(table.chain),
]);

export const movies = pgTable('movies', {
  id: varchar('id', { length: 64 }).primaryKey(),
  slug: varchar('slug', { length: 256 }).notNull().unique(),
  title_it: varchar('title_it', { length: 256 }).notNull(),
  title_en: varchar('title_en', { length: 256 }).notNull(),
  title_original: varchar('title_original', { length: 256 }).notNull(),
  tmdb_id: integer('tmdb_id'),
  poster_url: text('poster_url').notNull(),
  backdrop_url: text('backdrop_url').notNull(),
  genres: jsonb('genres').$type<string[]>().notNull(),
  duration_minutes: integer('duration_minutes').notNull(),
  rating: real('rating').default(0),
  synopsis_it: text('synopsis_it').notNull(),
  synopsis_en: text('synopsis_en').notNull(),
  release_year: integer('release_year').notNull(),
  director: varchar('director', { length: 128 }).notNull(),
  cast: jsonb('cast').$type<string[]>().notNull(),
  age_rating: varchar('age_rating', { length: 16 }).default('T'),
  is_featured: boolean('is_featured').default(false).notNull(),
}, (table) => [
  index('idx_movies_slug').on(table.slug),
  index('idx_movies_tmdb_id').on(table.tmdb_id),
]);

export const showtimes = pgTable('showtimes', {
  id: varchar('id', { length: 64 }).primaryKey(),
  movie_id: varchar('movie_id', { length: 64 }).notNull().references(() => movies.id),
  cinema_id: varchar('cinema_id', { length: 64 }).notNull().references(() => cinemas.id),
  show_date: varchar('show_date', { length: 16 }).notNull(), // 'YYYY-MM-DD'
  time: varchar('time', { length: 8 }).notNull(), // 'HH:MM'
  format: varchar('format', { length: 32 }).notNull().default('2D'), // '2D', '3D', 'IMAX', 'ISense', 'Atmos', '4DX'
  language: varchar('language', { length: 16 }).notNull().default('IT'), // 'IT', 'VOSE', 'OV', 'EN'
  ticket_url: text('ticket_url').notNull(),
  ticket_source: varchar('ticket_source', { length: 32 }).notNull(), // 'chain site', '18tickets', 'vivaticket', 'ticketone', 'liveticket', 'other'
  active: boolean('active').default(true).notNull(),
  clicks: integer('clicks').default(0).notNull(),
  scraped_at: timestamp('scraped_at').defaultNow().notNull(),
}, (table) => [
  index('idx_showtimes_movie_id').on(table.movie_id),
  index('idx_showtimes_cinema_id').on(table.cinema_id),
  index('idx_showtimes_date').on(table.show_date),
]);

export const users = pgTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  email: varchar('email', { length: 256 }).notNull().unique(),
  name: varchar('name', { length: 128 }).notNull(),
  password_hash: text('password_hash'),
  is_admin: boolean('is_admin').default(false).notNull(),
  reset_token: varchar('reset_token', { length: 128 }),
  reset_token_expires_at: timestamp('reset_token_expires_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_users_email').on(table.email),
]);

export const favorites = pgTable('favorites', {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 }).notNull().references(() => users.id),
  item_type: varchar('item_type', { length: 16 }).notNull(), // 'cinema' | 'movie'
  item_id: varchar('item_id', { length: 64 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_favorites_user_id').on(table.user_id),
]);

export const alertSubscriptions = pgTable('alert_subscriptions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  email: varchar('email', { length: 256 }).notNull(),
  city_id: varchar('city_id', { length: 64 }).notNull().references(() => cities.id),
  active: boolean('active').default(true).notNull(),
  confirmed: boolean('confirmed').default(false).notNull(),
  confirmation_token: varchar('confirmation_token', { length: 64 }),
  unsubscribe_token: varchar('unsubscribe_token', { length: 64 }),
  language: varchar('language', { length: 8 }).default('it').notNull(),
  last_notified_at: timestamp('last_notified_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_alerts_email').on(table.email),
  index('idx_alerts_city_id').on(table.city_id),
]);

export const scrapeLogs = pgTable('scrape_logs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  run_at: timestamp('run_at').defaultNow().notNull(),
  source: varchar('source', { length: 64 }).notNull(),
  cities_touched: integer('cities_touched').notNull(),
  cinemas_touched: integer('cinemas_touched').notNull(),
  movies_touched: integer('movies_touched').notNull(),
  showtimes_touched: integer('showtimes_touched').notNull(),
  firecrawl_credits_used: integer('firecrawl_credits_used').default(0).notNull(),
  status: varchar('status', { length: 32 }).notNull(),
  details: text('details').notNull(),
});

export const siteSettings = pgTable('site_settings', {
  key: varchar('key', { length: 64 }).primaryKey(),
  value: text('value').notNull(),
});

export const emailLogs = pgTable('email_logs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  recipient: varchar('recipient', { length: 256 }).notNull(),
  type: varchar('type', { length: 64 }).notNull(), // 'confirmation' | 'digest' | 'password_reset'
  subject: text('subject'),
  status: varchar('status', { length: 32 }).notNull(), // 'success' | 'failure'
  details: text('details'),
  sent_at: timestamp('sent_at').defaultNow().notNull(),
}, (table) => [
  index('idx_email_logs_recipient').on(table.recipient),
]);
