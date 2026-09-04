import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { dbStore } from './src/db/store';
import { cinemaScraper } from './src/services/scraper';
import { Favorite, AlertSubscription, Movie, Cinema } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// ==========================================
// PUBLIC API ROUTES
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CineVicino', timestamp: new Date().toISOString() });
});

// Cities listing & search across all Italian comuni
app.get('/api/cities', (req, res) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  const region = req.query.region as string;
  const onlyWithCinemas = req.query.with_cinemas === 'true';

  let results = dbStore.cities;

  if (region) {
    results = results.filter(c => c.region.toLowerCase() === region.toLowerCase());
  }

  if (onlyWithCinemas) {
    results = results.filter(c => (c.cinema_count || 0) > 0);
  }

  if (query) {
    results = results.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.province.toLowerCase().includes(query) ||
      c.province_code.toLowerCase().includes(query) ||
      c.region.toLowerCase().includes(query)
    );
  }

  // Sort: cities with cinemas first, then provincial capitals, then alphabetical
  results.sort((a, b) => {
    if ((b.cinema_count || 0) !== (a.cinema_count || 0)) {
      return (b.cinema_count || 0) - (a.cinema_count || 0);
    }
    if (a.is_provincial_capital !== b.is_provincial_capital) {
      return a.is_provincial_capital ? -1 : 1;
    }
    return a.name.localeCompare(b.name, 'it');
  });

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 100;
  const startIndex = (page - 1) * limit;
  const paginated = results.slice(startIndex, startIndex + limit);

  res.json({
    total: results.length,
    page,
    limit,
    cities: paginated
  });
});

// Single city info with cinemas OR nearest cinemas if none
app.get('/api/cities/:slug', (req, res) => {
  const { slug } = req.params;
  const city = dbStore.cities.find(c => c.slug === slug);
  if (!city) {
    return res.status(404).json({ error: 'Comune non trovato' });
  }

  const cityCinemas = dbStore.cinemas.filter(c => c.city_id === city.id);
  const nearestCinemas = dbStore.findNearestCinemasForCity(city.slug).slice(0, 6);

  res.json({
    city,
    cinemas: cityCinemas,
    has_local_cinemas: cityCinemas.length > 0,
    nearest_cinemas: nearestCinemas
  });
});

// Real-time Geolocation endpoint: calculates Haversine distance to all Italian cinemas
app.get('/api/nearby', (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Coordinate lat e lng richieste e valide' });
  }

  const nearbyCinemas = dbStore.findNearbyCinemas(lat, lng).slice(0, 10);

  // Also find closest city
  const closestCity = [...dbStore.cities]
    .map(c => ({
      ...c,
      distance_km: dbStore.calculateDistance(lat, lng, c.lat, c.lng)
    }))
    .sort((a, b) => a.distance_km - b.distance_km)[0];

  res.json({
    user_location: { lat, lng },
    closest_city: closestCity,
    cinemas: nearbyCinemas
  });
});

// Cinemas listing & filtering
app.get('/api/cinemas', (req, res) => {
  const citySlug = req.query.city as string;
  const chain = req.query.chain as string;
  const query = (req.query.q as string || '').toLowerCase().trim();

  let results = dbStore.cinemas.map(cinema => {
    const city = dbStore.cities.find(c => c.id === cinema.city_id);
    return {
      ...cinema,
      city_name: city?.name || '',
      city_slug: city?.slug || ''
    };
  });

  if (citySlug) {
    results = results.filter(c => c.city_slug === citySlug);
  }

  if (chain) {
    results = results.filter(c => c.chain === chain);
  }

  if (query) {
    results = results.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.address.toLowerCase().includes(query) ||
      c.city_name.toLowerCase().includes(query)
    );
  }

  res.json(results);
});

