/**
 * CineVicino — Email Notification Service
 * Configured via SMTP (Nodemailer), supports double opt-in confirmation, 1-click unsubscribe,
 * movie digest notifications, deduplication, and PostgreSQL audit logging.
 */
import nodemailer from 'nodemailer';
import { executeRawSql } from '../db/index';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'CineVicino <notifiche@cinevicino.it>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
    console.log(`📧 Configurato trasporto SMTP live verso ${SMTP_HOST}:${SMTP_PORT}`);
  }
  return transporter;
}

export async function logEmail(recipient: string, type: string, subject: string, status: string, details: string) {
  try {
    const id = `eml-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await executeRawSql(
      `INSERT INTO email_logs (id, recipient, type, subject, status, details, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [id, recipient, type, subject, status, details]
    );
  } catch (err: any) {
    console.error('Failed to write to email_logs:', err.message);
  }
}

/**
 * Send Double Opt-in Confirmation Email
 */
export async function sendConfirmationEmail(email: string, cityName: string, confirmToken: string, unsubscribeToken: string) {
  const confirmUrl = `${APP_URL}/api/alerts/confirm?token=${confirmToken}`;
  const unsubscribeUrl = `${APP_URL}/api/alerts/unsubscribe?token=${unsubscribeToken}`;
  const subject = `Conferma la tua iscrizione agli avvisi cinema per ${cityName} — CineVicino`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 24px; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f1f5f9;">
        <div style="max-width: 540px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; padding: 32px;">
          <div style="display: flex; align-items: center; margin-bottom: 24px;">
            <span style="font-size: 24px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px;">CineVicino</span>
          </div>
          <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0;">Conferma la tua iscrizione</h1>
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
            Hai richiesto di ricevere gli avvisi per le nuove uscite cinematografiche e gli orari nei cinema di <strong>${cityName}</strong>.
          </p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${confirmUrl}" style="background-color: #2563eb; color: #ffffff; font-weight: 600; padding: 12px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 15px;">
              Conferma iscrizione
            </a>
          </div>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            Se non hai richiesto tu questa iscrizione, puoi ignorare questa email oppure <a href="${unsubscribeUrl}" style="color: #94a3b8; text-decoration: underline;">disiscriverti subito</a>.
          </p>
          <div style="margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px; font-size: 12px; color: #475569; text-align: center;">
            CineVicino — Tutti i cinema d'Italia a portata di click.
          </div>
        </div>
      </body>
    </html>
  `;

  const mailer = getTransporter();
  if (mailer) {
    try {
      await mailer.sendMail({
        from: SMTP_FROM,
        to: email,
        subject,
        html
      });
      await logEmail(email, 'double_opt_in', subject, 'delivered', 'Email inviata via SMTP');
      return { success: true, simulated: false };
    } catch (err: any) {
      await logEmail(email, 'double_opt_in', subject, 'error', err.message);
      throw err;
    }
  } else {
    // Development / Preview mode logging
    console.log(`📨 [EMAIL SIMULATION] To: ${email} | Subject: ${subject}`);
    console.log(`🔗 Link di conferma: ${confirmUrl}`);
    await logEmail(email, 'double_opt_in', subject, 'simulated_success', `Simulato (SMTP non configurato). Link: ${confirmUrl}`);
    return { success: true, simulated: true, confirmUrl };
  }
}

/**
 * Send New Movie Digest Alert to Active Subscriber
 */
export async function sendMovieAlertDigest(email: string, cityName: string, movies: Array<{ title: string; poster: string; cinemas: string; url?: string }>, unsubscribeToken: string) {
  const unsubscribeUrl = `${APP_URL}/api/alerts/unsubscribe?token=${unsubscribeToken}`;
  const subject = `Nuovi film in programmazione a ${cityName} — CineVicino`;

  const movieListHtml = movies.map(m => `
    <div style="display: flex; gap: 16px; padding: 12px; background: #0f172a; border-radius: 8px; margin-bottom: 12px; border: 1px solid #1e293b;">
      <img src="${m.poster}" alt="${m.title}" style="width: 60px; height: 90px; object-fit: cover; border-radius: 4px;" />
      <div>
        <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #ffffff;">${m.title}</h3>
        <p style="margin: 0; font-size: 13px; color: #94a3b8;">In sala presso: <strong>${m.cinemas}</strong></p>
      </div>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 24px; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f1f5f9;">
        <div style="max-width: 580px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; padding: 32px;">
          <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0;">Nuovi film a ${cityName}</h1>
          <p style="color: #94a3b8; font-size: 14px;">Ecco le ultime novità arrivate nei cinema della tua zona:</p>
          ${movieListHtml}
          <div style="margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px; font-size: 12px; color: #475569; text-align: center;">
            Ricevi questa email perché sei iscritto agli avvisi per ${cityName}.
            <br>
            <a href="${unsubscribeUrl}" style="color: #94a3b8; text-decoration: underline;">Disiscriviti con 1 click</a>
          </div>
        </div>
      </body>
    </html>
  `;

  const mailer = getTransporter();
  if (mailer) {
    try {
      await mailer.sendMail({ from: SMTP_FROM, to: email, subject, html });
      await logEmail(email, 'movie_digest', subject, 'delivered', `Inviati ${movies.length} film`);
    } catch (err: any) {
      await logEmail(email, 'movie_digest', subject, 'error', err.message);
    }
  } else {
    console.log(`📨 [DIGEST SIMULATION] To: ${email} | Movies: ${movies.length}`);
    await logEmail(email, 'movie_digest', subject, 'simulated_success', `Simulato (${movies.length} film)`);
  }
}
