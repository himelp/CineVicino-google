/**
 * CineVicino — Startup Environment Variable Validator
 */
import { logger } from './logger';

export function validateEnvironment() {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!process.env.DATABASE_URL) {
    warnings.push('DATABASE_URL is not configured. Falling back to embedded persistent PostgreSQL engine (PGlite at ./data/pgdata).');
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
    errors.push('CRITICAL SECURITY: JWT_SECRET environment variable is missing or shorter than 32 characters. Generate a secure random key (e.g. `openssl rand -hex 32`) and add it to your environment.');
  }

  if (process.env.ADMIN_PASSWORD === 'admin' || process.env.ADMIN_PASSWORD === 'password') {
    errors.push('CRITICAL SECURITY: ADMIN_PASSWORD cannot be "admin" or "password". Please set a strong password.');
  }

  if (!process.env.TMDB_API_KEY) {
    warnings.push('TMDB_API_KEY is not set. Live TMDb title searches will use verified fallback poster CDN.');
  }

  if (!process.env.SMTP_HOST) {
    warnings.push('SMTP_HOST is not configured. Outbound emails will be simulated and logged to the email_logs database table.');
  }

  if (warnings.length > 0) {
    for (const w of warnings) {
      logger.warn(`[ENV CHECK] ⚠️  ${w}`);
    }
  }

  if (errors.length > 0) {
    for (const e of errors) {
      logger.error(`[ENV CHECK] ❌ ${e}`);
    }
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }

  logger.info('[ENV CHECK] ✅ Startup environment variables validated.');
}
