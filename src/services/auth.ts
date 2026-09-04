/**
 * CineVicino — Authentication & Authorization Service
 * Real PostgreSQL user store, bcrypt password hashing, signed JWT sessions, and admin guards.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { executeRawSql } from '../db/index';

const JWT_SECRET = process.env.JWT_SECRET || 'cinevicino_production_jwt_secret_2026_super_hardened';
const TOKEN_EXPIRY = '7d';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateSessionToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifySessionToken(token: string): { id: string; email: string; is_admin: boolean } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; is_admin: boolean };
  } catch {
    return null;
  }
}

export function generateResetToken(): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return { token, expiresAt };
}

export async function findUserByEmail(email: string) {
  const res = await executeRawSql(
    'SELECT id, email, name, password_hash, is_admin, reset_token, reset_token_expires_at, created_at FROM users WHERE LOWER(email) = LOWER($1)',
    [email.trim()]
  );
  return res.rows[0] || null;
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const res = await executeRawSql(
    'SELECT id, email, name, is_admin, created_at FROM users WHERE id = $1',
    [id]
  );
  return res.rows[0] || null;
}

/**
 * Express middleware to authenticate JWT token from Authorization header or cookie
 */
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.query?.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return next();
  }

  const payload = verifySessionToken(token);
  if (!payload || !payload.id) {
    return next();
  }

  try {
    const user = await findUserById(payload.id);
    if (user) {
      req.user = user;
    }
  } catch (err) {
    console.error('Error in authenticateToken lookup:', err);
  }

  next();
}

/**
 * Middleware: Requires a valid authenticated user. Returns 401 if missing.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Non autorizzato',
      message: 'È richiesta l\'autenticazione per accedere a questa risorsa.',
      code: 'UNAUTHORIZED'
    });
  }
  next();
}

/**
 * Middleware: Requires an admin user. Returns 401 if not logged in, 403 if not admin.
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Non autorizzato',
      message: 'Accesso riservato. Effettua il login come amministratore.',
      code: 'UNAUTHORIZED'
    });
  }

  if (!req.user.is_admin) {
    return res.status(403).json({
      error: 'Accesso negato',
      message: 'Questa azione richiede privilegi di amministratore.',
      code: 'FORBIDDEN'
    });
  }

  next();
}
