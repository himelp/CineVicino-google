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
    <div className="group relative bg-neutral-900/70 hover:bg-neutral-900 rounded-2xl border border-neutral-800 hover:border-neutral-700 overflow-hidden transition-all duration-300 flex flex-col shadow-lg hover:shadow-2xl hover:-translate-y-1">
      
      {/* Poster Image Area */}
      <div 
        onClick={() => onSelect(movie)}
        className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-950 cursor-pointer"
      >
        <img
          src={movie.poster_url}
          alt={title}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-black/20 opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Rating badge */}
        {movie.rating > 0 && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-neutral-950/80 backdrop-blur-md border border-neutral-800 flex items-center gap-1.5 shadow-md">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-white font-mono">{movie.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Age Rating pill */}
        {movie.age_rating && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-neutral-900/90 border border-neutral-700 text-[11px] font-bold text-neutral-300">
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
              ? 'bg-amber-500 text-neutral-950 border-amber-400'
              : 'bg-neutral-950/60 text-white border-neutral-700/60 hover:bg-neutral-900'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-neutral-950' : ''}`} />
        </button>
      </div>

      {/* Movie Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Genre chips */}
          <div className="flex flex-wrap gap-1 mb-2">
            {movie.genres.slice(0, 2).map((g) => (
              <span 
                key={g} 
                className="text-[10px] font-medium text-amber-400/90 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20"
              >
                {g}
              </span>
            ))}
            <span className="text-[10px] text-neutral-400 flex items-center gap-1 ml-auto font-mono">
              <Clock className="w-3 h-3" /> {durationFormatted}
            </span>
          </div>

          {/* Title */}
          <h3 
            onClick={() => onSelect(movie)}
            className="font-bold text-white text-base sm:text-lg group-hover:text-amber-400 transition-colors line-clamp-1 cursor-pointer"
          >
            {title}
          </h3>

          {/* Original Title (if different) */}
          {movie.title_original && movie.title_original !== title && (
            <p className="text-xs text-neutral-400 italic line-clamp-1 mb-1">
              O.T.: {movie.title_original}
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

        {/* View showtimes action */}
        <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
          <span className="text-xs text-neutral-400 font-medium">
            Programmazione attiva
          </span>
          <button
            onClick={() => onSelect(movie)}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
          >
            <span>Orari</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
