import React, { useState, useEffect, useRef } from 'react';
import { Film, MapPin, Search, Globe, Bookmark, Shield, User, X, ChevronRight, Sparkles, Menu, Calendar, Star, Clock } from 'lucide-react';
import { City, Movie } from '../types';
import { Language, translations } from '../utils/i18n';
import { safeFetchJson } from '../utils/api';
import { formatTodayFull } from '../utils/date';

export interface SocialLinkItem {
  id: string;
  name: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

export type SearchTab = 'cities' | 'movies';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  onSelectCity: (city: City) => void;
  onSelectMovie?: (movie: Movie) => void;
  onLocateMe: () => void;
  isLocating: boolean;
  activeCity: City | null;
  favoritesCount: number;
  onOpenFavorites: () => void;
  onOpenAdmin: () => void;
  onOpenAllCities: () => void;
  onOpenAllMovies: () => void;
  onOpenHome: () => void;
  user: any;
  onOpenLogin: () => void;
  socialLinks?: SocialLinkItem[];
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  onSelectCity,
  onSelectMovie,
  onLocateMe,
  isLocating,
  activeCity,
  favoritesCount,
  onOpenFavorites,
  onOpenAdmin,
  onOpenAllCities,
  onOpenAllMovies,
  onOpenHome,
  user,
  onOpenLogin,
  socialLinks = []
}) => {
  const t = translations[lang];
  const [searchTab, setSearchTab] = useState<SearchTab>(() => {
    try {
      const saved = localStorage.getItem('cinevicino_search_tab');
      if (saved === 'movies' || saved === 'cities') return saved;
    } catch {}
    return 'cities';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [movieSuggestions, setMovieSuggestions] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const handleSearchTabChange = (tab: SearchTab) => {
    setSearchTab(tab);
    try {
      localStorage.setItem('cinevicino_search_tab', tab);
    } catch {}
    setSearchQuery('');
    setSuggestions([]);
    setMovieSuggestions([]);
    setShowDropdown(false);
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus mobile search input when opened
  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileSearchRef.current?.focus(), 100);
    }
  }, [mobileSearchOpen]);

  // Fetch search suggestions based on active tab
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setMovieSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        if (searchTab === 'cities') {
          const parsed = await safeFetchJson<any>(`/api/cities?q=${encodeURIComponent(trimmed)}&limit=8`);
          if (parsed.ok && parsed.data?.cities) {
            setSuggestions(parsed.data.cities);
            setShowDropdown(true);
          }
        } else {
          const parsed = await safeFetchJson<{ movies: Movie[] }>(`/api/movies/search?q=${encodeURIComponent(trimmed)}&limit=8`);
          if (parsed.ok && Array.isArray(parsed.data?.movies)) {
            setMovieSuggestions(parsed.data.movies);
            setShowDropdown(true);
          }
        }
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, searchTab]);

  const handleSelectCity = (c: City) => {
    onSelectCity(c);
    setSearchQuery('');
    setShowDropdown(false);
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
  };

  const handleSelectMovie = (m: Movie) => {
    if (onSelectMovie) {
      onSelectMovie(m);
    }
    setSearchQuery('');
    setShowDropdown(false);
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* Logo & Navigation */}
          <div className="flex items-center gap-3 sm:gap-6 lg:gap-8 min-w-0">
            <div 
              onClick={() => {
                onOpenHome();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group flex-shrink-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black transition-all shadow-sm">
                <Film className="w-4 h-4" />
              </div>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="font-serif italic text-xl sm:text-2xl tracking-tight text-white group-hover:text-[#D4AF37] transition-colors">
                  CineVicino
                </span>
                <span className="hidden xs:inline text-[9px] uppercase font-mono tracking-widest text-neutral-500 border border-white/10 px-1 py-0.5 rounded">
                  IT
                </span>
              </div>
            </div>

            {/* Desktop Editorial Nav links */}
            <nav className="hidden md:flex items-center gap-6 text-xs uppercase tracking-widest text-neutral-400">
              <button 
                onClick={onOpenAllMovies}
                className="hover:text-white transition-colors py-1 hover:border-b hover:border-white text-xs uppercase tracking-widest cursor-pointer"
              >
                {t.navMovies || (lang === 'it' ? 'Film' : 'Movies')}
              </button>
              <button 
                onClick={onOpenHome}
                className="hover:text-white transition-colors py-1 hover:border-b hover:border-white text-xs uppercase tracking-widest cursor-pointer"
              >
                {t.navCinemas || (lang === 'it' ? 'Cinema' : 'Cinemas')}
              </button>
              <button 
                onClick={onOpenAllCities}
                className="hover:text-white transition-colors py-1 hover:border-b hover:border-white text-xs uppercase tracking-widest cursor-pointer"
              >
                {t.navCities || (lang === 'it' ? 'Città' : 'Cities')}
              </button>
              {user?.is_admin && (
                <button 
                  onClick={onOpenAdmin}
                  className="hover:text-[#D4AF37] text-[#D4AF37] transition-colors py-1 text-xs uppercase tracking-widest flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </button>
              )}
            </nav>
          </div>

          {/* Desktop Search bar with instant autocomplete */}
          <div ref={searchRef} className="relative flex-1 max-w-md hidden sm:block">
            {/* Search Tab Switcher (Città vs Film) */}
            <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
              <button
                type="button"
                onClick={() => handleSearchTabChange('cities')}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1 ${
                  searchTab === 'cities'
                    ? 'bg-[#D4AF37] text-black shadow-sm font-bold'
                    : 'text-neutral-400 hover:text-white bg-white/[0.05] hover:bg-white/10'
                }`}
              >
                <MapPin className="w-3 h-3" />
                <span>{lang === 'it' ? 'Città' : 'Cities'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSearchTabChange('movies')}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1 ${
                  searchTab === 'movies'
                    ? 'bg-[#D4AF37] text-black shadow-sm font-bold'
                    : 'text-neutral-400 hover:text-white bg-white/[0.05] hover:bg-white/10'
                }`}
              >
                <Film className="w-3 h-3" />
                <span>{lang === 'it' ? 'Film & Cast' : 'Movies'}</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                placeholder={
                  searchTab === 'cities'
                    ? (activeCity ? `${activeCity.name} (${activeCity.province_code})` : (lang === 'it' ? 'Cerca la tua città o comune...' : 'Search Italian city...'))
                    : (lang === 'it' ? 'Cerca film, regista o attore...' : 'Search movie, director or cast...')
                }
                className="w-full bg-white/5 border border-white/20 rounded-full px-4 py-2 pl-4 pr-10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                {isSearching ? (
                  <Sparkles className="w-4 h-4 text-[#D4AF37] animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-9 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-white/5 backdrop-blur-xl max-h-96 overflow-y-auto">
                {searchTab === 'cities' ? (
                  suggestions.length > 0 ? (
                    <>
                      <div className="p-3 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold bg-white/[0.02] flex items-center justify-between">
                        <span>Comuni italiani ({suggestions.length})</span>
                        <span className="text-[#D4AF37]">Archivio Nazionale ISTAT</span>
                      </div>
                      {suggestions.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCity(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center justify-between text-sm group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <MapPin className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                            <div>
                              <span className="font-medium text-white">{c.name}</span>
                              <span className="text-neutral-400 text-xs ml-1.5 font-mono">({c.province_code})</span>
                              <span className="text-neutral-500 text-xs ml-2">· {c.region}</span>
                            </div>
                          </div>
                          {(c.cinema_count || 0) > 0 ? (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 font-bold">
                              {c.cinema_count} cinema
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-400 flex items-center gap-1">
                              Vicino <ChevronRight className="w-3 h-3" />
                            </span>
                          )}
                        </button>
                      ))}
                    </>
                  ) : (
                    !isSearching && searchQuery.trim().length >= 2 && (
                      <div className="p-4 text-center text-xs text-neutral-400">
                        Nessun comune trovato per &quot;<span className="text-white">{searchQuery}</span>&quot;
                      </div>
                    )
                  )
                ) : (
                  movieSuggestions.length > 0 ? (
                    <>
                      <div className="p-3 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold bg-white/[0.02] flex items-center justify-between">
                        <span>Film in sala ({movieSuggestions.length})</span>
                        <span className="text-[#D4AF37]">Nelle sale in Italia</span>
                      </div>
                      {movieSuggestions.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => handleSelectMovie(m)}
                          className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center justify-between text-sm group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {m.poster_url ? (
                              <img
                                src={m.poster_url}
                                alt={m.title_it}
                                className="w-9 h-13 object-cover rounded-md flex-shrink-0 border border-white/10 bg-neutral-900"
                              />
                            ) : (
                              <div className="w-9 h-13 rounded-md bg-neutral-800 border border-white/10 flex items-center justify-center flex-shrink-0">
                                <Film className="w-4 h-4 text-neutral-500" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate group-hover:text-[#D4AF37] transition-colors">
                                {m.title_it}
                              </p>
                              <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                                {m.release_year && <span>{m.release_year}</span>}
                                {m.duration_minutes && <span>· {m.duration_minutes}m</span>}
                                {m.director && <span className="truncate">· {m.director}</span>}
                                {typeof m.active_showtimes_count !== 'undefined' && (
                                  parseInt(m.active_showtimes_count as any, 10) > 0 ? (
                                    <span className="text-emerald-400 font-medium truncate">
                                      · {m.active_showtimes_count} {lang === 'it' ? (parseInt(m.active_showtimes_count as any, 10) === 1 ? 'orario' : 'orari') : (parseInt(m.active_showtimes_count as any, 10) === 1 ? 'showtime' : 'showtimes')}
                                    </span>
                                  ) : (
                                    <span className="text-neutral-500 truncate">
                                      · {lang === 'it' ? 'Nessun orario' : 'No showtimes'}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            {m.rating ? (
                              <span className="flex items-center gap-1 text-xs font-mono font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-md border border-[#D4AF37]/20">
                                <Star className="w-3 h-3 fill-[#D4AF37]" />
                                {m.rating}
                              </span>
                            ) : null}
                            <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
                          </div>
                        </button>
                      ))}
                    </>
                  ) : (
                    !isSearching && searchQuery.trim().length >= 2 && (
                      <div className="p-4 text-center text-xs text-neutral-400">
                        Nessun film trovato per &quot;<span className="text-white">{searchQuery}</span>&quot;
                      </div>
                    )
                  )
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            
            {/* Today's live date indicator (Desktop) */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-neutral-300 text-xs font-medium whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span className="capitalize">{formatTodayFull(lang)}</span>
            </div>

            {/* Mobile Search Button */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              title="Cerca comune"
              className="sm:hidden min-w-[40px] min-h-[40px] p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 flex items-center justify-center transition-colors"
            >
              {mobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>

            {/* Geolocation Button */}
            <button
              onClick={onLocateMe}
              disabled={isLocating}
              title={t.nearbyBtn}
              className="bg-[#D4AF37] text-black text-xs font-bold min-h-[40px] sm:min-h-[44px] px-3 sm:px-4 py-2 rounded-full uppercase tracking-tighter hover:bg-white transition-colors shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap active:scale-95"
            >
              <MapPin className={`w-3.5 h-3.5 shrink-0 ${isLocating ? 'animate-bounce' : ''}`} />
              <span className="max-w-[70px] sm:max-w-[140px] truncate">
                {isLocating ? '...' : activeCity ? activeCity.name : 'Vicino'}
              </span>
            </button>

            {/* Favorites Icon Button */}
            <button
              onClick={onOpenFavorites}
              title={t.favorites}
              className="relative min-w-[40px] min-h-[40px] p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <Bookmark className="w-4 h-4" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D4AF37] text-black text-[10px] font-bold flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Social Media Links (Desktop - shown only if configured) */}
            {socialLinks && socialLinks.length > 0 && (
              <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.03] border border-white/10">
                {socialLinks.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.id}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${s.name} - CineVicino`}
                      aria-label={`${s.name} - CineVicino`}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </a>
                  );
                })}
              </div>
            )}

            {/* Language Switcher (Desktop) */}
            <button
              onClick={onToggleLang}
              title="Cambia Lingua / Switch Language"
              className="hidden sm:flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-medium text-neutral-300 hover:text-white transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-[10px] font-bold tracking-widest">{lang.toUpperCase()}</span>
            </button>

            {/* User Login/Account (Desktop) */}
            <button
              onClick={onOpenLogin}
              className="hidden md:flex items-center gap-1.5 min-h-[44px] px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-200 hover:text-white transition-colors"
            >
              <User className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-xs">
                {user ? user.name : t.login}
              </span>
            </button>

            {/* Mobile Hamburger Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              title="Menu"
              className="md:hidden min-w-[40px] min-h-[40px] p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Mobile Search Row (when toggled on) */}
        {mobileSearchOpen && (
          <div className="sm:hidden pb-3 pt-2 border-t border-white/10 animate-fadeIn">
            {/* Search Tab Switcher */}
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => handleSearchTabChange('cities')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  searchTab === 'cities'
                    ? 'bg-[#D4AF37] text-black font-bold shadow-sm'
                    : 'bg-white/5 text-neutral-400 hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{lang === 'it' ? 'Cerca Città' : 'Search City'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSearchTabChange('movies')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  searchTab === 'movies'
                    ? 'bg-[#D4AF37] text-black font-bold shadow-sm'
                    : 'bg-white/5 text-neutral-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>{lang === 'it' ? 'Cerca Film' : 'Search Movie'}</span>
              </button>
            </div>

            <div className="relative">
              <input
                ref={mobileSearchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchTab === 'cities'
                    ? (activeCity ? `${activeCity.name} (${activeCity.province_code})` : (lang === 'it' ? 'Cerca un comune italiano...' : 'Search Italian city...'))
                    : (lang === 'it' ? 'Cerca film, regista o attore...' : 'Search movie, director or cast...')
                }
                className="w-full bg-white/5 border border-white/20 rounded-full px-4 py-2.5 pl-4 pr-10 text-base text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37]"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                {isSearching ? <Sparkles className="w-4 h-4 text-[#D4AF37] animate-spin" /> : <Search className="w-4 h-4" />}
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-9 top-1/2 -translate-y-1/2 text-neutral-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile search suggestions */}
            {searchTab === 'cities' ? (
              suggestions.length > 0 ? (
                <div className="mt-2 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden divide-y divide-white/5 max-h-60 overflow-y-auto">
                  {suggestions.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCity(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center justify-between text-sm active:bg-white/10 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                        <span className="font-medium text-white">{c.name} ({c.province_code})</span>
                      </div>
                      {(c.cinema_count || 0) > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-bold">
                          {c.cinema_count} cinema
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                !isSearching && searchQuery.trim().length >= 2 && (
                  <div className="mt-2 p-3 text-center text-xs text-neutral-400 bg-[#0a0a0a] border border-white/10 rounded-xl">
                    Nessun comune trovato per &quot;<span className="text-white">{searchQuery}</span>&quot;
                  </div>
                )
              )
            ) : (
              movieSuggestions.length > 0 ? (
                <div className="mt-2 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden divide-y divide-white/5 max-h-72 overflow-y-auto">
                  {movieSuggestions.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectMovie(m)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center justify-between text-sm active:bg-white/10 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {m.poster_url ? (
                          <img
                            src={m.poster_url}
                            alt={m.title_it}
                            className="w-8 h-12 object-cover rounded-md flex-shrink-0 border border-white/10 bg-neutral-900"
                          />
                        ) : (
                          <div className="w-8 h-12 rounded-md bg-neutral-800 border border-white/10 flex items-center justify-center flex-shrink-0">
                            <Film className="w-3.5 h-3.5 text-neutral-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate text-xs sm:text-sm">
                            {m.title_it}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                            {[
                              m.release_year,
                              m.duration_minutes ? `${m.duration_minutes}m` : null,
                              m.director,
                              typeof m.active_showtimes_count !== 'undefined'
                                ? (parseInt(m.active_showtimes_count as any, 10) > 0
                                    ? `${m.active_showtimes_count} ${lang === 'it' ? (parseInt(m.active_showtimes_count as any, 10) === 1 ? 'orario' : 'orari') : (parseInt(m.active_showtimes_count as any, 10) === 1 ? 'showtime' : 'showtimes')}`
                                    : (lang === 'it' ? 'Nessun orario' : 'No showtimes'))
                                : null
                            ].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-500 flex-shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              ) : (
                !isSearching && searchQuery.trim().length >= 2 && (
                  <div className="mt-2 p-3 text-center text-xs text-neutral-400 bg-[#0a0a0a] border border-white/10 rounded-xl">
                    {lang === 'it' ? 'Nessun film trovato per' : 'No movies found for'} &quot;<span className="text-white">{searchQuery}</span>&quot;
                  </div>
                )
              )
            )}
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10 space-y-2 animate-fadeIn bg-[#0a0a0a]/95 pb-safe">
            {/* Live Today Date Display in Mobile Drawer */}
            <div className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs text-neutral-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span className="capitalize font-medium">{formatTodayFull(lang)}</span>
              </div>
              <span className="text-[10px] text-neutral-500 font-mono font-bold tracking-wider">{lang === 'it' ? 'OGGI' : 'TODAY'}</span>
            </div>

            <button
              onClick={() => {
                onOpenAllMovies();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/5 text-sm font-medium text-white"
            >
              <div className="flex items-center gap-2.5">
                <Film className="w-4 h-4 text-[#D4AF37]" />
                <span>{lang === 'it' ? 'Film in Programmazione' : 'Now Playing Movies'}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            <button
              onClick={() => {
                onOpenHome();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/5 text-sm font-medium text-white"
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#D4AF37]" />
                <span>{lang === 'it' ? 'Tutti i Cinema e Multiplex' : 'All Cinemas & Multiplexes'}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            <button
              onClick={() => {
                onOpenAllCities();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/5 text-sm font-medium text-white"
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-[#D4AF37]" />
                <span>{lang === 'it' ? 'Directory dei 7.894 Comuni' : '7,894 Municipalities Directory'}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  onOpenLogin();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-2 min-h-[44px] py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white active:bg-white/10"
              >
                <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{user ? user.name : t.login}</span>
              </button>

              <button
                onClick={onToggleLang}
                className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold text-neutral-300"
              >
                <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{lang.toUpperCase()}</span>
              </button>

              {user?.is_admin && (
                <button
                  onClick={() => {
                    onOpenAdmin();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-xs font-bold text-[#D4AF37]"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
              )}
            </div>

            {/* Mobile Social Links (only shown if configured) */}
            {socialLinks && socialLinks.length > 0 && (
              <div className="pt-3 border-t border-white/10 flex items-center justify-between px-2 text-xs text-neutral-400">
                <span className="text-[11px] font-medium text-neutral-400">Seguici sui social:</span>
                <div className="flex items-center gap-2">
                  {socialLinks.map((s) => {
                    const Icon = s.icon;
                    return (
                      <a
                        key={s.id}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${s.name} - CineVicino`}
                        aria-label={`${s.name} - CineVicino`}
                        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </header>
  );
};
