import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { X, Star, Clock, Calendar, MapPin, ExternalLink, Ticket, Share2, Bookmark, Check, ShieldCheck, Film, Map } from 'lucide-react';
import { Movie, Showtime, City } from '../types';
import { Language, translations, getMovieTitle, getMovieSynopsis } from '../utils/i18n';
import { safeFetchJson } from '../utils/api';
import { getRomeToday, formatDatePill, formatTodayFull } from '../utils/date';

// Lazy-load Leaflet map component to prevent loading Leaflet JS/CSS unless user toggles Map view
const MovieCinemaMap = lazy(() => import('./MovieCinemaMap'));

interface CinemaGroup {
  cinema_name: string;
  chain: string | null;
  address: string;
  city_name: string;
  city_slug: string;
  slots: Showtime[];
}

interface MovieDetailModalProps {
  movie: Movie | null;
  lang: Language;
  onClose: () => void;
  activeCity: City | null;
  onSelectCity: (city: City) => void;
  isFavorite: boolean;
  onToggleFavorite: (movieId: string) => void;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  movie,
  lang,
  onClose,
  activeCity,
  onSelectCity,
  isFavorite,
  onToggleFavorite
}) => {
  const t = translations[lang];
  const todayStr = getRomeToday();
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>(activeCity?.slug || 'all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!movie) return;

    async function loadMovieShowtimes() {
      try {
        setLoading(true);
        const parsed = await safeFetchJson<any>(`/api/movies/${movie?.slug}`);
        if (parsed.ok && parsed.data?.showtimes) {
          setShowtimes(parsed.data.showtimes);
        }
      } catch (e) {
        console.error('Error fetching showtimes', e);
      } finally {
        setLoading(false);
      }
    }

    loadMovieShowtimes();
  }, [movie]);

  if (!movie) return null;

  const title = getMovieTitle(movie, lang);
  const { text: synopsis, isFallback } = getMovieSynopsis(movie, lang);

  // Part 1: Never show past dates — filter only active showtimes today or future
  const activeShowtimes = useMemo(() => {
    return showtimes.filter(s => s.active && s.show_date >= todayStr);
  }, [showtimes, todayStr]);

  // Distinct dates actually scraped for this movie (today or future)
  const scrapedDates = useMemo(() => {
    const datesSet = new Set<string>();
    activeShowtimes.forEach(s => {
      if (s.show_date && s.show_date >= todayStr) {
        datesSet.add(s.show_date);
      }
    });
    return Array.from(datesSet).sort();
  }, [activeShowtimes, todayStr]);

  // Date selector options — strictly don't show date options beyond what has been scraped, but always include today
  const dateOptions = useMemo(() => {
    const list = scrapedDates.includes(todayStr) ? [...scrapedDates] : [todayStr, ...scrapedDates];
    return list.map(dStr => formatDatePill(dStr, lang));
  }, [scrapedDates, todayStr, lang]);

  // Ensure selectedDate is valid and never in the past
  useEffect(() => {
    if (selectedDate < todayStr) {
      setSelectedDate(todayStr);
    }
  }, [selectedDate, todayStr]);

  // Filter showtimes for selected date and city
  const filteredShowtimes = activeShowtimes.filter(s => {
    const matchesDate = s.show_date === selectedDate;
    const matchesCity = selectedCityFilter === 'all' || s.city_slug === selectedCityFilter;
    return matchesDate && matchesCity;
  });

  // Group showtimes by cinema
  const cinemasMap = new Map<string, CinemaGroup>();

  filteredShowtimes.forEach(s => {
    const key = s.cinema_id;
    if (!cinemasMap.has(key)) {
      cinemasMap.set(key, {
        cinema_name: s.cinema_name || 'Cinema',
        chain: s.cinema_chain || null,
        address: s.cinema_address || '',
        city_name: s.city_name || '',
        city_slug: s.city_slug || '',
        slots: []
      });
    }
    cinemasMap.get(key)!.slots.push(s);
  });

  const cinemasList: CinemaGroup[] = Array.from(cinemasMap.values());

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/film/${movie.slug}`;
    const shareTitle = `${title} — CineVicino`;
    const shareText = `Programmazione e biglietti ufficiali per ${title} su CineVicino`;
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

  // Ticket Source Formatter
  const getTicketSourceLabel = (source: Showtime['ticket_source']) => {
    switch (source) {
      case '18tickets':
        return '18Tickets.it';
      case 'vivaticket':
        return 'Vivaticket.it';
      case 'liveticket':
        return 'Liveticket.it';
      case 'ticketone':
        return 'TicketOne.it';
      default:
        return 'Canale Ufficiale';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md overflow-y-auto animate-fadeIn min-h-[100dvh]">
      <div 
        className="relative w-full max-w-4xl bg-[#0a0a0a] border-0 sm:border border-white/10 rounded-none sm:rounded-3xl overflow-hidden shadow-2xl my-0 sm:my-auto text-neutral-200 min-h-[100dvh] sm:min-h-0 flex flex-col pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/70 hover:bg-white text-neutral-200 hover:text-black border border-white/20 transition-all cursor-pointer active:scale-95 shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Backdrop */}
        <div className="relative h-56 sm:h-80 w-full overflow-hidden bg-black shrink-0">
          <img
            src={movie.backdrop_url || movie.poster_url}
            alt={title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />

          {/* Floating Movie Header Info */}
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex items-end gap-4 sm:gap-6">
            <img
              src={movie.poster_url}
              alt={title}
              referrerPolicy="no-referrer"
              className="w-20 sm:w-32 aspect-[2/3] object-cover rounded-xl border border-white/10 shadow-2xl hidden xs:block"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] sm:text-xs font-bold font-mono">
                  {movie.release_year}
                </span>
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-white/10 text-neutral-300 text-[10px] sm:text-xs font-medium font-mono">
                  {movie.duration_minutes} min
                </span>
                {movie.rating > 0 && (
                  <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-white/10 text-[#D4AF37] text-[10px] sm:text-xs font-bold flex items-center gap-1 font-mono" title="Valutazione TMDb">
                    <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-[#D4AF37]" /> {movie.rating.toFixed(1)}
                  </span>
                )}
                {/* Letterboxd Rating Badge — ONLY rendered if real rating is present */}
                {movie.letterboxd_rating != null && Number(movie.letterboxd_rating) > 0 && (
                  <span
                    className="px-2 sm:px-2.5 py-0.5 rounded-full bg-[#00e054]/15 text-[#00e054] border border-[#00e054]/30 text-[10px] sm:text-xs font-bold flex items-center gap-1 font-mono"
                    title={`Letterboxd: ${Number(movie.letterboxd_rating).toFixed(1)}/5${movie.letterboxd_rating_count ? ` (${Number(movie.letterboxd_rating_count).toLocaleString('it-IT')} voti)` : ''}`}
                  >
                    <span className="text-[9px] font-black tracking-tighter">LB</span>
                    <span className="text-[11px] leading-none">★</span>
                    <span>{Number(movie.letterboxd_rating).toFixed(1)}</span>
                  </span>
                )}
                {/* Rotten Tomatoes Score Badge — ONLY rendered if real score is present */}
                {movie.rotten_tomatoes_score != null && Number(movie.rotten_tomatoes_score) >= 0 && (
                  <span
                    className="px-2 sm:px-2.5 py-0.5 rounded-full bg-[#fa320a]/15 text-[#ff4f38] border border-[#fa320a]/30 text-[10px] sm:text-xs font-bold flex items-center gap-1 font-mono"
                    title={`Rotten Tomatoes Tomatometer: ${Number(movie.rotten_tomatoes_score)}%`}
                  >
                    <span className="text-[12px] leading-none" role="img" aria-label="Rotten Tomatoes">🍅</span>
                    <span>{Number(movie.rotten_tomatoes_score)}%</span>
                  </span>
                )}
                {movie.age_rating && (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] sm:text-xs font-mono text-neutral-300">
                    {movie.age_rating}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-3xl lg:text-4xl font-serif font-bold text-white tracking-tight leading-tight line-clamp-2">
                {title}
              </h2>

              {movie.title_original && movie.title_original !== title && (
                <p className="text-xs sm:text-sm text-neutral-400 italic mt-0.5 line-clamp-1">
                  {movie.title_original}
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onToggleFavorite(movie.id)}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border transition-all active:scale-95 ${
                  isFavorite 
                    ? 'bg-[#D4AF37] text-black border-[#D4AF37]' 
                    : 'bg-black/60 text-neutral-300 border-white/20 hover:bg-white/10'
                }`}
                title={isFavorite ? 'Rimuovi dai preferiti' : 'Salva nei preferiti'}
              >
                <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-black' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/60 hover:bg-white/10 text-neutral-300 border border-white/20 transition-all active:scale-95"
                title="Condividi film"
              >
                {copiedLink ? <Check className="w-4 h-4 text-[#D4AF37]" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1">
          
          {/* Metadata & Synopsis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-white/10">
            <div className="md:col-span-2 space-y-4">
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#D4AF37] flex items-center gap-2">
                <span>{t.synopsis}</span>
                {isFallback && lang === 'en' && (
                  <span className="text-[10px] lowercase italic font-normal text-amber-400/80 tracking-normal">
                    — {t.originalSynopsisNote}
                  </span>
                )}
              </h4>
              <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
                {synopsis}
              </p>

              {/* Genres */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {movie.genres.map(g => (
                  <span key={g} className="px-3 py-1 rounded-full bg-white/5 text-neutral-300 text-xs font-medium border border-white/10">
                    {g}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4 bg-white/[0.03] p-4 rounded-2xl border border-white/10 text-xs">
              <div>
                <span className="text-neutral-400 block mb-0.5">{t.director}</span>
                <span className="font-semibold text-white text-sm">{movie.director}</span>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5">{t.cast}</span>
                <span className="text-neutral-300">{movie.cast.join(', ')}</span>
              </div>
              {movie.tmdb_id && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>ID TMDb: #{movie.tmdb_id}</span>
                  <span className="text-[#D4AF37] font-mono">Dati ufficiali</span>
                </div>
              )}
              {/* External ratings breakdown */}
              {(movie.letterboxd_rating != null || movie.rotten_tomatoes_score != null) && (
                <div className="pt-2 border-t border-white/10 space-y-1.5 text-[11px]">
                  <span className="text-neutral-400 block font-medium uppercase tracking-wider text-[9px]">Valutazioni critiche e pubblico</span>
                  <div className="space-y-1 text-neutral-300">
                    {movie.letterboxd_rating != null && Number(movie.letterboxd_rating) > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-neutral-400">
                          <span className="text-[#00e054] font-bold">Letterboxd</span>
                          {movie.letterboxd_rating_count ? (
                            <span className="text-[10px] text-neutral-500">({Number(movie.letterboxd_rating_count).toLocaleString('it-IT')} voti)</span>
                          ) : null}
                        </span>
                        <span className="text-[#00e054] font-mono font-bold">
                          ★ {Number(movie.letterboxd_rating).toFixed(1)} / 5
                        </span>
                      </div>
                    )}
                    {movie.rotten_tomatoes_score != null && Number(movie.rotten_tomatoes_score) >= 0 && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-neutral-400">
                          <span className="text-[#ff4f38] font-bold">Rotten Tomatoes</span>
                          <span className="text-[10px] text-neutral-500">Tomatometer</span>
                        </span>
                        <span className="text-[#ff4f38] font-mono font-bold">
                          🍅 {Number(movie.rotten_tomatoes_score)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Showtimes & Booking Section */}
          <div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-[#D4AF37]" />
                  <span>Programmazione e Biglietti Ufficiali</span>
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mt-1">
                  <span className="text-[#D4AF37] font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="capitalize">{formatTodayFull(lang)}</span>
                  </span>
                  <span className="text-neutral-600 hidden sm:inline">·</span>
                  <span className="hidden sm:inline">
                    {lang === 'it' 
                      ? "Seleziona l'orario desiderato per l'acquisto diretto dal circuito ufficiale."
                      : "Select your screening to purchase tickets directly from the official cinema box office."}
                  </span>
                </div>
              </div>

              {/* Right Controls: List / Map Toggle + Date Selector Pills */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 self-start lg:self-auto max-w-full">
                {/* List / Map View Toggle */}
                <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10 shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setViewMode('list')}
                    aria-label={lang === 'it' ? 'Visualizza come elenco' : 'View as list'}
                    className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-[#D4AF37] text-black shadow-sm font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>{lang === 'it' ? 'Lista' : 'List'}</span>
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    aria-label={lang === 'it' ? 'Visualizza sulla mappa' : 'View on map'}
                    className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      viewMode === 'map'
                        ? 'bg-[#D4AF37] text-black shadow-sm font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>{lang === 'it' ? 'Mappa' : 'Map'}</span>
                  </button>
                </div>

                {/* Date Selector Pills — scrollable row of dates scraped for today/future */}
                <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 no-scrollbar">
                  {dateOptions.map(d => {
                    const isSelected = selectedDate === d.dateStr;
                    return (
                      <button
                        key={d.dateStr}
                        onClick={() => setSelectedDate(d.dateStr)}
                        aria-label={d.fullAccessibleLabel}
                        className={`min-h-[44px] px-4 py-1.5 rounded-2xl text-xs transition-all whitespace-nowrap flex flex-col items-center justify-center cursor-pointer border active:scale-95 ${
                          isSelected
                            ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37] shadow-md scale-[1.02]'
                            : 'bg-white/5 text-neutral-300 border-white/10 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        <span className="font-semibold tracking-tight">{d.mainLabel}</span>
                        {d.subLabel && (
                          <span className={`text-[10px] ${isSelected ? 'text-black/80 font-medium' : 'text-neutral-400'}`}>
                            {d.subLabel}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* City Filter Pills for showtimes */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 text-xs no-scrollbar">
              <span className="text-neutral-400 whitespace-nowrap font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" /> Città:
              </span>
              <button
                onClick={() => setSelectedCityFilter('all')}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-full whitespace-nowrap border transition-all active:scale-95 cursor-pointer ${
                  selectedCityFilter === 'all'
                    ? 'bg-white text-black border-white font-bold'
                    : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                }`}
              >
                Tutte le città ({cinemasList.length} cinema)
              </button>
              {['roma', 'milano', 'napoli', 'torino', 'firenze', 'bologna', 'bari', 'catania', 'cagliari'].map(cSlug => (
                <button
                  key={cSlug}
                  onClick={() => setSelectedCityFilter(cSlug)}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-full whitespace-nowrap capitalize border transition-all active:scale-95 cursor-pointer ${
                    selectedCityFilter === cSlug
                      ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-bold'
                      : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {cSlug}
                </button>
              ))}
            </div>

            {/* Cinemas & Showtimes: Map View or List View */}
            {loading ? (
              <div className="py-12 text-center text-neutral-500 text-sm">
                Caricamento orari dai multiplex e sale d'autore...
              </div>
            ) : viewMode === 'map' ? (
              <Suspense
                fallback={
                  <div className="h-[480px] w-full rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center gap-3 text-neutral-400 animate-pulse">
                    <MapPin className="w-8 h-8 text-[#D4AF37] animate-bounce" />
                    <span className="text-xs font-medium">Caricamento mappa Leaflet dei cinema vicini...</span>
                  </div>
                }
              >
                <MovieCinemaMap
                  showtimes={filteredShowtimes}
                  lang={lang}
                  userLocation={activeCity ? { lat: activeCity.lat, lng: activeCity.lng } : null}
                  onResetCityFilter={() => setSelectedCityFilter('all')}
                  selectedCityFilter={selectedCityFilter}
                  selectedDateLabel={formatDatePill(selectedDate, lang).mainLabel}
                />
              </Suspense>
            ) : cinemasList.length === 0 ? (
              <div className="py-12 text-center bg-white/[0.03] rounded-3xl border border-white/10 p-8 max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3.5 text-neutral-400">
                  <Calendar className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h4 className="text-white font-serif font-bold text-base">
                  {lang === 'it'
                    ? 'Nessuno spettacolo trovato per questa data'
                    : 'No showtimes found for this date'}
                </h4>
                <p className="text-neutral-400 text-xs mt-2 leading-relaxed">
                  {activeShowtimes.length === 0
                    ? (lang === 'it'
                        ? 'Nessun orario di programmazione attivo rilevato per questo film al momento.'
                        : 'No active showtimes currently available for this title.')
                    : selectedCityFilter !== 'all'
                    ? (lang === 'it'
                        ? `Non ci sono proiezioni programmate a ${selectedCityFilter.toUpperCase()} per la data selezionata (${formatDatePill(selectedDate, lang).mainLabel}). Prova a visualizzare tutte le città o a scegliere un'altra data.`
                        : `No screenings scheduled in ${selectedCityFilter.toUpperCase()} for the selected date (${formatDatePill(selectedDate, lang).mainLabel}). Try viewing all cities or selecting another date.`)
                    : (lang === 'it'
                        ? `Nessuna sala censita trasmette questo film per la data ${formatDatePill(selectedDate, lang).mainLabel}. Prova a selezionare un'altra data disponibile.`
                        : `No registered cinemas are screening this film on ${formatDatePill(selectedDate, lang).mainLabel}. Try selecting another available date.`)}
                </p>
                {selectedCityFilter !== 'all' && activeShowtimes.length > 0 && (
                  <button
                    onClick={() => setSelectedCityFilter('all')}
                    className="mt-5 px-5 py-2.5 rounded-full bg-[#D4AF37] hover:bg-white text-black text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                  >
                    {lang === 'it' ? 'Mostra orari in tutta Italia' : 'Show all cities'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {cinemasList.map((cinema, idx) => (
                  <div 
                    key={idx}
                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-white text-base">
                          {cinema.cinema_name}
                        </span>
                        {cinema.chain && (
                          <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                            {cinema.chain}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                        <span>{cinema.address}</span>
                      </p>
                    </div>

                    {/* Showtimes slots with Outbound Ticket Target */}
                    <div className="flex flex-wrap items-center gap-2">
                      {cinema.slots.map(s => (
                        <a
                          key={s.id}
                          href={s.ticket_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => fetch(`/api/showtimes/${s.id}/click`, { method: 'POST' }).catch(() => {})}
                          title={s.ticket_url ? `Acquista su ${getTicketSourceLabel(s.ticket_source)} (Apre sito ufficiale)` : 'Acquista in cassa o consulta il sito del cinema'}
                          className="group/slot flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-[#D4AF37] border border-white/10 hover:border-[#D4AF37] transition-all shadow-sm active:scale-95"
                        >
                          <div className="text-left">
                            <span className="font-mono font-bold text-sm text-white group-hover/slot:text-black transition-colors">
                              {s.time}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-neutral-400 group-hover/slot:text-black/80 transition-colors">
                              <span className="font-semibold">{s.format}</span>
                              <span>·</span>
                              <span>{s.language}</span>
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover/slot:text-black transition-colors ml-1" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outbound Ticket Compliance Notice */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-neutral-400 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Garanzia di Reindirizzamento Ufficiale:</span>
              <p className="mt-0.5">
                CineVicino è una directory informativa e non effettua transazioni in-app. Ciascun pulsante di orario rimanda direttamente al portale di ticketing ufficiale autorizzato dal cinema (UCI, The Space Cinema, 18Tickets, Vivaticket, Liveticket).
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
