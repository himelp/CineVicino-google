import React, { useState } from 'react';
import { X, Bookmark, Film, MapPin, Bell, Trash2, CheckCircle2, ExternalLink, Mail } from 'lucide-react';
import { Movie, Cinema, City } from '../types';
import { Language, translations } from '../utils/i18n';

interface FavoritesModalProps {
  lang: Language;
  onClose: () => void;
  favoriteMovies: Movie[];
  favoriteCinemas: Cinema[];
  onRemoveFavoriteMovie: (id: string) => void;
  onRemoveFavoriteCinema: (id: string) => void;
  onSelectMovie: (movie: Movie) => void;
  onSelectCinema: (cinema: Cinema) => void;
  activeCity: City | null;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  lang,
  onClose,
  favoriteMovies,
  favoriteCinemas,
  onRemoveFavoriteMovie,
  onRemoveFavoriteCinema,
  onSelectMovie,
  onSelectCinema,
  activeCity
}) => {
  const t = translations[lang];
  const [alertEmail, setAlertEmail] = useState('');
  const [alertSubscribed, setAlertSubscribed] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);

  const handleSubscribeAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertEmail.trim()) return;

    try {
      setAlertLoading(true);
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: alertEmail.trim(),
          city_id: activeCity?.id || 'city-rm-058091'
        })
      });
      if (res.ok) {
        setAlertSubscribed(true);
        setAlertEmail('');
      }
    } catch (err) {
      console.error('Alert subscription failed', err);
    } finally {
      setAlertLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl my-auto text-neutral-200 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center">
              <Bookmark className="w-5 h-5 fill-[#D4AF37]" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-white">
                {t.favorites} & Avvisi
              </h2>
              <p className="text-xs text-neutral-400">
                I tuoi cinema e film salvati per un accesso immediato
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white text-neutral-400 hover:text-black transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="p-6 overflow-y-auto space-y-8 divide-y divide-white/10">
          
          {/* Favorite Cinemas */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] mb-3 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              <span>Cinema Preferiti ({favoriteCinemas.length})</span>
            </h3>

            {favoriteCinemas.length === 0 ? (
              <p className="text-xs text-neutral-500 py-3 italic">
                Nessun cinema salvato. Fai clic sull'icona segnalibro accanto a una sala per aggiungerla qui.
              </p>
            ) : (
              <div className="space-y-2">
                {favoriteCinemas.map(c => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 flex items-center justify-between gap-3 group transition-all"
                  >
                    <div 
                      onClick={() => {
                        onSelectCinema(c);
                        onClose();
                      }}
                      className="cursor-pointer flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-white group-hover:text-[#D4AF37] transition-colors">
                          {c.name}
                        </span>
                        {c.chain && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                            {c.chain}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">
                        {c.address}
                      </p>
                    </div>

                    <button
                      onClick={() => onRemoveFavoriteCinema(c.id)}
                      className="p-2 text-neutral-500 hover:text-rose-400 transition-colors"
                      title="Rimuovi dai preferiti"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Favorite Movies */}
          <div className="pt-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] mb-3 flex items-center gap-2">
              <Film className="w-3.5 h-3.5" />
              <span>Film Salvati ({favoriteMovies.length})</span>
            </h3>

            {favoriteMovies.length === 0 ? (
              <p className="text-xs text-neutral-500 py-3 italic">
                Nessun film salvato. Fai clic sul cuore/segnalibro su una scheda film per ritrovarlo qui.
              </p>
            ) : (
              <div className="space-y-2">
                {favoriteMovies.map(m => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 flex items-center justify-between gap-3 group transition-all"
                  >
                    <div 
                      onClick={() => {
                        onSelectMovie(m);
                        onClose();
                      }}
                      className="cursor-pointer flex items-center gap-3 flex-1 overflow-hidden"
                    >
                      <img
                        src={m.poster_url}
                        alt={m.title_it}
                        referrerPolicy="no-referrer"
                        className="w-10 h-14 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="truncate">
                        <span className="font-serif font-bold text-sm text-white group-hover:text-[#D4AF37] transition-colors block truncate">
                          {lang === 'en' ? m.title_en : m.title_it}
                        </span>
                        <span className="text-xs text-neutral-400 block mt-0.5 font-mono">
                          {m.release_year} · {m.genres.slice(0, 2).join(', ')}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveFavoriteMovie(m.id)}
                      className="p-2 text-neutral-500 hover:text-rose-400 transition-colors"
                      title="Rimuovi dai preferiti"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email Alert Subscription (Phase 5) */}
          <div className="pt-6">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-2 mb-1.5">
                <Bell className="w-4 h-4 text-[#D4AF37]" />
                <span className="font-serif font-bold text-sm text-white">
                  {t.emailAlerts} {activeCity ? `per ${activeCity.name}` : 'nel tuo comune'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                {t.alertSubtext}
              </p>

              {alertSubscribed ? (
                <div className="flex items-center gap-2 p-3 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{t.subSuccess}</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribeAlert} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={alertEmail}
                    onChange={e => setAlertEmail(e.target.value)}
                    placeholder="latua@email.it"
                    className="flex-1 px-4 py-2 rounded-full bg-black border border-white/20 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={alertLoading}
                    className="px-5 py-2 rounded-full bg-[#D4AF37] hover:bg-white text-black font-bold uppercase tracking-wider text-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {alertLoading ? 'Invio...' : t.subscribe}
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
