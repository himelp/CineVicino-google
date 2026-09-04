import React, { useState, useEffect } from 'react';
import { X, Star, Clock, Calendar, MapPin, ExternalLink, Ticket, Share2, Bookmark, Check, ShieldCheck, Film } from 'lucide-react';
import { Movie, Showtime, City } from '../types';
import { Language, translations } from '../utils/i18n';

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
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>(activeCity?.slug || 'all');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!movie) return;

    async function loadMovieShowtimes() {
      try {
        setLoading(true);
        const res = await fetch(`/api/movies/${movie?.slug}`);
        if (res.ok) {
          const data = await res.json();
          setShowtimes(data.showtimes || []);
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

  const title = lang === 'en' ? movie.title_en : movie.title_it;
  const synopsis = lang === 'en' ? movie.synopsis_en : movie.synopsis_it;

  // Available dates
  const today = new Date();
  const dateOptions = [
    { label: t.todayShowtimes, value: today.toISOString().split('T')[0] },
    { label: t.tomorrow, value: new Date(today.getTime() + 86400000).toISOString().split('T')[0] },
    { label: t.weekend, value: new Date(today.getTime() + 172800000).toISOString().split('T')[0] }
  ];

  // Filter showtimes
  const filteredShowtimes = showtimes.filter(s => {
    const matchesDate = s.show_date === selectedDate;
    const matchesCity = selectedCityFilter === 'all' || s.city_slug === selectedCityFilter;
    return matchesDate && matchesCity;
  });

  // Group showtimes by cinema
  const cinemasMap = new Map<string, { cinema_name: string; chain: string | null; address: string; city_name: string; city_slug: string; slots: Showtime[] }>();

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

  const cinemasList = Array.from(cinemasMap.values());

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl my-auto text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/60 hover:bg-white text-neutral-300 hover:text-black border border-white/10 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Backdrop */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-black">
          <img
            src={movie.backdrop_url || movie.poster_url}
            alt={title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />

          {/* Floating Movie Header Info */}
          <div className="absolute bottom-6 left-6 right-6 flex items-end gap-6">
            <img
              src={movie.poster_url}
              alt={title}
              referrerPolicy="no-referrer"
              className="w-24 sm:w-32 aspect-[2/3] object-cover rounded-xl border border-white/10 shadow-2xl hidden sm:block"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-bold font-mono">
                  {movie.release_year}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-neutral-300 text-xs font-medium font-mono">
                  {movie.duration_minutes} min
                </span>
                {movie.rating > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[#D4AF37] text-xs font-bold flex items-center gap-1 font-mono">
                    <Star className="w-3.5 h-3.5 fill-[#D4AF37]" /> {movie.rating.toFixed(1)}
                  </span>
                )}
                {movie.age_rating && (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-xs font-mono text-neutral-300">
                    {movie.age_rating}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-tight">
                {title}
              </h2>

              {movie.title_original && movie.title_original !== title && (
                <p className="text-xs sm:text-sm text-neutral-400 italic mt-0.5">
                  Titolo originale: {movie.title_original}
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleFavorite(movie.id)}
                className={`p-2.5 rounded-full border transition-colors ${
                  isFavorite 
                    ? 'bg-[#D4AF37] text-black border-[#D4AF37]' 
                    : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                }`}
                title={isFavorite ? 'Rimuovi dai preferiti' : 'Salva nei preferiti'}
              >
                <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-black' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 transition-colors"
                title="Copia link"
              >
                {copiedLink ? <Check className="w-4 h-4 text-[#D4AF37]" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Metadata & Synopsis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-white/10">
            <div className="md:col-span-2 space-y-4">
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#D4AF37]">
                {t.synopsis}
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
            </div>
          </div>

          {/* Showtimes & Booking Section */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-[#D4AF37]" />
                  <span>Programmazione e Biglietti Ufficiali</span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Seleziona l'orario desiderato per essere reindirizzato direttamente alla cassa ufficiale del cinema.
                </p>
              </div>

              {/* Date Selector Tabs */}
              <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-full border border-white/10 self-start">
                {dateOptions.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setSelectedDate(d.value)}
                    className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all ${
                      selectedDate === d.value
                        ? 'bg-[#D4AF37] text-black font-bold shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* City Filter Pills for showtimes */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 text-xs no-scrollbar">
              <span className="text-neutral-400 whitespace-nowrap font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" /> Città:
              </span>
              <button
                onClick={() => setSelectedCityFilter('all')}
                className={`px-3.5 py-1 rounded-full whitespace-nowrap border transition-all ${
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
                  className={`px-3.5 py-1 rounded-full whitespace-nowrap capitalize border transition-all ${
                    selectedCityFilter === cSlug
                      ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-bold'
                      : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {cSlug}
                </button>
              ))}
            </div>

            {/* Cinemas & Showtimes List */}
            {loading ? (
              <div className="py-12 text-center text-neutral-500 text-sm">
                Caricamento orari dai multiplex e sale d'autore...
              </div>
            ) : cinemasList.length === 0 ? (
              <div className="py-12 text-center bg-white/[0.03] rounded-2xl border border-white/10 p-6">
                <p className="text-neutral-400 text-sm">
                  Nessun orario trovato per la combinazione selezionata in questa data.
                </p>
                <button
                  onClick={() => setSelectedCityFilter('all')}
                  className="mt-3 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                >
                  Mostra orari in tutta Italia
                </button>
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
                          href={s.ticket_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Acquista su ${getTicketSourceLabel(s.ticket_source)} (Apre sito ufficiale)`}
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
