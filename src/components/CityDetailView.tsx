import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Film, Clock, ExternalLink, Ticket, ArrowLeft, Bookmark, Sparkles, AlertCircle, Share2, Check, Calendar } from 'lucide-react';
import { City, Cinema, Showtime, Movie } from '../types';
import { Language, translations, getMovieTitle } from '../utils/i18n';
import { safeFetchJson } from '../utils/api';
import { formatTodayFull } from '../utils/date';

interface CityDetailViewProps {
  city: City;
  lang: Language;
  onBack: () => void;
  onSelectMovie: (movie: Movie) => void;
  onSelectCity: (city: City) => void;
  onToggleFavorite: (cinemaId: string) => void;
  favoriteIds: string[];
}

export const CityDetailView: React.FC<CityDetailViewProps> = ({
  city,
  lang,
  onBack,
  onSelectMovie,
  onSelectCity,
  onToggleFavorite,
  favoriteIds
}) => {
  const t = translations[lang];
  const [data, setData] = useState<{
    cinemas: Cinema[];
    has_local_cinemas: boolean;
    nearest_cinemas: (Cinema & { distance_km: number })[];
  } | null>(null);
  const [cityShowtimes, setCityShowtimes] = useState<Showtime[]>([]);
  const [moviesList, setMoviesList] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [onlyVose, setOnlyVose] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCinemaId, setCopiedCinemaId] = useState<string | null>(null);

  const handleShareCity = async () => {
    const shareUrl = `${window.location.origin}/citta/${city.slug}`;
    const shareTitle = lang === 'it' 
      ? `Cinema a ${city.name} (${city.province_code}) — CineVicino`
      : `Cinemas in ${city.name} (${city.province_code}) — CineVicino`;
    const shareText = lang === 'it'
      ? `Programmazione sale e orari film a ${city.name} su CineVicino`
      : `Movie showtimes and theater schedules for ${city.name} on CineVicino`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareCinema = async (c: Cinema) => {
    const slug = c.slug || c.id.replace(/^cin-/, '');
    const shareUrl = `${window.location.origin}/cinema/${slug}`;
    const shareTitle = lang === 'it'
      ? `${c.name} (${city.name}) — CineVicino`
      : `${c.name} (${city.name}) — CineVicino`;
    const shareText = lang === 'it'
      ? `Programmazione e orari film per ${c.name} su CineVicino`
      : `Showtimes and film schedule for ${c.name} on CineVicino`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopiedCinemaId(c.id);
    setTimeout(() => setCopiedCinemaId(null), 2000);
  };

  useEffect(() => {
    async function loadCityData() {
      try {
        setLoading(true);
        const [cityParsed, stParsed, movParsed] = await Promise.all([
          safeFetchJson<any>(`/api/cities/${city.slug}`),
          safeFetchJson<Showtime[]>(`/api/showtimes?city_slug=${city.slug}`),
          safeFetchJson<Movie[]>('/api/movies')
        ]);

        if (cityParsed.ok && cityParsed.data) {
          setData(cityParsed.data);
        }
        if (stParsed.ok && Array.isArray(stParsed.data)) {
          setCityShowtimes(stParsed.data);
        }
        if (movParsed.ok && Array.isArray(movParsed.data)) {
          setMoviesList(movParsed.data);
        }
      } catch (err) {
        console.error('Failed to load city detail', err);
      } finally {
        setLoading(false);
      }
    }

    loadCityData();
  }, [city.slug]);

  const activeCinemas = data?.has_local_cinemas ? data.cinemas : [];

  // Filtered showtimes
  const filteredShowtimes = cityShowtimes.filter(s => {
    if (selectedFormat !== 'all' && s.format !== selectedFormat) return false;
    if (onlyVose && s.language !== 'VOSE' && s.language !== 'OV' && s.language !== 'EN') return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fadeIn">
      
      {/* Back to Home & Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{lang === 'it' ? 'Torna alla ricerca' : 'Back to search'}</span>
        </button>
        <span className="text-neutral-700">/</span>
        <span className="text-xs text-neutral-400 font-medium">
          {city.region}
        </span>
        <span className="text-neutral-700">/</span>
        <span className="text-xs text-neutral-400 font-medium">
          {lang === 'it' ? `Provincia di ${city.province}` : `Province of ${city.province}`} ({city.province_code})
        </span>
      </div>

      {/* City Hero Banner */}
      <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#0a0a0a] border border-white/10 backdrop-blur-md mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-bold border border-[#D4AF37]/30">
              {lang === 'it' ? "Comune d'Italia (ISTAT)" : "Italian Municipality (ISTAT)"}
            </span>
            <span className="px-3 py-0.5 rounded-full bg-white/5 text-neutral-300 text-xs font-medium border border-white/10 flex items-center gap-1.5 capitalize">
              <Calendar className="w-3 h-3 text-[#D4AF37]" />
              {formatTodayFull(lang)}
            </span>
            {city.is_provincial_capital && (
              <span className="px-3 py-0.5 rounded-full bg-white/10 text-neutral-300 text-xs font-semibold">
                {lang === 'it' ? 'Capoluogo di Provincia' : 'Provincial Capital'}
              </span>
            )}
            <span className="text-xs font-mono text-neutral-500">
              {city.lat.toFixed(3)}° N, {city.lng.toFixed(3)}° E
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-bold text-white tracking-tight">
            {lang === 'it' ? 'Cinema a ' : 'Cinemas in '}<span className="italic text-[#D4AF37]">{city.name}</span>
          </h1>
          <p className="text-xs sm:text-base text-neutral-400 mt-2 leading-relaxed">
            {lang === 'it'
              ? `Programmazione, orari e biglietti ufficiali per le sale di ${city.name} (${city.province_code}) e dintorni.`
              : `Showtimes, schedule and official tickets for movie theaters in and around ${city.name} (${city.province_code}).`}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleShareCity}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer active:scale-95"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">{lang === 'it' ? 'Link copiato!' : 'Link copied!'}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{lang === 'it' ? 'Condividi pagina comune' : 'Share city page'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-around sm:justify-center gap-4 bg-white/[0.03] p-3.5 sm:p-4 rounded-2xl border border-white/10 text-center w-full md:w-auto">
          <div>
            <span className="text-2xl sm:text-3xl font-black text-[#D4AF37] font-mono">
              {activeCinemas.length}
            </span>
            <span className="block text-[10px] sm:text-[11px] uppercase tracking-wider text-neutral-400 font-semibold mt-0.5">
              {data?.has_local_cinemas 
                ? (lang === 'it' ? 'Sale nel comune' : 'Cinemas in town') 
                : (lang === 'it' ? 'Sale in comune' : 'Cinemas in town')}
            </span>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div>
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {data?.has_local_cinemas ? filteredShowtimes.length : (data?.nearest_cinemas?.length || 0)}
            </span>
            <span className="block text-[10px] sm:text-[11px] uppercase tracking-wider text-neutral-400 font-semibold mt-0.5">
              {data?.has_local_cinemas 
                ? (lang === 'it' ? 'Spettacoli oggi' : 'Screenings today') 
                : (lang === 'it' ? 'Cinema nei dintorni' : 'Nearby cinemas')}
            </span>
          </div>
        </div>
      </div>

      {/* Case 1: Comune HAS Cinemas */}
      {data?.has_local_cinemas ? (
        <div className="space-y-8">
          
          {/* Quick Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#0a0a0a] border border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-neutral-400">{lang === 'it' ? 'Filtra formato:' : 'Filter format:'}</span>
              {['all', '2D', '3D', 'IMAX', 'Atmos'].map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setSelectedFormat(fmt)}
                  className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedFormat === fmt
                      ? 'bg-[#D4AF37] text-black font-bold'
                      : 'bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {fmt === 'all' ? (lang === 'it' ? 'Tutti i formati' : 'All formats') : fmt}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyVose}
                onChange={e => setOnlyVose(e.target.checked)}
                className="w-4 h-4 rounded text-[#D4AF37] focus:ring-[#D4AF37] bg-white/5 border-white/20 accent-[#D4AF37]"
              />
              <span>{lang === 'it' ? 'Solo lingua originale (VOSE / VO)' : 'Original language only (VOSE / OV)'}</span>
            </label>
          </div>

          {/* List of Cinemas in Comune */}
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-[#D4AF37]" />
              <span>{lang === 'it' ? `Sale cinematografiche attive a ${city.name}` : `Active movie theaters in ${city.name}`}</span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeCinemas.map(cinema => {
                const cinemaSt = filteredShowtimes.filter(s => s.cinema_id === cinema.id);
                const isFav = favoriteIds.includes(cinema.id);

                return (
                  <div
                    key={cinema.id}
                    className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-serif font-bold text-white">
                              {cinema.name}
                            </h3>
                            {cinema.chain && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                                {cinema.chain}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                            <span>{cinema.address}</span>
                          </p>
                        </div>

                        <button
                          onClick={() => onToggleFavorite(cinema.id)}
                          className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border transition-all active:scale-95 cursor-pointer ${
                            isFav ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
                          }`}
                          title={isFav ? t.removeFromFavorites : t.addToFavorites}
                        >
                          <Bookmark className={`w-4 h-4 ${isFav ? 'fill-black' : ''}`} />
                        </button>
                      </div>

                      {/* Features */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {cinema.features.map(f => (
                          <span key={f} className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-neutral-400 font-mono">
                            {f}
                          </span>
                        ))}
                      </div>

                      {/* Today's Showtimes */}
                      <div className="mt-6 pt-4 border-t border-white/10">
                        <span className="text-xs font-semibold text-neutral-300 block mb-3">
                          {t.todayProgramming}
                        </span>

                        {cinemaSt.length === 0 ? (
                          <p className="text-xs text-neutral-500 italic">
                            {t.noFilterMatch}
                          </p>
                        ) : (
                          <div className="space-y-2.5">
                            {cinemaSt.map(st => {
                              const movie = moviesList.find(m => m.id === st.movie_id);
                              const displayedMovieTitle = movie ? getMovieTitle(movie, lang) : (st.movie_title || '');
                              return (
                                <div key={st.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/40 border border-white/10">
                                  <div 
                                    onClick={() => movie && onSelectMovie(movie)}
                                    className="cursor-pointer group flex items-center gap-2.5 overflow-hidden flex-1 min-w-0"
                                  >
                                    <span className="text-xs font-bold text-white group-hover:text-[#D4AF37] truncate">
                                      {displayedMovieTitle}
                                    </span>
                                    <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                                      {st.format}
                                    </span>
                                  </div>

                                  <a
                                    href={st.ticket_url || cinema.website_url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => fetch(`/api/showtimes/${st.id}/click`, { method: 'POST' }).catch(() => {})}
                                    title={st.ticket_url 
                                      ? (lang === 'it' ? "Acquista biglietto ufficiale" : "Buy official ticket") 
                                      : (lang === 'it' ? "Consulta programmazione sul sito del cinema" : "Check schedule on cinema website")}
                                    className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black border border-[#D4AF37]/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0"
                                  >
                                    <span>{st.time}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Official website outbound link & Cinema Share */}
                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                      <a
                        href={cinema.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] uppercase tracking-widest text-[#D4AF37] hover:text-white border-b border-[#D4AF37]/30 hover:border-white pb-0.5 transition-colors flex items-center gap-1.5"
                      >
                        <span>{t.officialWebsite}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => handleShareCinema(cinema)}
                        className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-white transition-colors cursor-pointer py-1 px-2 rounded-md hover:bg-white/5"
                        title={lang === 'it' ? "Condividi cinema" : "Share cinema"}
                      >
                        {copiedCinemaId === cinema.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">{lang === 'it' ? 'Copiato!' : 'Copied!'}</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3 h-3 text-[#D4AF37]" />
                            <span>{lang === 'it' ? 'Condividi' : 'Share'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Case 2: Comune HAS NO Cinemas — calculate and show nearest */
        <div className="space-y-8">
          
          <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 text-center max-w-2xl mx-auto shadow-xl">
            <div className="w-14 h-14 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
              {lang === 'it' ? `Nessun cinema attualmente a ${city.name}` : `No cinemas currently in ${city.name}`}
            </h2>
            <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
              {lang === 'it'
                ? `Il comune di ${city.name} (${city.province_code}) non ha sale cinematografiche registrate nel catalogo ISTAT attivo. Abbiamo calcolato per te i cinema più vicini:`
                : `The municipality of ${city.name} (${city.province_code}) has no registered active movie theaters in the official catalog. Here are the closest cinemas calculated for you:`}
            </p>
          </div>

          {/* Nearest Cinemas List */}
          <div className="space-y-4">
            <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
              <Navigation className="w-5 h-5 text-[#D4AF37]" />
              <span>
                {lang === 'it'
                  ? `Cinema più vicini a ${city.name} (ordinati per distanza stradale stimata)`
                  : `Cinemas closest to ${city.name} (ordered by estimated driving distance)`}
              </span>
            </h3>

            {(data?.nearest_cinemas && data.nearest_cinemas.length > 0) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.nearest_cinemas.map(nearest => (
                  <div 
                    key={nearest.id}
                    className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-black text-[#D4AF37] font-mono px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                            {nearest.distance_km.toFixed(1)} km {lang === 'it' ? `da ${city.name}` : `from ${city.name}`}
                          </span>
                          <h4 className="text-base font-serif font-bold text-white mt-2.5">
                            {nearest.name}
                          </h4>
                        </div>
                        {nearest.chain && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                            {nearest.chain}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-400 mt-2 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                        <span>{nearest.address}</span>
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                      <a
                        href={nearest.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-full bg-[#D4AF37] hover:bg-white text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <span>{lang === 'it' ? 'Vedi programmazione' : 'View showtimes'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 text-center">
                <p className="text-sm text-neutral-400">
                  {lang === 'it'
                    ? 'Nessun cinema con programmazione attiva disponibile nelle vicinanze al momento.'
                    : 'No cinemas with active showtimes currently available nearby.'}
                </p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
