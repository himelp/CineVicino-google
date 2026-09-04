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
    <div className="relative overflow-hidden border-b border-neutral-800/80 bg-gradient-to-b from-neutral-900/60 to-neutral-950/80 pt-10 pb-8 sm:pt-14 sm:pb-12">
      {/* Subtle backdrop texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.04] pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[280px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Status pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-700/80 text-xs text-neutral-300 mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium">
            Copertura nazionale attiva su <strong className="text-white">{totalComuni.toLocaleString('it-IT')} Comuni</strong> italiani
          </span>
          <span className="text-neutral-500">|</span>
          <span className="text-amber-400/90 flex items-center gap-1 font-mono">
            <Ticket className="w-3 h-3" /> Biglietti ufficiali
          </span>
        </div>

        {/* Dynamic Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-[1.15]">
          {headline}
        </h1>

        {/* Dynamic Subtext */}
        <p className="mt-4 text-base sm:text-lg text-neutral-300 max-w-2xl mx-auto leading-relaxed">
          {subtext}
        </p>

        {/* Big Geolocation Trigger */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onLocateMe}
            disabled={isLocating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm sm:text-base shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            <MapPin className={`w-5 h-5 ${isLocating ? 'animate-bounce' : ''}`} />
            <span>
              {isLocating ? 'Rilevamento posizione...' : activeCityName ? `Cinema vicino a ${activeCityName}` : t.nearbyBtn}
            </span>
          </button>
        </div>

        {/* Chain Filter Row */}
        <div className="mt-10">
          <div className="text-xs uppercase tracking-wider font-semibold text-neutral-400 mb-3 flex items-center justify-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-amber-500" />
            <span>Filtra per circuito o catena multiplex</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
            {chains.map((chain) => {
              const isSelected = selectedChain === chain.id;
              return (
                <button
                  key={chain.id}
                  onClick={() => onSelectChain(chain.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold shadow-sm'
                      : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <span>{chain.label}</span>
                  {chain.badge && !isSelected && (
                    <span className="text-[10px] text-neutral-400 font-mono px-1 py-0.2 rounded bg-neutral-800/80">
                      {chain.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Format & Audio Row */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          {formats.map((fmt) => {
            const isSelected = selectedFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => onSelectFormat(fmt.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-neutral-100 text-neutral-950 font-semibold'
                    : 'text-neutral-400 hover:text-white bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700'
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
