import React, { useState, useEffect, useRef } from 'react';
import { Film, MapPin, Search, Globe, Bookmark, Shield, User, X, ChevronRight, Sparkles, Menu } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

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
                Film
              </button>
              <button 
                onClick={onOpenHome}
                className="hover:text-white transition-colors py-1 hover:border-b hover:border-white text-xs uppercase tracking-widest cursor-pointer"
              >
                Cinema
              </button>
              <button 
                onClick={onOpenAllCities}
                className="hover:text-white transition-colors py-1 hover:border-b hover:border-white text-xs uppercase tracking-widest cursor-pointer"
              >
                Città
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
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-white/5 backdrop-blur-xl max-h-80 overflow-y-auto">
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
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            
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
          <div className="sm:hidden pb-3 pt-1 border-t border-white/10 animate-fadeIn">
            <div className="relative">
              <input
                ref={mobileSearchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca un comune italiano..."
                className="w-full bg-white/5 border border-white/20 rounded-full px-4 py-2.5 pl-4 pr-10 text-base text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37]"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                {isSearching ? <Sparkles className="w-4 h-4 text-[#D4AF37] animate-spin" /> : <Search className="w-4 h-4" />}
              </span>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-9 top-1/2 -translate-y-1/2 text-neutral-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile search suggestions */}
            {suggestions.length > 0 && (
              <div className="mt-2 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden divide-y divide-white/5 max-h-60 overflow-y-auto">
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCity(c)}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center justify-between text-sm active:bg-white/10"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
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
            )}
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10 space-y-2 animate-fadeIn bg-[#0a0a0a]/95 pb-safe">
            <button
              onClick={() => {
                onOpenAllMovies();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/5 text-sm font-medium text-white"
            >
              <div className="flex items-center gap-2.5">
                <Film className="w-4 h-4 text-[#D4AF37]" />
                <span>Film in Programmazione</span>
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
                <span>Tutti i Cinema e Multiplex</span>
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
                <span>Directory dei 7.894 Comuni</span>
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
          </div>
        )}

      </div>
    </header>
  );
};
