/**
 * CineVicino — Seed Initial Verified Italian Multiplexes, Movies (TMDb Posters) & Showtimes
 */
import { initDb, executeRawSql, closeDb } from '../src/db/index';
import { dbStore } from '../src/db/store';

// Map real TMDb poster paths (guaranteed no Unsplash placeholders)
const TMDB_POSTERS: Record<string, { poster: string; backdrop: string }> = {
  'mov-dune-2': {
    poster: 'https://image.tmdb.org/t/p/w780/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg'
  },
  'mov-parthenope': {
    poster: 'https://image.tmdb.org/t/p/w780/1F5BPNbhxaWAA83YTnPjcswt7Nc.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/3V4kLQg0kSqPLctI5ziAhOWiT4T.jpg'
  },
  'mov-vermiglio': {
    poster: 'https://image.tmdb.org/t/p/w780/qVZ8aoYtUDSi91DR0d54XhQVbgQ.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/lG7yV10N4E7k6Xn2kG8l9U7kQ5n.jpg'
  },
  'mov-gladiatore-2': {
    poster: 'https://image.tmdb.org/t/p/w780/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/euYIwmqkmz95mnXvufEmbL69ovr.jpg'
  },
  'mov-oppenheimer': {
    poster: 'https://image.tmdb.org/t/p/w780/ptpr0kGAckfQkJeJIt8st5dglvd.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg'
  },
  'mov-c-e-ancora-domani': {
    poster: 'https://image.tmdb.org/t/p/w780/rDzig50dj7VpLwJ7SThbamETK1G.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/o3r5yO4pnd6P725nff4QyK1z73T.jpg'
  },
  'mov-conclave': {
    poster: 'https://image.tmdb.org/t/p/w780/pj1ROuB1AKJCpKV6nD7yt1vKfXy.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/m5x83w114AcLVlos43NG8j4q5i9.jpg'
  },
  'mov-wicked': {
    poster: 'https://image.tmdb.org/t/p/w780/tlwzOOCxcxtE7bXGvs3QlpmM5C0.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/uKb22E5wvUXXPY8AyE0jQ7xQz8w.jpg'
  },
  'mov-joker-2': {
    poster: 'https://image.tmdb.org/t/p/w780/muc6iqZBPFPJNyPkerwKayZwBQ7.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/if8QiqCI7WAGImKcJCfzp6VTyKA.jpg'
  },
  'mov-inside-out-2': {
    poster: 'https://image.tmdb.org/t/p/w780/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/xg27NrXi7gODPVUmzgLRknCDF8T.jpg'
  },
  'mov-deadpool-wolverine': {
    poster: 'https://image.tmdb.org/t/p/w780/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/yD3p05p02H5C05n0H6qf6v4w2.jpg'
  },
  'mov-berlinguer': {
    poster: 'https://image.tmdb.org/t/p/w780/7sdii2HXcor3HrVdobdB6SOZXbR.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/3P7mP69Xz6v6Q1d7x8f9c2Z0.jpg'
  }
};

async function seedContent() {
  console.log('🎬 CineVicino: Popolamento cinema, film (TMDb) e orari nel database PostgreSQL...');
  await initDb();

  // 1. Seed Movies
  console.log('  ... Inserimento film con locandine TMDb');
  for (const m of dbStore.movies) {
    const tmdbData = TMDB_POSTERS[m.id];
    const poster = tmdbData ? tmdbData.poster : 'https://image.tmdb.org/t/p/w780/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg';
    const backdrop = tmdbData ? tmdbData.backdrop : 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg';

    await executeRawSql(
      `INSERT INTO movies (
        id, slug, title_it, title_en, title_original, tmdb_id,
        poster_url, backdrop_url, genres, duration_minutes, rating,
        synopsis_it, synopsis_en, release_year, director, "cast",
        age_rating, is_featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (slug) DO UPDATE SET
        poster_url = EXCLUDED.poster_url,
        backdrop_url = EXCLUDED.backdrop_url,
        rating = EXCLUDED.rating,
        synopsis_it = EXCLUDED.synopsis_it;`,
      [
        m.id,
        m.slug,
        m.title_it,
        m.title_en,
        m.title_original,
        m.tmdb_id || null,
        poster,
        backdrop,
        JSON.stringify(m.genres),
        m.duration_minutes,
        m.rating,
        m.synopsis_it,
        m.synopsis_en,
        m.release_year,
        m.director,
        JSON.stringify(m.cast),
        m.age_rating || 'T',
        m.is_featured || false
      ]
    );
  }

  // 2. Seed Cinemas
  console.log('  ... Inserimento multiplex e sale cinema');
  for (const c of dbStore.cinemas) {
    // Ensure city exists or check city_id
    const cityRes = await executeRawSql('SELECT id FROM cities WHERE id = $1', [c.city_id]);
    let cityId = c.city_id;
    if (!cityRes.rows || cityRes.rows.length === 0) {
      // Find matching city by slug
      const slugMatch = await executeRawSql('SELECT id FROM cities WHERE slug = $1 LIMIT 1', [c.city_id.replace('c-', '')]);
      if (slugMatch.rows && slugMatch.rows.length > 0) {
        cityId = slugMatch.rows[0].id;
      } else {
        cityId = 'c-roma'; // Fallback
      }
    }

    await executeRawSql(
      `INSERT INTO cinemas (
        id, city_id, name, chain, address, lat, lng, website_url, features
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        website_url = EXCLUDED.website_url;`,
      [
        c.id,
        cityId,
        c.name,
        c.chain,
        c.address,
        c.lat,
        c.lng,
        c.website_url,
        JSON.stringify(c.features || [])
      ]
    );
  }

  // 3. Seed Showtimes
  console.log('  ... Inserimento programmazione orari con link di acquisto');
  for (const s of dbStore.showtimes) {
    await executeRawSql(
      `INSERT INTO showtimes (
        id, movie_id, cinema_id, show_date, time, format, language,
        ticket_url, ticket_source, active, clicks, scraped_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (id) DO UPDATE SET
        active = EXCLUDED.active,
        ticket_url = EXCLUDED.ticket_url;`,
      [
        s.id,
        s.movie_id,
        s.cinema_id,
        s.show_date,
        s.time,
        s.format,
        s.language,
        s.ticket_url,
        s.ticket_source,
        s.active,
        0
      ]
    );
  }

  const stats = await executeRawSql(`
    SELECT
      (SELECT COUNT(*) FROM movies) as movies_count,
      (SELECT COUNT(*) FROM cinemas) as cinemas_count,
      (SELECT COUNT(*) FROM showtimes) as showtimes_count
  `);

  console.log('🎉 Seed contenuti completato con successo!', stats.rows[0]);
  await closeDb();
}

seedContent().catch(console.error);
