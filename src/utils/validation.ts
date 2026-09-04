/**
 * CineVicino — Input Validation Schemas with Zod
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Indirizzo email non valido'),
  password: z.string().min(6, 'La password deve contenere almeno 6 caratteri')
});

export const registerSchema = z.object({
  email: z.string().email('Indirizzo email non valido'),
  password: z.string().min(8, 'La password deve contenere almeno 8 caratteri'),
  name: z.string().min(2, 'Il nome deve contenere almeno 2 caratteri')
});

export const resetRequestSchema = z.object({
  email: z.string().email('Indirizzo email non valido')
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Token di reset non valido'),
  newPassword: z.string().min(8, 'La nuova password deve contenere almeno 8 caratteri')
});

export const alertSubscriptionSchema = z.object({
  email: z.string().email('Indirizzo email non valido'),
  city_id: z.string().min(1, 'ID del comune obbligatorio')
});

export const favoriteSchema = z.object({
  item_type: z.enum(['cinema', 'movie']),
  item_id: z.string().min(1, 'ID elemento obbligatorio')
});

export const movieUpdateSchema = z.object({
  id: z.string(),
  title_it: z.string().min(1),
  title_en: z.string().optional(),
  title_original: z.string().optional(),
  synopsis_it: z.string().optional(),
  rating: z.number().min(0).max(10).optional(),
  poster_url: z.string().url().optional(),
  backdrop_url: z.string().url().optional(),
  is_featured: z.boolean().optional()
});

export const cinemaUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  address: z.string().min(1),
  website_url: z.string().url().optional(),
  features: z.array(z.string()).optional()
});

export const toggleActiveSchema = z.object({
  showtime_id: z.string().min(1),
  active: z.boolean()
});
