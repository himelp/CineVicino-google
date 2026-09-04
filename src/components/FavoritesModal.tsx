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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl my-auto text-neutral-100 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Bookmark className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {t.favorites} & Avvisi
              </h2>
              <p className="text-xs text-neutral-400">
                I tuoi cinema e film salvati per un accesso immediato
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="p-6 overflow-y-auto space-y-8 divide-y divide-neutral-800">
          
          {/* Favorite Cinemas */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
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
                    className="p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between gap-3 group"
                  >
                    <div 
                      onClick={() => {
                        onSelectCinema(c);
                        onClose();
                      }}
                      className="cursor-pointer flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                          {c.name}
                        </span>
                        {c.chain && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-neutral-800 text-amber-400">
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
              <Film className="w-4 h-4" />
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
                    className="p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between gap-3 group"
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
                        <span className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors block truncate">
                          {lang === 'en' ? m.title_en : m.title_it}
                        </span>
                        <span className="text-xs text-neutral-400 block mt-0.5">
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
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm text-amber-300">
                  {t.emailAlerts} {activeCity ? `per ${activeCity.name}` : 'nel tuo comune'}
                </span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                {t.alertSubtext}
              </p>

              {alertSubscribed ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-medium">
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
                    className="flex-1 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={alertLoading}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors disabled:opacity-50"
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
