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
    <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo & Navigation */}
          <div className="flex items-center gap-6 lg:gap-8">
            <div 
              onClick={onOpenHome}
              className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
            >
              <div className="w-9 h-9 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black transition-all shadow-sm">
                <Film className="w-4 h-4" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif italic text-2xl tracking-tight text-white group-hover:text-[#D4AF37] transition-colors">
                  CineVicino
                </span>
                <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-500 border border-white/10 px-1.5 py-0.5 rounded">
                  Italia
                </span>
              </div>
            </div>

            {/* Editorial Nav links */}
            <nav className="hidden md:flex items-center gap-6 text-xs uppercase tracking-widest text-neutral-400">
              <button 
                onClick={onOpenAllMovies}
                className="hover:text-white transition-colors py-1 hover:border-b hover:border-white text-xs uppercase tracking-widest"
              >
                Film
              </button>
              <button 
                onClick={onOpenHome}
                className="hover:text-white transition-colors py-1 hover:border-b hover:border-white text-xs uppercase tracking-widest"
              >
                Cinema
              </button>
              <button 
                onClick={onOpenAllCities}
                className="hover:text-white transition-colors py-1 hover:border-b hover:border-white text-xs uppercase tracking-widest"
              >
                Città
              </button>
              <button 
                onClick={onOpenAdmin}
                className="hover:text-white transition-colors py-1 hover:border-b hover:border-white text-xs uppercase tracking-widest"
              >
                Admin
              </button>
            </nav>
          </div>

          {/* Search bar with instant autocomplete for all Italian Comuni */}
          <div ref={searchRef} className="relative flex-1 max-w-sm hidden sm:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                placeholder={activeCity ? `${activeCity.name} (${activeCity.province_code})` : 'Cerca la tua città...'}
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
                  onClick={() => setSearchQuery('')}
                  className="absolute right-9 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-white/5 backdrop-blur-xl">
                <div className="p-3 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold bg-white/[0.02] flex items-center justify-between">
                  <span>Comuni italiani ({suggestions.length})</span>
                  <span className="text-[#D4AF37]">Archivio Nazionale</span>
                </div>
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCity(c)}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center justify-between text-sm group"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
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
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            
            {/* Geolocation Button in Sophisticated Gold */}
            <button
              onClick={onLocateMe}
              disabled={isLocating}
              title={t.nearbyBtn}
              className="bg-[#D4AF37] text-black text-xs font-bold px-4 py-2.5 rounded-full uppercase tracking-tighter hover:bg-white transition-colors shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <MapPin className={`w-3.5 h-3.5 ${isLocating ? 'animate-bounce' : ''}`} />
              <span>
                {isLocating ? 'Rilevamento...' : activeCity ? activeCity.name : 'Posizione Attuale'}
              </span>
            </button>

            {/* Favorites Icon Button */}
            <button
              onClick={onOpenFavorites}
              title={t.favorites}
              className="relative p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors"
            >
              <Bookmark className="w-4 h-4" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D4AF37] text-black text-[10px] font-bold flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Language Switcher */}
            <button
              onClick={onToggleLang}
              title="Cambia Lingua / Switch Language"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-medium text-neutral-300 hover:text-white transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-[10px] font-bold tracking-widest">{lang.toUpperCase()}</span>
            </button>

            {/* User Login/Account */}
            <button
              onClick={onOpenLogin}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-200 hover:text-white transition-colors"
            >
              <User className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-xs">
                {user ? user.name : t.login}
              </span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