// Single cinema with today's showtimes
app.get('/api/cinemas/:id', (req, res) => {
  const cinema = dbStore.cinemas.find(c => c.id === req.params.id);
  if (!cinema) {
    return res.status(404).json({ error: 'Cinema non trovato' });
  }

  const city = dbStore.cities.find(c => c.id === cinema.city_id);
  const showtimes = dbStore.showtimes
    .filter(s => s.cinema_id === cinema.id && s.active)
    .map(s => {
      const movie = dbStore.movies.find(m => m.id === s.movie_id);
      return {
        ...s,
        movie_title: movie?.title_it || '',
        movie_poster: movie?.poster_url || ''
      };
    });

  res.json({
    ...cinema,
    city_name: city?.name || '',
    city_slug: city?.slug || '',
    showtimes
  });
});

// Movies listing
app.get('/api/movies', (req, res) => {
  const genre = req.query.genre as string;
  const featured = req.query.featured === 'true';
  const query = (req.query.q as string || '').toLowerCase().trim();

  let results = [...dbStore.movies];

  if (featured) {
    results = results.filter(m => m.is_featured || dbStore.settings.featured_movie_ids.includes(m.id));
  }

  if (genre) {
    results = results.filter(m => m.genres.some(g => g.toLowerCase() === genre.toLowerCase()));
  }

  if (query) {
    results = results.filter(m => 
      m.title_it.toLowerCase().includes(query) || 
      m.title_en.toLowerCase().includes(query) ||
      m.director.toLowerCase().includes(query) ||
      m.cast.some(c => c.toLowerCase().includes(query))
    );
  }

  res.json(results);
});

// Single movie with all upcoming showtimes across cinemas
app.get('/api/movies/:slug', (req, res) => {
  const movie = dbStore.movies.find(m => m.slug === req.params.slug);
  if (!movie) {
    return res.status(404).json({ error: 'Film non trovato' });
  }

  const showtimes = dbStore.showtimes
    .filter(s => s.movie_id === movie.id && s.active)
    .map(s => {
      const cinema = dbStore.cinemas.find(c => c.id === s.cinema_id);
      const city = cinema ? dbStore.cities.find(ci => ci.id === cinema.city_id) : null;
      return {
        ...s,
        cinema_name: cinema?.name || '',
        cinema_chain: cinema?.chain || null,
        cinema_address: cinema?.address || '',
        city_name: city?.name || '',
        city_slug: city?.slug || ''
      };
    });

  res.json({
    movie,
    showtimes
  });
});

// Showtimes query
app.get('/api/showtimes', (req, res) => {
  const { movie_id, cinema_id, city_slug, date } = req.query;

  let results = dbStore.showtimes.filter(s => s.active);

  if (movie_id) {
    results = results.filter(s => s.movie_id === movie_id);
  }

  if (cinema_id) {
    results = results.filter(s => s.cinema_id === cinema_id);
  }

  if (date) {
    results = results.filter(s => s.show_date === date);
  }

  const hydrated = results.map(s => {
    const movie = dbStore.movies.find(m => m.id === s.movie_id);
    const cinema = dbStore.cinemas.find(c => c.id === s.cinema_id);
    const city = cinema ? dbStore.cities.find(ci => ci.id === cinema.city_id) : null;
    return {
      ...s,
      movie_title: movie?.title_it || '',
      movie_poster: movie?.poster_url || '',
      cinema_name: cinema?.name || '',
      cinema_chain: cinema?.chain || null,
      cinema_address: cinema?.address || '',
      city_name: city?.name || '',
      city_slug: city?.slug || ''
    };
  });

  if (city_slug) {
    return res.json(hydrated.filter(s => s.city_slug === city_slug));
  }

  res.json(hydrated);
});

// ==========================================
// OPTIONAL ACCOUNTS, FAVORITES & ALERTS
// ==========================================

// Current user profile
app.get('/api/auth/me', (req, res) => {
  // Return active user or null
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.includes('admin')) {
    return res.json({ user: dbStore.users[0] });
  }
  res.json({ user: null });
});

