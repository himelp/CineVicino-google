import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { MovieCard } from './components/MovieCard';
import { MovieDetailModal } from './components/MovieDetailModal';
import { CityDetailView } from './components/CityDetailView';
import { ComuniDirectory } from './components/ComuniDirectory';
import { FavoritesModal } from './components/FavoritesModal';
import { AdminDashboard } from './components/AdminDashboard';
import { CookieBanner } from './components/CookieBanner';
import { PrivacyModal } from './components/PrivacyModal';
import { LoginModal } from './components/LoginModal';
import { AutoCityBanner, AutoDetectInfo } from './components/AutoCityBanner';
import { City, Cinema, Movie, CinemaChain, SiteSettings } from './types';
import { Language, translations } from './utils/i18n';
import { safeFetchJson, safeReadJson } from './utils/api';
import { MapPin, Film, Compass, ExternalLink, Ticket, ShieldCheck, Heart, Sparkles, AlertCircle, ArrowRight, ChevronRight } from 'lucide-react';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('cinevicino_lang') as Language) || 'it';
  });

  const t = translations[lang];

  // Core Data
  const [movies, setMovies] = useState<Movie[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [citiesCount, setCitiesCount] = useState<number>(7894);
  const [settings, setSettings] = useState<SiteSettings>({
    homepage_headline_it: 'Scopri i film in programmazione nei cinema vicino a te.',
    homepage_headline_en: 'Discover movies currently playing in cinemas near you.',
    homepage_subtext_it: 'Directory cinematografica completa per tutta Italia. Orari aggiornati, sale multiplex, cinema d\'essai e link diretti alle biglietterie ufficiali.',
    homepage_subtext_en: 'Comprehensive Italian cinema directory. Updated showtimes, multiplexes, arthouse theaters and direct official ticket links.',
    featured_movie_ids: [],
    footer_copy: '© 2026 CineVicino Italia — Directory indipendente dei cinema italiani.',
    privacy_policy_text: 'La tua privacy è fondamentale per noi. Non archiviamo dati personali di geolocalizzazione.',
    firecrawl_monthly_limit: 1000,
    firecrawl_credits_used: 0
  });

  // Navigation & View State
  const [view, setView] = useState<'home' | 'city' | 'directory' | 'all-movies'>('home');
  const [activeCity, setActiveCity] = useState<City | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  // Filters
  const [selectedChain, setSelectedChain] = useState<CinemaChain | 'all' | 'independent'>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [movieSearchQuery, setMovieSearchQuery] = useState<string>('');

  // Geolocation & Auto-detection state
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isPreciseLocating, setIsPreciseLocating] = useState<boolean>(false);
  const [nearbyCinemas, setNearbyCinemas] = useState<(Cinema & { distance_km: number })[]>([]);
  const [autoDetectInfo, setAutoDetectInfo] = useState<AutoDetectInfo | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);

  // Favorites & User state
  const [favoriteMovieIds, setFavoriteMovieIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cinevicino_fav_movies') || '[]');
    } catch {
      return [];
    }
  });

  const [favoriteCinemaIds, setFavoriteCinemaIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cinevicino_fav_cinemas') || '[]');
    } catch {
      return [];
    }
  });

  const [user, setUser] = useState<any>(null);

  // Modals
  const [showFavorites, setShowFavorites] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Toggle language
  const handleToggleLang = () => {
    const nextLang: Language = lang === 'it' ? 'en' : 'it';
    setLang(nextLang);
    localStorage.setItem('cinevicino_lang', nextLang);
  };

  // Initial Data Fetch & Session Restore
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [movRes, cinRes, setRes, citRes] = await Promise.all([
          fetch('/api/movies'),
          fetch('/api/cinemas'),
          fetch('/api/settings'),
          fetch('/api/cities?limit=1')
        ]);

        const [movData, cinData, setVal, citData] = await Promise.all([
          safeReadJson<Movie[]>(movRes),
          safeReadJson<Cinema[]>(cinRes),
          safeReadJson<SiteSettings>(setRes),
          safeReadJson<any>(citRes)
        ]);

        if (movData.ok && Array.isArray(movData.data)) setMovies(movData.data);
        if (cinData.ok && Array.isArray(cinData.data)) setCinemas(cinData.data);
        if (setVal.ok && setVal.data) setSettings(setVal.data);
        if (citData.ok && citData.data?.total) setCitiesCount(citData.data.total);

        // Restore user session if token exists
        const storedToken = localStorage.getItem('cinevicino_token');
        if (storedToken) {
          try {
            const meParsed = await safeFetchJson<any>('/api/auth/me', {
              headers: { 'Authorization': `Bearer ${storedToken}` }
            });
            if (meParsed.ok && meParsed.data?.user) {
              setUser(meParsed.data.user);
              // Also fetch server favorites
              const favParsed = await safeFetchJson<any>('/api/favorites', {
                headers: { 'Authorization': `Bearer ${storedToken}` }
              });
              if (favParsed.ok && favParsed.data) {
                if (favParsed.data.movies?.length) setFavoriteMovieIds(favParsed.data.movies);
                if (favParsed.data.cinemas?.length) setFavoriteCinemaIds(favParsed.data.cinemas);
              }
            } else if (meParsed.status === 401 || meParsed.status === 403) {
              localStorage.removeItem('cinevicino_token');
            }
          } catch (e) {
            console.error('Failed to verify token on startup', e);
          }
        }
      } catch (err) {
        console.error('Failed to load initial CineVicino data', err);
      }
    }
    loadInitialData();
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('cinevicino_fav_movies', JSON.stringify(favoriteMovieIds));
  }, [favoriteMovieIds]);

  useEffect(() => {
    localStorage.setItem('cinevicino_fav_cinemas', JSON.stringify(favoriteCinemaIds));
  }, [favoriteCinemaIds]);

  // Auto-detect visitor's city on page load via /api/geo/my-city
  useEffect(() => {
    // Respect explicit direct navigation to a city route (e.g. /citta/milano)
    if (window.location.pathname.startsWith('/citta/') || window.location.pathname.startsWith('/city/')) {
      return;
    }

    async function detectVisitorCity() {
      try {
        const parsed = await safeFetchJson<any>('/api/geo/my-city');
        if (!parsed.ok || !parsed.data?.city_slug) return;
        const data = parsed.data;

        // Fetch the city and its cinemas immediately
        const cityParsed = await safeFetchJson<any>(`/api/cities/${data.city_slug}`);
        if (cityParsed.ok && cityParsed.data?.city) {
          const cityData = cityParsed.data;
          setActiveCity(cityData.city);
          setAutoDetectInfo({
            detected: true,
            city_slug: data.city_slug,
            city_name: data.city_name || cityData.city.name,
            province_code: data.province_code || cityData.city.province_code,
            region: data.region || cityData.city.region,
            method: 'ip',
            confidence: data.confidence || 'high',
            distance_km: data.distance_km
          });

          if (cityData.cinemas && cityData.cinemas.length > 0) {
            setNearbyCinemas(cityData.cinemas.map((c: any) => ({ ...c, distance_km: 0 })));
          } else if (cityData.nearest_cinemas && cityData.nearest_cinemas.length > 0) {
            setNearbyCinemas(cityData.nearest_cinemas);
          }
        }
      } catch (err) {
        // Fall back gracefully to manual search without blocking
        console.debug('IP geolocation check skipped or unresolvable', err);
      }
    }

    detectVisitorCity();
  }, []);

  // Precise Geolocation Handler (navigator.geolocation GPS/Wi-Fi)
  const handlePreciseLocate = () => {
    if (!navigator.geolocation) {
      alert('La geolocalizzazione GPS/Wi-Fi non è supportata dal tuo browser.');
      return;
    }

    setIsPreciseLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const parsed = await safeFetchJson<any>(`/api/nearby?lat=${latitude}&lng=${longitude}`);
          if (parsed.ok && parsed.data) {
            const data = parsed.data;
            if (data.closest_city) {
              setActiveCity(data.closest_city);
              setAutoDetectInfo({
                detected: true,
                city_slug: data.closest_city.slug,
                city_name: data.closest_city.name,
                province_code: data.closest_city.province_code,
                region: data.closest_city.region,
                method: 'gps',
                confidence: 'high',
                distance_km: data.closest_city.distance_km || 0
              });
              setBannerDismissed(false);
            }
            if (data.cinemas) {
              setNearbyCinemas(data.cinemas);
            }
          }
        } catch (err) {
          console.error('Failed to resolve GPS coordinates', err);
        } finally {
          setIsPreciseLocating(false);
        }
      },
      (err) => {
        console.warn('GPS location denied or timed out', err);
        setIsPreciseLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handler for city selection within the AutoCityBanner dropdown
  const handleBannerSelectCity = async (city: City) => {
    setActiveCity(city);
    setAutoDetectInfo({
      detected: true,
      city_slug: city.slug,
      city_name: city.name,
      province_code: city.province_code,
      region: city.region,
      method: 'gps',
      confidence: 'high',
      distance_km: 0
    });

    try {
      const parsed = await safeFetchJson<any>(`/api/cities/${city.slug}`);
      if (parsed.ok && parsed.data) {
        const data = parsed.data;
        if (data.cinemas && data.cinemas.length > 0) {
          setNearbyCinemas(data.cinemas.map((c: any) => ({ ...c, distance_km: 0 })));
        } else if (data.nearest_cinemas) {
          setNearbyCinemas(data.nearest_cinemas);
        }
      }
    } catch {
      // ignore
    }
  };

  // Standard Hero Geolocation Handler (can delegate to handlePreciseLocate)
  const handleLocateMe = () => {
    handlePreciseLocate();
  };

  // Toggle Favorite Movie
  const handleToggleFavoriteMovie = (movieId: string) => {
    setFavoriteMovieIds(prev => 
      prev.includes(movieId) ? prev.filter(id => id !== movieId) : [...prev, movieId]
    );
  };

  // Toggle Favorite Cinema
  const handleToggleFavoriteCinema = (cinemaId: string) => {
    setFavoriteCinemaIds(prev => 
      prev.includes(cinemaId) ? prev.filter(id => id !== cinemaId) : [...prev, cinemaId]
    );
  };

  // Filter Movies
  const filteredMovies = movies.filter(m => {
    if (selectedGenre !== 'all' && !m.genres.some(g => g.toLowerCase() === selectedGenre.toLowerCase())) {
      return false;
    }
    if (movieSearchQuery.trim()) {
      const q = movieSearchQuery.toLowerCase();
      const matchTitle = m.title_it.toLowerCase().includes(q) || m.title_en.toLowerCase().includes(q);
      const matchDirector = m.director.toLowerCase().includes(q);
      const matchCast = m.cast.some(c => c.toLowerCase().includes(q));
      if (!matchTitle && !matchDirector && !matchCast) return false;
    }
    return true;
  });

  // Top popular Italian cities shortcut pills
  const popularCities = [
    { name: 'Roma', slug: 'roma', prov: 'RM' },
    { name: 'Milano', slug: 'milano', prov: 'MI' },
    { name: 'Napoli', slug: 'napoli', prov: 'NA' },
    { name: 'Torino', slug: 'torino', prov: 'TO' },
    { name: 'Firenze', slug: 'firenze', prov: 'FI' },
    { name: 'Bologna', slug: 'bologna', prov: 'BO' },
    { name: 'Melzo', slug: 'melzo', prov: 'MI' },
    { name: 'Cortina d\'Ampezzo', slug: 'cortina-dampezzo', prov: 'BL' }
  ];

  // Router Navigation Handlers
  const openMovie = (m: Movie) => {
    setSelectedMovie(m);
    navigate(`/film/${m.slug}`);
  };

  const closeMovie = () => {
    setSelectedMovie(null);
    if (activeCity && view === 'city') {
      navigate(`/citta/${activeCity.slug}`);
    } else if (view === 'directory') {
      navigate('/comuni');
    } else if (view === 'all-movies') {
      navigate('/film');
    } else {
      navigate('/');
    }
  };

  const selectCity = (c: City) => {
    setActiveCity(c);
    setView('city');
    navigate(`/citta/${c.slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openHome = () => {
    setView('home');
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAllCities = () => {
    setView('directory');
    navigate('/comuni');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAllMovies = () => {
    setView('all-movies');
    navigate('/film');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPopularCity = async (slug: string) => {
    try {
      const parsed = await safeFetchJson<any>(`/api/cities/${slug}`);
      if (parsed.ok && parsed.data?.city) {
        selectCity(parsed.data.city);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Synchronize URL pathname with internal view / state
  useEffect(() => {
    const path = location.pathname;

    // 1. Film route: /film/:slug
    if (path.startsWith('/film/')) {
      const slug = path.replace('/film/', '').split('/')[0];
      if (slug) {
        const found = movies.find(m => m.slug === slug);
        if (found) {
          setSelectedMovie(found);
        } else {
          safeFetchJson<any>(`/api/movies/${slug}`)
            .then(parsed => {
              if (parsed.ok && parsed.data?.movie) setSelectedMovie(parsed.data.movie);
            })
            .catch(err => console.error('Failed to load movie from URL', err));
        }
      }
    } else if (selectedMovie) {
      setSelectedMovie(null);
    }

    // 2. City route: /citta/:slug or /city/:slug
    if (path.startsWith('/citta/') || path.startsWith('/city/')) {
      const slug = path.replace(/^\/(citta|city)\//, '').split('/')[0];
      if (slug) {
        if (!activeCity || activeCity.slug !== slug) {
          safeFetchJson<any>(`/api/cities/${slug}`)
            .then(parsed => {
              if (parsed.ok && parsed.data?.city) {
                setActiveCity(parsed.data.city);
                setView('city');
              }
            })
            .catch(err => console.error('Failed to load city from URL', err));
        } else if (view !== 'city') {
          setView('city');
        }
      }
    }

    // 3. Cinema route: /cinema/:slug
    if (path.startsWith('/cinema/')) {
      const slug = path.replace('/cinema/', '').split('/')[0];
      if (slug) {
        safeFetchJson<any>(`/api/cinemas/${slug}`)
          .then(parsed => {
            if (parsed.ok && parsed.data?.cinema?.city_slug) {
              safeFetchJson<any>(`/api/cities/${parsed.data.cinema.city_slug}`)
                .then(cParsed => {
                  if (cParsed.ok && cParsed.data?.city) {
                    setActiveCity(cParsed.data.city);
                    setView('city');
                  }
                });
            }
          })
          .catch(err => console.error('Failed to load cinema from URL', err));
      }
    }

    // 4. Directory route
    if (path === '/comuni' || path === '/directory') {
      if (view !== 'directory') setView('directory');
    }

    // 5. All movies route
    if (path === '/film' || path === '/all-movies') {
      if (view !== 'all-movies') setView('all-movies');
    }

    // 6. Home route
    if (path === '/') {
      if (view !== 'home') setView('home');
    }
  }, [location.pathname, movies]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col font-sans selection:bg-[#D4AF37] selection:text-black">
      
      {/* 1. Universal Top Header */}
      <Header
        lang={lang}
        onToggleLang={handleToggleLang}
        onSelectCity={selectCity}
        onLocateMe={handleLocateMe}
        isLocating={isLocating}
        activeCity={activeCity}
        favoritesCount={favoriteMovieIds.length + favoriteCinemaIds.length}
        onOpenFavorites={() => setShowFavorites(true)}
        onOpenAdmin={() => setShowAdmin(true)}
        onOpenAllCities={openAllCities}
        onOpenAllMovies={openAllMovies}
        onOpenHome={openHome}
        user={user}
        onOpenLogin={() => setShowLogin(true)}
      />

      {/* Auto-Detected Visitor City Pill / Banner */}
      {autoDetectInfo && !bannerDismissed && (
        <AutoCityBanner
          autoDetectInfo={autoDetectInfo}
          activeCity={activeCity}
          onSelectCity={handleBannerSelectCity}
          onPreciseLocate={handlePreciseLocate}
          isPreciseLocating={isPreciseLocating}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* 2. Main Viewport Router */}
      <main className="flex-1">
        
        {/* VIEW: HOME */}
        {view === 'home' && (
          <div>
            {/* Hero Section */}
            <Hero
              lang={lang}
              headline={lang === 'en' ? settings.homepage_headline_en : settings.homepage_headline_it}
              subtext={lang === 'en' ? settings.homepage_subtext_en : settings.homepage_subtext_it}
              selectedChain={selectedChain}
              onSelectChain={setSelectedChain}
              selectedFormat={selectedFormat}
              onSelectFormat={setSelectedFormat}
              onLocateMe={handleLocateMe}
              isLocating={isLocating}
              activeCityName={activeCity?.name}
              totalComuni={citiesCount}
            />

            {/* Popular Italian Cities Quick Bar */}
            <div className="border-b border-white/10 bg-[#0a0a0a] py-3.5 px-4">
              <div className="max-w-7xl mx-auto flex items-center gap-2.5 overflow-x-auto text-xs no-scrollbar">
                <span className="text-neutral-400 font-medium whitespace-nowrap flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Città principali:
                </span>
                {popularCities.map(c => (
                  <button
                    key={c.slug}
                    onClick={() => handleSelectPopularCity(c.slug)}
                    className="px-3.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 transition-colors whitespace-nowrap font-medium"
                  >
                    {c.name} <span className="text-[10px] text-neutral-400 font-mono">({c.prov})</span>
                  </button>
                ))}
                <button
                  onClick={() => setView('directory')}
                  className="px-4 py-1 rounded-full bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/30 transition-colors whitespace-nowrap font-bold flex items-center gap-1 ml-auto text-xs"
                >
                  <span>Tutti i 7.894 Comuni</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Geolocation Nearby Cinemas Section (when active) */}
            {nearbyCinemas.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
                <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0a0a] border border-white/10">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2.5">
                      <Compass className="w-5 h-5 text-[#D4AF37] animate-spin-slow" />
                      <h2 className="text-xl font-serif text-white font-bold">
                        Cinema nelle <span className="italic text-[#D4AF37]">vicinanze</span>
                      </h2>
                    </div>
                    {activeCity && (
                      <span className="text-xs px-3 py-1 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 font-bold uppercase tracking-wider">
                        Vicino a {activeCity.name}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {nearbyCinemas.slice(0, 4).map(c => (
                      <div
                        key={c.id}
                        className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#D4AF37] font-mono">
                              {c.distance_km.toFixed(1)} km
                            </span>
                            {c.chain && (
                              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                                {c.chain}
                              </span>
                            )}
                          </div>
                          <h4 className="font-serif font-bold text-white text-base mt-2.5 group-hover:text-[#D4AF37] transition-colors">{c.name}</h4>
                          <p className="text-xs text-neutral-400 mt-1 line-clamp-1">{c.address}</p>
                        </div>
                        <a
                          href={c.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-5 pt-3 border-t border-white/10 text-[10px] uppercase tracking-widest text-[#D4AF37] hover:text-white flex items-center justify-between transition-colors"
                        >
                          <span>Sito Ufficiale</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Movies Grid Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-serif text-white tracking-tight flex items-center gap-2.5">
                    <span>Nelle sale in <span className="italic text-[#D4AF37]">Italia</span></span>
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-xl">
                    Locandine, trame arricchite TMDb e orari verificati per l'acquisto diretto del biglietto.
                  </p>
                </div>

                {/* Search in movies */}
                <input
                  type="text"
                  value={movieSearchQuery}
                  onChange={e => setMovieSearchQuery(e.target.value)}
                  placeholder="Cerca film, regista o attore..."
                  className="px-4 py-2 bg-white/5 border border-white/20 rounded-full text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] w-full sm:w-64 transition-colors"
                />
              </div>

              {/* Movies Grid */}
              {filteredMovies.length === 0 ? (
                <div className="py-16 text-center bg-[#0a0a0a] rounded-3xl border border-white/10 p-8">
                  <p className="text-neutral-400 text-sm">
                    Nessun film trovato corrispondente ai criteri di ricerca.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredMovies.map(movie => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      lang={lang}
                      onSelect={openMovie}
                      isFavorite={favoriteMovieIds.includes(movie.id)}
                      onToggleFavorite={handleToggleFavoriteMovie}
                    />
                  ))}
                </div>
              )}
            </section>

          </div>
        )}

        {/* VIEW: CITY DETAIL */}
        {view === 'city' && activeCity && (
          <CityDetailView
            city={activeCity}
            lang={lang}
            onBack={openHome}
            onSelectMovie={openMovie}
            onSelectCity={selectCity}
            onToggleFavorite={handleToggleFavoriteCinema}
            favoriteIds={favoriteCinemaIds}
          />
        )}

        {/* VIEW: COMUNI DIRECTORY */}
        {view === 'directory' && (
          <ComuniDirectory
            lang={lang}
            onBack={openHome}
            onSelectCity={selectCity}
          />
        )}

        {/* VIEW: ALL MOVIES */}
        {view === 'all-movies' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fadeIn">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-serif text-white">Tutti i Film in <span className="italic text-[#D4AF37]">Programmazione</span></h1>
              <p className="text-sm text-neutral-400 mt-1">
                Consulta le schede dei film attualmente distribuiti nelle sale italiane, con orari e link diretti alle biglietterie ufficiali.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {movies.map(movie => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  lang={lang}
                  onSelect={openMovie}
                  isFavorite={favoriteMovieIds.includes(movie.id)}
                  onToggleFavorite={handleToggleFavoriteMovie}
                />
              ))}
            </div>
          </div>
        )}

      </main>

      {/* 3. Comprehensive Sophisticated Dark Footer */}
      <footer className="border-t border-white/10 bg-[#0a0a0a] text-xs text-neutral-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Brand column */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center font-bold">
                  <Film className="w-4 h-4" />
                </div>
                <span className="font-serif italic text-lg text-white">CineVicino Italia</span>
              </div>
              <p className="text-neutral-400 text-xs leading-relaxed max-w-md">
                CineVicino è la directory indipendente che copre tutti i 7.894 comuni d'Italia. Mostra orari aggiornati e reindirizza gli spettatori direttamente alle biglietterie autorizzate delle sale cinematografiche (UCI Cinemas, The Space Cinema, 18Tickets, Vivaticket, Liveticket).
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-neutral-400">
                <span className="flex items-center gap-1 text-neutral-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" /> Nessuna commissione aggiunta
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 text-neutral-300">
                  <Ticket className="w-3.5 h-3.5 text-[#D4AF37]" /> Reindirizzamento ufficiale
                </span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-[0.2em] text-[10px] mb-3">
                Esplora
              </h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={openHome} className="hover:text-white transition-colors">
                    Home & Film in Sala
                  </button>
                </li>
                <li>
                  <button onClick={openAllCities} className="hover:text-white transition-colors">
                    Tutti i 7.894 Comuni
                  </button>
                </li>
                <li>
                  <button onClick={handleLocateMe} className="hover:text-white transition-colors">
                    Trova Cinema Vicino a Me
                  </button>
                </li>
                <li>
                  <button onClick={() => setShowFavorites(true)} className="hover:text-white transition-colors">
                    Cinema & Film Preferiti
                  </button>
                </li>
              </ul>
            </div>

            {/* Compliance & Attributions */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-[0.2em] text-[10px] mb-3">
                Normativa & TMDb
              </h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => setShowPrivacy(true)} className="hover:text-white transition-colors">
                    Informativa Privacy & GDPR
                  </button>
                </li>
                <li>
                  <a href="/sitemap.xml" target="_blank" className="hover:text-white transition-colors">
                    Sitemap XML
                  </a>
                </li>
                <li>
                  <a href="/robots.txt" target="_blank" className="hover:text-white transition-colors">
                    Robots.txt
                  </a>
                </li>
                {user?.is_admin && (
                  <li>
                    <button onClick={() => setShowAdmin(true)} className="hover:text-[#D4AF37] text-[#D4AF37] transition-colors">
                      Pannello Amministratore
                    </button>
                  </li>
                )}
              </ul>
            </div>

          </div>

          {/* TMDb Attribution Banner & Disclaimer */}
          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-neutral-500 uppercase tracking-widest">
            <div className="flex items-center gap-3">
              <span className="font-medium text-neutral-400">
                {settings.footer_copy}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span>{t.tmdbAttribution}</span>
            </div>
          </div>

        </div>
      </footer>

      {/* 4. Modals */}
      {selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          lang={lang}
          onClose={closeMovie}
          activeCity={activeCity}
          onSelectCity={selectCity}
          isFavorite={favoriteMovieIds.includes(selectedMovie.id)}
          onToggleFavorite={handleToggleFavoriteMovie}
        />
      )}

      {showFavorites && (
        <FavoritesModal
          lang={lang}
          onClose={() => setShowFavorites(false)}
          favoriteMovies={movies.filter(m => favoriteMovieIds.includes(m.id))}
          favoriteCinemas={cinemas.filter(c => favoriteCinemaIds.includes(c.id))}
          onRemoveFavoriteMovie={handleToggleFavoriteMovie}
          onRemoveFavoriteCinema={handleToggleFavoriteCinema}
          onSelectMovie={(m) => {
            openMovie(m);
            setShowFavorites(false);
          }}
          onSelectCinema={(c) => {
            if (c.slug) {
              navigate(`/cinema/${c.slug}`);
              setShowFavorites(false);
            } else if (c.city_id) {
              safeFetchJson<any>(`/api/cities/${c.city_id}`).then(d => {
                if (d.ok && d.data?.city) {
                  selectCity(d.data.city);
                  setShowFavorites(false);
                }
              });
            }
          }}
          activeCity={activeCity}
        />
      )}

      {showAdmin && (
        <AdminDashboard
          onClose={() => setShowAdmin(false)}
        />
      )}

      {showPrivacy && (
        <PrivacyModal
          lang={lang}
          onClose={() => setShowPrivacy(false)}
          privacyText={settings.privacy_policy_text}
        />
      )}

      {showLogin && (
        <LoginModal
          lang={lang}
          onClose={() => setShowLogin(false)}
          onLoginSuccess={(usr) => setUser(usr)}
        />
      )}

      {/* 5. GDPR Cookie Consent Banner */}
      <CookieBanner
        lang={lang}
        onOpenPrivacy={() => setShowPrivacy(true)}
      />

    </div>
  );
}
