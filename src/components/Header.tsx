import React, { useState, useEffect, useRef } from 'react';
import { Film, MapPin, Search, Globe, Bookmark, Shield, User, X, ChevronRight, Sparkles } from 'lucide-react';
import { City } from '../types';
import { Language, translations } from '../utils/i18n';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  onSelectCity: (city: City) => void;
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
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  onSelectCity,
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
  onOpenLogin
}) => {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  // Fetch search suggestions
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`/api/cities?q=${encodeURIComponent(searchQuery.trim())}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.cities || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectCity = (c: City) => {
    onSelectCity(c);
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Slogan */}
          <div 
            onClick={onOpenHome}
            className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-neutral-950 transition-all shadow-sm">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  CineVicino
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                  Italia
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* Search bar with instant autocomplete for all Italian Comuni */}
          <div ref={searchRef} className="relative flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                placeholder={activeCity ? `${activeCity.name} (${activeCity.province_code}) — cambia comune...` : t.searchPlaceholder}
                className="w-full pl-10 pr-9 py-2 bg-neutral-900/90 border border-neutral-700 rounded-full text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-neutral-800">
                <div className="p-2 text-[11px] uppercase tracking-wider text-neutral-400 font-semibold bg-neutral-950/60 flex items-center justify-between">
                  <span>Comuni trovati ({suggestions.length})</span>
                  <span className="text-neutral-400">Tutta Italia</span>
                </div>
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCity(c)}
                    className="w-full text-left px-4 py-2.5 hover:bg-neutral-800/80 transition-colors flex items-center justify-between text-sm group"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-amber-500/80 group-hover:text-amber-400" />
                      <div>
                        <span className="font-medium text-white">{c.name}</span>
                        <span className="text-neutral-400 text-xs ml-1.5 font-mono">({c.province_code})</span>
                        <span className="text-neutral-400 text-xs ml-2">· {c.region}</span>
                      </div>
                    </div>
                    {(c.cinema_count || 0) > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                        {c.cinema_count} cinema
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-400 flex items-center gap-1 group-hover:text-neutral-400">
                        Nelle vicinanze <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Geolocation Button */}
            <button
              onClick={onLocateMe}
              disabled={isLocating}
              title={t.nearbyBtn}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-neutral-950 text-xs sm:text-sm font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <MapPin className={`w-3.5 h-3.5 ${isLocating ? 'animate-bounce text-amber-400' : ''}`} />
              <span className="hidden sm:inline">
                {isLocating ? 'Rilevamento...' : activeCity ? activeCity.name : t.nearbyBtn}
              </span>
            </button>

            {/* Film in Sala */}
            <button
              onClick={onOpenAllMovies}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs sm:text-sm font-medium transition-colors"
            >
              <Film className="w-4 h-4 text-neutral-400" />
              <span>{t.allMovies}</span>
            </button>

            {/* Tutti i Comuni */}
            <button
              onClick={onOpenAllCities}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs sm:text-sm font-medium transition-colors"
            >
              <span>{t.allCities}</span>
            </button>

            {/* Favorites Icon Button */}
            <button
              onClick={onOpenFavorites}
              title={t.favorites}
              className="relative p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <Bookmark className="w-4 h-4" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-bold flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Admin Panel button */}
            <button
              onClick={onOpenAdmin}
              title={t.adminPanel}
              className="p-2 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
            >
              <Shield className="w-4 h-4" />
            </button>

            {/* Language Switcher */}
            <button
              onClick={onToggleLang}
              title="Cambia Lingua / Switch Language"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-700 text-xs font-mono font-medium text-neutral-300 hover:border-neutral-500 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              <span>{lang.toUpperCase()}</span>
            </button>

            {/* User Login/Account */}
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs sm:text-sm font-medium text-white transition-colors"
            >
              <User className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">
                {user ? user.name : t.login}
              </span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
