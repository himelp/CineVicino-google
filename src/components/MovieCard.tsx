import React from 'react';
import { Star, Clock, Calendar, Bookmark, Play, ChevronRight, Sparkles } from 'lucide-react';
import { Movie } from '../types';
import { Language, translations } from '../utils/i18n';

interface MovieCardProps {
  movie: Movie;
  lang: Language;
  onSelect: (movie: Movie) => void;
  isFavorite: boolean;
  onToggleFavorite: (movieId: string) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  lang,
  onSelect,
  isFavorite,
  onToggleFavorite
}) => {
  const t = translations[lang];
  const title = lang === 'en' ? movie.title_en : movie.title_it;
  const synopsis = lang === 'en' ? movie.synopsis_en : movie.synopsis_it;

  const hours = Math.floor(movie.duration_minutes / 60);
  const minutes = movie.duration_minutes % 60;
  const durationFormatted = `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;

  return (
    <div className="group relative bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl border border-white/10 hover:border-white/20 overflow-hidden transition-all duration-300 flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1">
      
      {/* Poster Image Area */}
      <div 
        onClick={() => onSelect(movie)}
        className="relative aspect-[2/3] w-full overflow-hidden bg-black cursor-pointer"
      >
        <img
          src={movie.poster_url}
          alt={title}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/30 opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Rating badge */}
        {movie.rating > 0 && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-md">
            <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
            <span className="text-xs font-bold text-white font-mono">{movie.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Age Rating pill */}
        {movie.age_rating && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-bold text-neutral-300">
            {movie.age_rating}
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(movie.id);
          }}
          title={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
          className={`absolute bottom-3 right-3 p-2 rounded-full backdrop-blur-md border transition-all ${
            isFavorite
              ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
              : 'bg-black/60 text-white border-white/20 hover:bg-white/20'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? 'fill-black' : ''}`} />
        </button>
      </div>

      {/* Movie Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Genre and Duration */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs text-[#D4AF37] font-medium line-clamp-1">
              {movie.genres.slice(0, 2).join(', ')}
            </p>
            <span className="text-[10px] text-neutral-400 flex items-center gap-1 font-mono shrink-0">
              <Clock className="w-3 h-3 text-neutral-500" /> {durationFormatted}
            </span>
          </div>

          {/* Title in Editorial Serif */}
          <h3 
            onClick={() => onSelect(movie)}
            className="font-serif text-lg font-bold text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1 cursor-pointer"
          >
            {title}
          </h3>

          {/* Original Title (if different) */}
          {movie.title_original && movie.title_original !== title && (
            <p className="text-[11px] text-neutral-400 italic line-clamp-1 mt-0.5">
              {movie.title_original}
            </p>
          )}

          {/* Director */}
          <p className="text-xs text-neutral-400 mt-1 line-clamp-1">
            <span className="text-neutral-400">{t.director}:</span> {movie.director}
          </p>

          {/* Short Synopsis */}
          <p className="text-xs text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
            {synopsis}
          </p>
        </div>

        {/* View showtimes action with elegant underline */}
        <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={() => onSelect(movie)}
            className="text-[10px] uppercase tracking-widest text-white border-b border-white/30 hover:border-white w-fit pb-0.5 transition-colors cursor-pointer"
          >
            Programmazione & Orari
          </button>
          <button
            onClick={() => onSelect(movie)}
            className="text-xs font-bold text-[#D4AF37] hover:text-white flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
