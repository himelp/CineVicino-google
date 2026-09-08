import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, X, Check, Globe, Crosshair, ChevronDown, Sparkles } from 'lucide-react';
import { City } from '../types';
import { safeFetchJson } from '../utils/api';
import { useTranslation } from '../context/LanguageContext';

export interface AutoDetectInfo {
  detected: boolean;
  city_slug: string;
  city_name: string;
  province_code: string;
  region?: string;
  method: 'ip' | 'gps';
  confidence?: 'high' | 'medium' | 'low' | string;
  distance_km?: number;
}

interface AutoCityBannerProps {
  autoDetectInfo: AutoDetectInfo;
  activeCity: City | null;
  onSelectCity: (city: City) => void;
  onPreciseLocate: () => void;
  isPreciseLocating: boolean;
  onDismiss: () => void;
}

export const AutoCityBanner: React.FC<AutoCityBannerProps> = ({
  autoDetectInfo,
  activeCity,
  onSelectCity,
  onPreciseLocate,
  isPreciseLocating,
  onDismiss
}) => {
  const { t } = useTranslation();
  const [isChangingCity, setIsChangingCity] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsChangingCity(false);
      }
    }
    if (isChangingCity) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isChangingCity]);

  // Live search debounced
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const parsed = await safeFetchJson<any>(`/api/cities?q=${encodeURIComponent(query.trim())}&limit=6`);
        if (parsed.ok && parsed.data?.cities) {
          setSuggestions(parsed.data.cities);
        }
      } catch (err) {
        console.error('Error searching cities in banner', err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  const cityName = activeCity?.name || autoDetectInfo.city_name;
  const provCode = activeCity?.province_code || autoDetectInfo.province_code;
  const isGps = autoDetectInfo.method === 'gps';

  return (
    <aside
      aria-label="Posizione rilevata"
      className="relative z-30 bg-gradient-to-r from-[#0d0d0d] via-[#141414] to-[#0d0d0d] border-b border-amber-500/20 px-3.5 sm:px-6 py-2.5 shadow-md"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        
        {/* Left Side: Auto-detection pill and "Cambia città" */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-neutral-300">
          
          {/* Method Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide border ${
              isGps
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}
          >
            {isGps ? (
              <Crosshair className="w-3 h-3 text-emerald-400 animate-pulse" />
            ) : (
              <Globe className="w-3 h-3 text-amber-400" />
            )}
            <span>{isGps ? t.bannerGps : t.bannerIp}</span>
          </span>

          {/* Prompt statement */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-neutral-200">
              {t.bannerCinemasNear} <strong className="text-white underline decoration-amber-500/50 underline-offset-4">{cityName}</strong>{' '}
              {provCode && <span className="text-neutral-400 text-xs font-mono">({provCode})</span>}
            </span>
            <span className="text-neutral-500 hidden xs:inline">—</span>
            
            {/* Interactive "Non sei qui? Cambia città" */}
            <div className="relative inline-block" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsChangingCity(!isChangingCity)}
                className="font-semibold text-amber-400 hover:text-amber-300 hover:underline transition-colors cursor-pointer inline-flex items-center gap-1 min-h-[32px] px-1"
                aria-expanded={isChangingCity}
              >
                <span>{t.bannerNotHere}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isChangingCity ? 'rotate-180' : ''}`} />
              </button>

              {/* Inline quick city search popup */}
              {isChangingCity && (
                <div className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-2 w-72 sm:w-80 bg-[#141414] border border-white/20 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-x-1/2 text-neutral-400" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t.bannerSearchComuni}
                      className="w-full pl-8 pr-7 py-1.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Suggestions */}
                  <div className="mt-2 max-h-48 overflow-y-auto no-scrollbar divide-y divide-white/5">
                    {isSearching ? (
                      <div className="p-3 text-center text-xs text-neutral-400">{t.bannerSearching}</div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((city) => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => {
                            onSelectCity(city);
                            setIsChangingCity(false);
                            setQuery('');
                          }}
                          className="w-full text-left px-2.5 py-2 hover:bg-white/5 rounded-lg flex items-center justify-between text-xs text-neutral-300 hover:text-white transition-colors"
                        >
                          <span className="font-medium">{city.name}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {city.province_code} • {city.region}
                          </span>
                        </button>
                      ))
                    ) : query.trim().length >= 2 ? (
                      <div className="p-3 text-center text-xs text-neutral-500">{t.bannerNoCityFound}</div>
                    ) : (
                      <div className="p-2 text-[11px] text-neutral-400 text-center">
                        {t.bannerTypeMinChars}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: "Usa la mia posizione precisa" button & Dismiss */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {!isGps && (
            <button
              type="button"
              onClick={onPreciseLocate}
              disabled={isPreciseLocating}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-neutral-100 hover:text-white border border-white/15 transition-all text-xs font-semibold active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap min-h-[34px]"
              title="Richiedi coordinate GPS/Wi-Fi precise per trovare i cinema più vicini"
            >
              <Navigation className={`w-3.5 h-3.5 text-amber-400 ${isPreciseLocating ? 'animate-spin' : ''}`} />
              <span>
                {isPreciseLocating ? t.bannerLocating : t.bannerPreciseLocate}
              </span>
            </button>
          )}

          {/* Dismiss button */}
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t.close}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </aside>
  );
};
