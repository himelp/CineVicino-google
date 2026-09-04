import React from 'react';
import { MapPin, Search, Sparkles, Film, Compass, ExternalLink, Ticket, CheckCircle2 } from 'lucide-react';
import { CinemaChain, MovieFormat } from '../types';
import { Language, translations } from '../utils/i18n';

interface HeroProps {
  lang: Language;
  headline: string;
  subtext: string;
  selectedChain: CinemaChain | 'all' | 'independent';
  onSelectChain: (chain: CinemaChain | 'all' | 'independent') => void;
  selectedFormat: string;
  onSelectFormat: (format: string) => void;
  onLocateMe: () => void;
  isLocating: boolean;
  activeCityName?: string;
  totalComuni: number;
}

export const Hero: React.FC<HeroProps> = ({
  lang,
  headline,
  subtext,
  selectedChain,
  onSelectChain,
  selectedFormat,
  onSelectFormat,
  onLocateMe,
  isLocating,
  activeCityName,
  totalComuni
}) => {
  const t = translations[lang];

  const chains: { id: CinemaChain | 'all' | 'independent'; label: string; badge?: string }[] = [
    { id: 'all', label: t.allChains },
    { id: 'UCI', label: 'UCI Cinemas', badge: '~36 multiplex' },
    { id: 'The Space Cinema', label: 'The Space Cinema', badge: 'Vue Int.' },
    { id: 'Notorious', label: 'Notorious Cinemas', badge: 'Eco-relax' },
    { id: 'Arcadia', label: 'Arcadia Cinema', badge: 'Sala Energia' },
    { id: 'Anteo', label: 'Anteo Spazio Cinema', badge: 'Milano' },
    { id: 'independent', label: t.independentChains, badge: '18Tickets / Live' }
  ];

  const formats = [
    { id: 'all', label: t.allFormats },
    { id: 'IMAX', label: 'IMAX Laser' },
    { id: 'Atmos', label: 'Dolby Atmos' },
    { id: 'ISense', label: 'ISense' },
    { id: 'VOSE', label: t.originalVersion }
  ];

  return (
    <div className="relative overflow-hidden border-b border-white/10 bg-[#050505] pt-12 pb-10 sm:pt-16 sm:pb-14">
      {/* Subtle warm gold ambient backdrop */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[320px] bg-[#D4AF37]/5 blur-[160px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Status pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-xs text-neutral-300 mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-xs tracking-wide">
            Copertura attiva su <strong className="text-white">{totalComuni.toLocaleString('it-IT')} Comuni</strong> italiani
          </span>
          <span className="text-neutral-600">|</span>
          <span className="text-[#D4AF37] flex items-center gap-1 font-mono text-[11px]">
            <Ticket className="w-3 h-3" /> Biglietterie Ufficiali
          </span>
        </div>

        {/* Dynamic Editorial Serif Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif text-white tracking-tight max-w-4xl mx-auto leading-[1.18]">
          {headline}
        </h1>

        {/* Dynamic Subtext */}
        <p className="mt-4 text-sm sm:text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed">
          {subtext}
        </p>

        {/* Big Geolocation Trigger */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onLocateMe}
            disabled={isLocating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-full bg-[#D4AF37] hover:bg-white text-black text-xs sm:text-sm font-bold uppercase tracking-tighter shadow-xl transition-all disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <MapPin className={`w-4 h-4 ${isLocating ? 'animate-bounce' : ''}`} />
            <span>
              {isLocating ? 'Rilevamento posizione...' : activeCityName ? `Cinema vicino a ${activeCityName}` : t.nearbyBtn}
            </span>
          </button>
        </div>

        {/* Chain Filter Row */}
        <div className="mt-10">
          <div className="text-[11px] uppercase tracking-[0.2em] font-medium text-neutral-400 mb-3 flex items-center justify-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Circuiti & Catene Multiplex</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
            {chains.map((chain) => {
              const isSelected = selectedChain === chain.id;
              return (
                <button
                  key={chain.id}
                  onClick={() => onSelectChain(chain.id)}
                  className={`px-4 py-1.5 rounded-full text-xs transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-bold shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-300 border-white/10 hover:text-white'
                  }`}
                >
                  <span>{chain.label}</span>
                  {chain.badge && !isSelected && (
                    <span className="text-[10px] text-neutral-400 font-mono px-1 py-0.2 rounded bg-white/5">
                      {chain.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Format & Audio Row */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {formats.map((fmt) => {
            const isSelected = selectedFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => onSelectFormat(fmt.id)}
                className={`px-3.5 py-1 rounded-full text-xs transition-all border ${
                  isSelected
                    ? 'bg-white text-black font-bold border-white'
                    : 'text-neutral-400 hover:text-white bg-white/[0.03] border-white/10 hover:border-white/20'
                }`}
              >
                {fmt.label}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
