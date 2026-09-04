export type CinemaChain = 'UCI' | 'The Space Cinema' | 'Notorious' | 'Arcadia' | 'Anteo' | 'independent';

export type TicketSource = 'chain site' | '18tickets' | 'vivaticket' | 'ticketone' | 'liveticket' | 'other';

export type MovieFormat = '2D' | '3D' | 'IMAX' | 'ISense' | 'Atmos' | '4DX' | 'ScreenX';

export type MovieLanguage = 'IT' | 'VOSE' | 'OV' | 'EN';

export interface City {
  id: string;
  slug: string;
  name: string;
  region: string;
  province: string;
  province_code: string;
  is_provincial_capital: boolean;
  cadastral_code?: string;
  lat: number;
  lng: number;
  cinema_count?: number;
}

export interface Cinema {
  id: string;
  slug?: string;
  city_id: string;
  name: string;
  chain: CinemaChain | null;
  address: string;
  lat: number;
  lng: number;
  website_url: string;
  phone?: string;
  features?: string[]; // e.g. ['IMAX', 'Dolby Atmos', 'VIP Seats', 'Parcheggio']
  city_name?: string;
  city_slug?: string;
}

export interface Movie {
  id: string;
  slug: string;
  title_it: string;
  title_en: string;
  title_original: string;
  tmdb_id?: number | null;
  poster_url: string;
  backdrop_url: string;
  genres: string[];
  duration_minutes: number;
  rating: number; // e.g. 8.4
  synopsis_it: string;
  synopsis_en: string;
  release_year: number;
  director: string;
  cast: string[];
  age_rating?: string; // e.g. 'T', 'VM14', 'VM18'
  is_featured?: boolean;
}

export interface Showtime {
  id: string;
  movie_id: string;
  cinema_id: string;
  show_date: string; // YYYY-MM-DD
  time: string; // HH:MM
  format: MovieFormat;
  language: MovieLanguage;
  ticket_url: string;
  ticket_source: TicketSource;
  active: boolean;
  scraped_at: string;
  // Hydrated fields for UI
  movie_title?: string;
  movie_poster?: string;
  cinema_name?: string;
  cinema_chain?: CinemaChain | null;
  cinema_address?: string;
  city_name?: string;
  city_slug?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  item_type: 'cinema' | 'movie';
  item_id: string;
  created_at: string;
}

export interface AlertSubscription {
  id: string;
  email: string;
  city_id: string;
  city_name?: string;
  active: boolean;
  created_at: string;
}

export interface ScrapeLog {
  id: string;
  run_at: string;
  source: string;
  cities_touched: number;
  cinemas_touched: number;
  movies_touched: number;
  showtimes_touched: number;
  firecrawl_credits_used: number;
  status: 'success' | 'warning' | 'error';
  details: string;
}

export interface SiteSettings {
  homepage_headline_it: string;
  homepage_headline_en: string;
  homepage_subtext_it: string;
  homepage_subtext_en: string;
  featured_movie_ids: string[];
  footer_text_it: string;
  footer_text_en: string;
  privacy_policy_it: string;
  privacy_policy_en: string;
  firecrawl_monthly_limit: number;
  firecrawl_credits_used: number;
}