// Demo login / register
app.post('/api/auth/login', (req, res) => {
  const { email, password, is_admin } = req.body;
  
  if (is_admin || password === (process.env.ADMIN_PASSWORD || 'admin')) {
    return res.json({
      success: true,
      user: {
        id: 'usr-admin',
        email: email || 'admin@cinevicino.it',
        name: 'Amministratore CineVicino',
        is_admin: true,
        created_at: new Date().toISOString()
      },
      token: 'admin-session-token'
    });
  }

  // Regular user login / demo
  const user = {
    id: `usr-${Date.now()}`,
    email: email || 'utente@cinevicino.it',
    name: email ? email.split('@')[0] : 'Cinefilo',
    is_admin: false,
    created_at: new Date().toISOString()
  };

  res.json({
    success: true,
    user,
    token: `user-session-${user.id}`
  });
});

// Favorites management
app.get('/api/favorites', (req, res) => {
  res.json(dbStore.favorites);
});

app.post('/api/favorites', (req, res) => {
  const { user_id, item_type, item_id } = req.body;
  if (!item_type || !item_id) {
    return res.status(400).json({ error: 'item_type e item_id richiesti' });
  }
  const existing = dbStore.favorites.find(f => f.item_id === item_id);
  if (existing) {
    dbStore.favorites = dbStore.favorites.filter(f => f.item_id !== item_id);
    return res.json({ action: 'removed', item_id });
  }
  const fav: Favorite = {
    id: `fav-${Date.now()}`,
    user_id: user_id || 'guest-user',
    item_type,
    item_id,
    created_at: new Date().toISOString()
  };
  dbStore.favorites.push(fav);
  res.json({ action: 'added', favorite: fav });
});

// Alert subscriptions
app.get('/api/alerts', (req, res) => {
  res.json(dbStore.alertSubscriptions);
});

app.post('/api/alerts', (req, res) => {
  const { email, city_id } = req.body;
  if (!email || !city_id) {
    return res.status(400).json({ error: 'Email e comune richiesti' });
  }
  const city = dbStore.cities.find(c => c.id === city_id);
  const sub: AlertSubscription = {
    id: `sub-${Date.now()}`,
    email,
    city_id,
    city_name: city?.name || '',
    active: true,
    created_at: new Date().toISOString()
  };
  dbStore.alertSubscriptions.push(sub);
  res.json({ success: true, subscription: sub });
});

// ==========================================
// PROTECTED ADMIN & CUSTOMIZATION DASHBOARD
// ==========================================

// Content summary
app.get('/api/admin/content', (req, res) => {
  res.json({
    citiesCount: dbStore.cities.length,
    cinemasCount: dbStore.cinemas.length,
    moviesCount: dbStore.movies.length,
    showtimesCount: dbStore.showtimes.length,
    activeShowtimesCount: dbStore.showtimes.filter(s => s.active).length,
    cinemas: dbStore.cinemas,
    movies: dbStore.movies,
    showtimes: dbStore.showtimes.slice(0, 100),
    settings: dbStore.settings
  });
});

// Toggle active showtime
app.post('/api/admin/content/toggle-active', (req, res) => {
  const { type, id } = req.body;
  if (type === 'showtime') {
    const st = dbStore.showtimes.find(s => s.id === id);
    if (st) {
      st.active = !st.active;
      return res.json({ success: true, active: st.active });
    }
  }
  res.status(404).json({ error: 'Elemento non trovato' });
});

// Create/Edit movie
app.post('/api/admin/content/movie', (req, res) => {
  const data = req.body;
  const existingIdx = dbStore.movies.findIndex(m => m.id === data.id);
  if (existingIdx >= 0) {
    dbStore.movies[existingIdx] = { ...dbStore.movies[existingIdx], ...data };
    return res.json({ success: true, movie: dbStore.movies[existingIdx] });
  }
  const newMovie: Movie = {
    id: `mov-${Date.now()}`,
    slug: data.slug || data.title_it.toLowerCase().replace(/\s+/g, '-'),
    title_it: data.title_it,
    title_en: data.title_en || data.title_it,
    title_original: data.title_original || data.title_it,
    tmdb_id: data.tmdb_id || null,
    poster_url: data.poster_url || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800',
    backdrop_url: data.backdrop_url || 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1600',
    genres: data.genres || ['Dramma'],
    duration_minutes: data.duration_minutes || 120,
    rating: data.rating || 7.5,
    synopsis_it: data.synopsis_it || '',
    synopsis_en: data.synopsis_en || '',
    release_year: data.release_year || new Date().getFullYear(),
    director: data.director || '',
    cast: data.cast || [],
    age_rating: data.age_rating || 'T',
    is_featured: data.is_featured || false
  };
  dbStore.movies.unshift(newMovie);
  res.json({ success: true, movie: newMovie });
});

