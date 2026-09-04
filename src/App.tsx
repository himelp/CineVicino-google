import React, { useState, useEffect } from 'react';
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
import { City, Cinema, Movie, CinemaChain, SiteSettings } from './types';
import { Language, translations } from './utils/i18n';
import { MapPin, Film, Compass, ExternalLink, Ticket, ShieldCheck, Heart, Sparkles, AlertCircle, ArrowRight, ChevronRight } from 'lucide-react';

export default function App() {
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

  // Geolocation & Nearby state
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [nearbyCinemas, setNearbyCinemas] = useState<(Cinema & { distance_km: number })[]>([]);

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

  // Initial Data Fetch
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [movRes, cinRes, setRes, citRes] = await Promise.all([
          fetch('/api/movies'),
          fetch('/api/cinemas'),
          fetch('/api/admin/settings'),
          fetch('/api/cities?limit=1')
        ]);

        if (movRes.ok) setMovies(await movRes.json());
        if (cinRes.ok) setCinemas(await cinRes.json());
        if (setRes.ok) setSettings(await setRes.json());
        if (citRes.ok) {
          const citData = await citRes.json();
          if (citData.total) setCitiesCount(citData.total);
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

  // Geolocation Handler
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('La geolocalizzazione non è supportata dal tuo browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/nearby?lat=${latitude}&lng=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            if (data.closest_city) {
              setActiveCity(data.closest_city);
            }
            if (data.cinemas) {
              setNearbyCinemas(data.cinemas);
            }
          }
        } catch (err) {
          console.error('Failed to resolve nearby cinemas', err);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation denied or unavailable, using Roma default anchor', err);
        setIsLocating(false);
        // Fallback default anchor to Roma
        fetch('/api/cities/roma')
          .then(r => r.json())
          .then(data => {
            if (data.city) setActiveCity(data.city);
          });
      },
      { timeout: 8000 }
    );
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

  const handleSelectPopularCity = async (slug: string) => {
    try {
      const res = await fetch(`/api/cities/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setActiveCity(data.city);
        setView('city');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950">
      
      {/* 1. Universal Top Header */}
      <Header
        lang={lang}
        onToggleLang={handleToggleLang}
        onSelectCity={(c) => {
          setActiveCity(c);
          setView('city');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onLocateMe={handleLocateMe}
        isLocating={isLocating}
        activeCity={activeCity}
        favoritesCount={favoriteMovieIds.length + favoriteCinemaIds.length}
        onOpenFavorites={() => setShowFavorites(true)}
        onOpenAdmin={() => setShowAdmin(true)}
        onOpenAllCities={() => {
          setView('directory');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAllMovies={() => {
          setView('all-movies');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenHome={() => {
          setView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        user={user}
        onOpenLogin={() => setShowLogin(true)}
      />

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
            <div className="border-b border-neutral-800/80 bg-neutral-900/40 py-3 px-4">
              <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
                <span className="text-neutral-400 font-medium whitespace-nowrap flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  Città popolari:
                </span>
                {popularCities.map(c => (
                  <button
                    key={c.slug}
                    onClick={() => handleSelectPopularCity(c.slug)}
                    className="px-3 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors whitespace-nowrap font-medium"
                  >
                    {c.name} <span className="text-[10px] text-neutral-400 font-mono">({c.prov})</span>
                  </button>
                ))}
                <button
                  onClick={() => setView('directory')}
                  className="px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors whitespace-nowrap font-bold flex items-center gap-1 ml-auto"
                >
                  <span>Tutti i 7.894 Comuni</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Geolocation Nearby Cinemas Section (when active) */}
            {nearbyCinemas.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
                <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Compass className="w-5 h-5 text-amber-400 animate-spin-slow" />
                      <h2 className="text-lg font-bold text-white">
                        Cinema più vicini alla tua posizione attuale
                      </h2>
                    </div>
                    {activeCity && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                        Vicino a {activeCity.name}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {nearbyCinemas.slice(0, 4).map(c => (
                      <div
                        key={c.id}
                        className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-amber-400 font-mono">
                              {c.distance_km.toFixed(1)} km
                            </span>
                            {c.chain && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
                                {c.chain}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-white text-sm mt-2">{c.name}</h4>
                          <p className="text-xs text-neutral-400 mt-1 line-clamp-1">{c.address}</p>
                        </div>
                        <a
                          href={c.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 pt-3 border-t border-neutral-800 text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center justify-between"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <Film className="w-6 h-6 text-amber-500" />
                    <span>{t.featuredMovies}</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                    Locandine, trame arricchite TMDb e orari orari verificati per l'acquisto diretto del biglietto.
                  </p>
                </div>

                {/* Search in movies */}
                <input
                  type="text"
                  value={movieSearchQuery}
                  onChange={e => setMovieSearchQuery(e.target.value)}
                  placeholder="Cerca film, regista o attore..."
                  className="px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 w-full sm:w-64"
                />
              </div>

              {/* Movies Grid */}
              {filteredMovies.length === 0 ? (
                <div className="py-16 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800 p-8">
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
                      onSelect={(m) => setSelectedMovie(m)}
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
            onBack={() => setView('home')}
            onSelectMovie={(m) => setSelectedMovie(m)}
            onSelectCity={(c) => setActiveCity(c)}
            onToggleFavorite={handleToggleFavoriteCinema}
            favoriteIds={favoriteCinemaIds}
          />
        )}

        {/* VIEW: COMUNI DIRECTORY */}
        {view === 'directory' && (
          <ComuniDirectory
            lang={lang}
            onBack={() => setView('home')}
            onSelectCity={(c) => {
              setActiveCity(c);
              setView('city');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* VIEW: ALL MOVIES */}
        {view === 'all-movies' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fadeIn">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-white">Tutti i Film in Sala in Italia</h1>
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
                  onSelect={(m) => setSelectedMovie(m)}
                  isFavorite={favoriteMovieIds.includes(movie.id)}
                  onToggleFavorite={handleToggleFavoriteMovie}
                />
              ))}
            </div>
          </div>
        )}

      </main>

      {/* 3. Comprehensive Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-950 text-xs text-neutral-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Brand column */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                  <Film className="w-4 h-4" />
                </div>
                <span className="font-bold text-base text-white">CineVicino Italia</span>
              </div>
              <p className="text-neutral-400 text-xs leading-relaxed max-w-md">
                CineVicino è la directory indipendente che copre tutti i 7.894 comuni d'Italia. Mostra orari aggiornati e reindirizza gli spettatori direttamente alle biglietterie autorizzate delle sale cinematografiche (UCI Cinemas, The Space Cinema, 18Tickets, Vivaticket, Liveticket).
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-neutral-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> Nessuna commissione aggiunta
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 text-amber-400">
                  <Ticket className="w-3.5 h-3.5" /> Reindirizzamento ufficiale
                </span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">
                Esplora
              </h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => { setView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors">
                    Home & Film in Sala
                  </button>
                </li>
                <li>
                  <button onClick={() => { setView('directory'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors">
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
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">
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
                <li>
                  <button onClick={() => setShowAdmin(true)} className="hover:text-amber-400 transition-colors">
                    Pannello Amministratore
                  </button>
                </li>
              </ul>
            </div>

          </div>

          {/* TMDb Attribution Banner & Disclaimer */}
          <div className="pt-6 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-400">
            <div className="flex items-center gap-3">
              <span className="font-medium text-neutral-300">
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
          onClose={() => setSelectedMovie(null)}
          activeCity={activeCity}
          onSelectCity={(c) => setActiveCity(c)}
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
            setSelectedMovie(m);
            setShowFavorites(false);
          }}
          onSelectCinema={(c) => {
            const city = activeCity; // find city
            if (c.city_id) {
              fetch(`/api/cities/${c.city_id}`).then(r => r.json()).then(d => {
                if (d.city) {
                  setActiveCity(d.city);
                  setView('city');
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