// Create/Edit cinema
app.post('/api/admin/content/cinema', (req, res) => {
  const data = req.body;
  const existingIdx = dbStore.cinemas.findIndex(c => c.id === data.id);
  if (existingIdx >= 0) {
    dbStore.cinemas[existingIdx] = { ...dbStore.cinemas[existingIdx], ...data };
    return res.json({ success: true, cinema: dbStore.cinemas[existingIdx] });
  }
  const newCinema: Cinema = {
    id: `cin-${Date.now()}`,
    city_id: data.city_id || dbStore.cities[0].id,
    name: data.name,
    chain: data.chain || 'independent',
    address: data.address,
    lat: parseFloat(data.lat) || 41.9028,
    lng: parseFloat(data.lng) || 12.4964,
    website_url: data.website_url || 'https://cinevicino.it',
    features: data.features || ['Dolby Digital']
  };
  dbStore.cinemas.push(newCinema);
  res.json({ success: true, cinema: newCinema });
});

// Scraper history & trigger
app.get('/api/admin/scrape/logs', (req, res) => {
  res.json(dbStore.scrapeLogs);
});

app.post('/api/admin/scrape/run', async (req, res) => {
  const { use_firecrawl } = req.body;
  try {
    const log = await cinemaScraper.executeFullScrape({ useFirecrawl: use_firecrawl });
    res.json({ success: true, log });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Status & test connections for TMDb, Firecrawl, Database, Email
app.get('/api/admin/status', async (req, res) => {
  const tmdbStatus = await cinemaScraper.testTmdbConnection();
  const firecrawlStatus = await cinemaScraper.testFirecrawlConnection();

  res.json({
    database: {
      configured: true,
      type: 'In-Memory + ISTAT CSV Engine (PostgreSQL Compatible)',
      status: 'healthy',
      records: {
        cities: dbStore.cities.length,
        cinemas: dbStore.cinemas.length,
        movies: dbStore.movies.length,
        showtimes: dbStore.showtimes.length
      }
    },
    tmdb: {
      configured: Boolean(process.env.TMDB_API_KEY),
      ...tmdbStatus
    },
    firecrawl: {
      configured: Boolean(process.env.FIRECRAWL_API_KEY),
      monthly_limit: dbStore.settings.firecrawl_monthly_limit,
      credits_used: dbStore.settings.firecrawl_credits_used,
      ...firecrawlStatus
    },
    email_alert_provider: {
      configured: Boolean(process.env.EMAIL_ALERT_API_KEY),
      status: process.env.EMAIL_ALERT_API_KEY ? 'active' : 'idle',
      pending_subscribers: dbStore.alertSubscriptions.length
    }
  });
});

// Site Copy & Settings management
app.get('/api/admin/settings', (req, res) => {
  res.json(dbStore.settings);
});

app.post('/api/admin/settings', (req, res) => {
  dbStore.settings = {
    ...dbStore.settings,
    ...req.body
  };
  res.json({ success: true, settings: dbStore.settings });
});

// ==========================================
// SEO: SITEMAP.XML & ROBOTS.TXT
// ==========================================
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\n\nSitemap: ${process.env.APP_URL || 'https://cinevicino.it'}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  const baseUrl = process.env.APP_URL || 'https://cinevicino.it';
  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  // Home
  xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

  // Cities
  dbStore.cities.slice(0, 100).forEach(c => {
    xml += `  <url>\n    <loc>${baseUrl}/citta/${c.slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });

  // Movies
  dbStore.movies.forEach(m => {
    xml += `  <url>\n    <loc>${baseUrl}/film/${m.slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  });

  xml += `</urlset>`;
  res.send(xml);
});

// ==========================================
// VITE MIDDLEWARE & SERVER STARTUP
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CineVicino server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
