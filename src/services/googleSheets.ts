/**
 * CineVicino — Google Sheets Auto-Sync Integration (Service Account)
 * 
 * Automatically synchronizes current Italian cinema directory data, active movies,
 * programming showtimes, and scrape audit logs into a user-controlled Google Sheet.
 * 
 * Uses Google Sheets API v4 with a Google Service Account (server-to-server,
 * no human OAuth redirect flow required at runtime).
 */

import { google } from 'googleapis';
import fs from 'fs';
import { executeRawSql } from '../db/index';

export interface GoogleSheetsDiagnosticResult {
  configured: boolean;
  service_account_email: string | null;
  spreadsheet_id: string | null;
  spreadsheet_url: string | null;
  status: 'healthy' | 'unconfigured' | 'permission_denied' | 'not_found' | 'error';
  latency_ms: number;
  spreadsheet_title?: string;
  sheets_found?: string[];
  last_sync_at?: string | null;
  last_sync_status?: string | null;
  last_sync_message?: string | null;
  message: string;
  tested_at: string;
}

export interface GoogleSheetsSyncResult {
  success: boolean;
  skipped?: boolean;
  spreadsheet_id?: string;
  spreadsheet_url?: string;
  synced_counts?: {
    cinemas: number;
    movies: number;
    showtimes: number;
    logs: number;
  };
  duration_ms?: number;
  message: string;
  error?: string;
}

/**
 * Extracts clean Google Spreadsheet ID from either a full URL or a raw ID string.
 * Supports:
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 * - 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 */
export function extractSpreadsheetId(input: string | null | undefined): string {
  if (!input) return '';
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  // Strip any accidental surrounding quotes or query fragments
  const cleanId = trimmed.replace(/^["']|["']$/g, '').split('?')[0].split('#')[0].trim();
  return cleanId;
}

/**
 * Retrieves and initializes Google Service Account credentials.
 * Supports:
 * 1. GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 * 2. GOOGLE_SERVICE_ACCOUNT_KEY (raw JSON string)
 * 3. GOOGLE_APPLICATION_CREDENTIALS (file path)
 */
function getServiceAccountCredentials(): { email: string; privateKey: string } | null {
  // Option 1: Direct environment variables
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (email && rawKey) {
    // Replace escaped \n with real newlines and trim extra quotes
    const cleanKey = rawKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
    return { email: email.trim(), privateKey: cleanKey };
  }

  // Option 2: Full JSON string in GOOGLE_SERVICE_ACCOUNT_KEY
  const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (jsonKey) {
    try {
      const parsed = typeof jsonKey === 'string' ? JSON.parse(jsonKey) : jsonKey;
      if (parsed.client_email && parsed.private_key) {
        return {
          email: parsed.client_email.trim(),
          privateKey: parsed.private_key.replace(/\\n/g, '\n')
        };
      }
    } catch {
      // Ignore JSON parse failure
    }
  }

  // Option 3: File path in GOOGLE_APPLICATION_CREDENTIALS
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credsPath && fs.existsSync(credsPath)) {
    try {
      const content = fs.readFileSync(credsPath, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed.client_email && parsed.private_key) {
        return {
          email: parsed.client_email.trim(),
          privateKey: parsed.private_key.replace(/\\n/g, '\n')
        };
      }
    } catch {
      // Ignore file parse failure
    }
  }

  return null;
}

/**
 * Returns an authenticated Google Sheets client or null if not configured.
 */
function getSheetsClient(): { client: any; email: string } | null {
  const creds = getServiceAccountCredentials();
  if (!creds) return null;

  try {
    const auth = new google.auth.JWT({
      email: creds.email,
      key: creds.privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const client = google.sheets({ version: 'v4', auth });
    return { client, email: creds.email };
  } catch (err: any) {
    console.error('[GoogleSheets] Failed to create Google JWT auth client:', err?.message);
    return null;
  }
}

/**
 * Retrieves the currently saved spreadsheet ID from site_settings.
 */
export async function getConfiguredSpreadsheetId(): Promise<string> {
  try {
    const res = await executeRawSql(
      `SELECT value FROM site_settings WHERE key = 'google_sheets_spreadsheet_id' LIMIT 1`
    );
    if (res.rows && res.rows.length > 0) {
      return extractSpreadsheetId(res.rows[0].value);
    }
  } catch (err: any) {
    console.warn('[GoogleSheets] Error reading spreadsheet ID setting:', err?.message);
  }
  return '';
}

/**
 * Validates Google Sheets service account access and verifies the target spreadsheet.
 */
export async function checkGoogleSheetsAccess(spreadsheetIdInput?: string): Promise<GoogleSheetsDiagnosticResult> {
  const testedAt = new Date().toISOString();
  const creds = getServiceAccountCredentials();
  const serviceAccountEmail = creds?.email || null;

  // Read saved sync stats from site_settings
  let lastSyncAt: string | null = null;
  let lastSyncStatus: string | null = null;
  let lastSyncMessage: string | null = null;
  try {
    const settingsRes = await executeRawSql(`
      SELECT key, value FROM site_settings 
      WHERE key IN ('google_sheets_last_sync_at', 'google_sheets_last_sync_status', 'google_sheets_last_sync_message')
    `);
    for (const r of settingsRes.rows) {
      if (r.key === 'google_sheets_last_sync_at') lastSyncAt = r.value;
      if (r.key === 'google_sheets_last_sync_status') lastSyncStatus = r.value;
      if (r.key === 'google_sheets_last_sync_message') lastSyncMessage = r.value;
    }
  } catch {
    // Ignore setting read errors
  }

  // Determine target spreadsheet ID
  let targetSpreadsheetId = extractSpreadsheetId(spreadsheetIdInput);
  if (!targetSpreadsheetId) {
    targetSpreadsheetId = await getConfiguredSpreadsheetId();
  }

  const spreadsheetUrl = targetSpreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`
    : null;

  if (!creds) {
    return {
      configured: false,
      service_account_email: null,
      spreadsheet_id: targetSpreadsheetId || null,
      spreadsheet_url: spreadsheetUrl,
      status: 'unconfigured',
      latency_ms: 0,
      last_sync_at: lastSyncAt,
      last_sync_status: lastSyncStatus,
      last_sync_message: lastSyncMessage,
      message: 'Credenziali Service Account non configurate nel file .env (richieste GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).',
      tested_at: testedAt
    };
  }

  if (!targetSpreadsheetId) {
    return {
      configured: true,
      service_account_email: serviceAccountEmail,
      spreadsheet_id: null,
      spreadsheet_url: null,
      status: 'unconfigured',
      latency_ms: 0,
      last_sync_at: lastSyncAt,
      last_sync_status: lastSyncStatus,
      last_sync_message: lastSyncMessage,
      message: `Service Account pronto (${serviceAccountEmail}), ma nessun foglio Google configurato. Inserisci l'ID o l'URL del foglio Google.`,
      tested_at: testedAt
    };
  }

  const sheetsObj = getSheetsClient();
  if (!sheetsObj) {
    return {
      configured: false,
      service_account_email: serviceAccountEmail,
      spreadsheet_id: targetSpreadsheetId,
      spreadsheet_url: spreadsheetUrl,
      status: 'error',
      latency_ms: 0,
      last_sync_at: lastSyncAt,
      last_sync_status: lastSyncStatus,
      last_sync_message: lastSyncMessage,
      message: 'Impossibile inizializzare il client JWT Google Sheets. Verifica la formattazione della chiave privata.',
      tested_at: testedAt
    };
  }

  const startTime = Date.now();
  try {
    const res = await sheetsObj.client.spreadsheets.get({
      spreadsheetId: targetSpreadsheetId,
      fields: 'spreadsheetId,properties.title,sheets.properties.title'
    });

    const latencyMs = Date.now() - startTime;
    const title = res.data.properties?.title || 'Foglio senza titolo';
    const sheetsFound = (res.data.sheets || [])
      .map((s: any) => s.properties?.title)
      .filter(Boolean);

    return {
      configured: true,
      service_account_email: serviceAccountEmail,
      spreadsheet_id: targetSpreadsheetId,
      spreadsheet_url: spreadsheetUrl,
      status: 'healthy',
      latency_ms: latencyMs,
      spreadsheet_title: title,
      sheets_found: sheetsFound,
      last_sync_at: lastSyncAt,
      last_sync_status: lastSyncStatus,
      last_sync_message: lastSyncMessage,
      message: `Accesso verificato con successo! Il Service Account ha accesso a "${title}" (${sheetsFound.length} schede presenti).`,
      tested_at: testedAt
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const statusCode = err?.response?.status || err?.code;
    const errMsg = err?.message || String(err);

    if (statusCode === 403 || errMsg.includes('The caller does not have permission')) {
      return {
        configured: true,
        service_account_email: serviceAccountEmail,
        spreadsheet_id: targetSpreadsheetId,
        spreadsheet_url: spreadsheetUrl,
        status: 'permission_denied',
        latency_ms: latencyMs,
        last_sync_at: lastSyncAt,
        last_sync_status: lastSyncStatus,
        last_sync_message: lastSyncMessage,
        message: `Permesso negato (403). Devi condividere il foglio Google con l'indirizzo email del Service Account (${serviceAccountEmail}) con ruolo "Editor".`,
        tested_at: testedAt
      };
    }

    if (statusCode === 404 || errMsg.includes('Requested entity was not found')) {
      return {
        configured: true,
        service_account_email: serviceAccountEmail,
        spreadsheet_id: targetSpreadsheetId,
        spreadsheet_url: spreadsheetUrl,
        status: 'not_found',
        latency_ms: latencyMs,
        last_sync_at: lastSyncAt,
        last_sync_status: lastSyncStatus,
        last_sync_message: lastSyncMessage,
        message: `Foglio non trovato (404). Verifica che l'ID del foglio "${targetSpreadsheetId}" sia corretto e non sia stato eliminato.`,
        tested_at: testedAt
      };
    }

    return {
      configured: true,
      service_account_email: serviceAccountEmail,
      spreadsheet_id: targetSpreadsheetId,
      spreadsheet_url: spreadsheetUrl,
      status: 'error',
      latency_ms: latencyMs,
      last_sync_at: lastSyncAt,
      last_sync_status: lastSyncStatus,
      last_sync_message: lastSyncMessage,
      message: `Errore durante la connessione a Google Sheets: ${errMsg}`,
      tested_at: testedAt
    };
  }
}

/**
 * Ensures required sheet tabs exist in the target spreadsheet.
 * Creates missing tabs via batchUpdate.
 */
async function ensureSheetTabsExist(sheetsClient: any, spreadsheetId: string, requiredTabs: string[]): Promise<void> {
  const meta = await sheetsClient.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title'
  });

  const existingTitles = new Set(
    (meta.data.sheets || []).map((s: any) => s.properties?.title).filter(Boolean)
  );

  const missingTabs = requiredTabs.filter(t => !existingTitles.has(t));
  if (missingTabs.length === 0) return;

  const requests = missingTabs.map(title => ({
    addSheet: {
      properties: {
        title,
        gridProperties: {
          rowCount: 200,
          columnCount: 20
        }
      }
    }
  }));

  await sheetsClient.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests }
  });
  console.log(`[GoogleSheets] Added missing sheet tabs: ${missingTabs.join(', ')}`);
}

/**
 * Core synchronization engine:
 * Fetches current verified database snapshots (Cinemas, Movies, Showtimes, ScrapeLogs)
 * and writes them into named tabs in the target Google Sheet.
 * 
 * Always overwrites/replaces tab contents so the sheet remains an accurate,
 * uncluttered ground truth representation.
 */
export async function syncAllDataToGoogleSheet(options: {
  spreadsheetId?: string;
  triggeredBy?: string;
} = {}): Promise<GoogleSheetsSyncResult> {
  const startTime = Date.now();

  // 1. Resolve spreadsheet ID
  let targetSpreadsheetId = extractSpreadsheetId(options.spreadsheetId);
  if (!targetSpreadsheetId) {
    targetSpreadsheetId = await getConfiguredSpreadsheetId();
  }

  if (!targetSpreadsheetId) {
    console.log('[GoogleSheets] Sincronizzazione saltata: nessun ID foglio Google configurato in site_settings.');
    return {
      success: false,
      skipped: true,
      message: 'Nessun foglio Google configurato nelle impostazioni.'
    };
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`;

  // 2. Resolve Service Account Client
  const sheetsObj = getSheetsClient();
  if (!sheetsObj) {
    const errorMsg = 'Credenziali Google Service Account mancanti o non valide (.env).';
    console.warn(`[GoogleSheets] ⚠️ ${errorMsg}`);
    await recordSyncStatus('error', errorMsg);
    return {
      success: false,
      spreadsheet_id: targetSpreadsheetId,
      spreadsheet_url: spreadsheetUrl,
      message: errorMsg,
      error: errorMsg
    };
  }

  try {
    console.log(`[GoogleSheets] 🚀 Avvio sincronizzazione con foglio: ${targetSpreadsheetId}...`);

    // 3. Query PostgreSQL for verified data
    // Query Cinemas
    const cinemasRes = await executeRawSql(`
      SELECT 
        c.id,
        c.name,
        COALESCE(ci.name, '') AS city_name,
        COALESCE(ci.region, '') AS region,
        COALESCE(c.address, '') AS address,
        COALESCE(c.chain, 'indipendente') AS chain,
        c.lat,
        c.lng,
        COALESCE(c.website_url, '') AS website_url,
        c.features
      FROM cinemas c
      LEFT JOIN cities ci ON c.city_id = ci.id
      ORDER BY ci.name ASC, c.name ASC
    `);

    // Query Movies
    const moviesRes = await executeRawSql(`
      SELECT 
        id,
        slug,
        title_it,
        COALESCE(title_en, '') AS title_en,
        COALESCE(title_original, '') AS title_original,
        COALESCE(director, 'N/D') AS director,
        duration_minutes,
        rating,
        release_year,
        genres,
        "cast",
        tmdb_id,
        COALESCE(poster_url, '') AS poster_url
      FROM movies
      ORDER BY title_it ASC
    `);

    // Query Showtimes (active, non-expired)
    const showtimesRes = await executeRawSql(`
      SELECT 
        s.id,
        m.title_it AS movie_title,
        c.name AS cinema_name,
        COALESCE(ci.name, '') AS city_name,
        s.show_date,
        s.time,
        s.format,
        s.language,
        COALESCE(s.ticket_source, 'Botteghino') AS ticket_source,
        COALESCE(s.ticket_url, '') AS ticket_url,
        TO_CHAR(s.scraped_at, 'YYYY-MM-DD HH24:MI:SS') AS scraped_at
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      JOIN cinemas c ON s.cinema_id = c.id
      LEFT JOIN cities ci ON c.city_id = ci.id
      WHERE s.active = TRUE
      ORDER BY s.show_date ASC, s.time ASC, ci.name ASC
    `);

    // Query Scrape Logs
    const logsRes = await executeRawSql(`
      SELECT 
        TO_CHAR(run_at, 'YYYY-MM-DD HH24:MI:SS') AS run_at,
        source,
        cities_touched,
        cinemas_touched,
        movies_touched,
        showtimes_touched,
        firecrawl_credits_used,
        status,
        details
      FROM scrape_logs
      ORDER BY run_at DESC
      LIMIT 100
    `);

    const cinemas = cinemasRes.rows || [];
    const movies = moviesRes.rows || [];
    const showtimes = showtimesRes.rows || [];
    const logs = logsRes.rows || [];

    // 4. Format tabular data for each sheet tab
    const nowStr = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });

    // Tab: Panoramica (Overview)
    const overviewRows: (string | number)[][] = [
      ['CineVicino — Sincronizzazione Dati Cinema & Programmazione'],
      ['Ultimo aggiornamento:', nowStr],
      ['Attivato da:', options.triggeredBy || 'Scraper Batch / Amministrazione'],
      ['Service Account:', sheetsObj.email],
      [''],
      ['METRICA', 'VALORE', 'DESCRIZIONE'],
      ['Cinema Sincronizzati', cinemas.length, 'Sale e multisala censiti nel database'],
      ['Film in Programmazione', movies.length, 'Pellicole con locandine e metadati arricchiti TMDb'],
      ['Orari Spettacoli Attivi', showtimes.length, 'Orari reali verificati per le date programmate'],
      ['Log Scrape Archiviati', logs.length, 'Ultime esecuzioni dei crawler multi-sorgente'],
      [''],
      ['NOTE DI CONSULTAZIONE:'],
      ['- Scheda "Cinemas": Elenco completo dei cinema italiani con indirizzo, catena e geolocalizzazione.'],
      ['- Scheda "Movies": Catalogo dei film con registi, durata, valutazione e cast principale.'],
      ['- Scheda "Showtimes": Orari effettivi di proiezione con sorgenti di biglietteria (Ticketing / Botteghino).'],
      ['- Scheda "ScrapeLog": Storico dettagliato dei batch di aggiornamento nazionale.'],
      ['Tutti i dati sono aggiornati automaticamente da CineVicino (https://cinemavicino.minhazbinsanto.com).']
    ];

    // Tab: Cinemas
    const cinemaRows: (string | number)[][] = [
      [
        'ID Cinema',
        'Nome Cinema',
        'Città',
        'Regione',
        'Indirizzo',
        'Circuito / Catena',
        'Latitudine',
        'Longitudine',
        'Sito Web / Fonte',
        'Caratteristiche / Servizi'
      ],
      ...cinemas.map((c: any) => {
        let featuresStr = '';
        try {
          const parsed = typeof c.features === 'string' ? JSON.parse(c.features) : c.features;
          featuresStr = Array.isArray(parsed) ? parsed.join(', ') : String(parsed || '');
        } catch {
          featuresStr = String(c.features || '');
        }
        return [
          c.id || '',
          c.name || '',
          c.city_name || '',
          c.region || '',
          c.address || '',
          c.chain || 'indipendente',
          c.lat !== null && c.lat !== undefined ? Number(c.lat) : '',
          c.lng !== null && c.lng !== undefined ? Number(c.lng) : '',
          c.website_url || '',
          featuresStr
        ];
      })
    ];

    // Tab: Movies
    const movieRows: (string | number)[][] = [
      [
        'ID Film',
        'Slug',
        'Titolo Italiano',
        'Titolo Originale / EN',
        'Regista',
        'Durata (min)',
        'Voto TMDb',
        'Anno Uscita',
        'Generi',
        'TMDb ID',
        'Cast Principale',
        'Locandina URL'
      ],
      ...movies.map((m: any) => {
        let genresStr = '';
        try {
          const parsed = typeof m.genres === 'string' ? JSON.parse(m.genres) : m.genres;
          genresStr = Array.isArray(parsed) ? parsed.join(', ') : String(parsed || '');
        } catch {
          genresStr = String(m.genres || '');
        }

        let castStr = '';
        try {
          const parsed = typeof m.cast === 'string' ? JSON.parse(m.cast) : m.cast;
          castStr = Array.isArray(parsed) ? parsed.join(', ') : String(parsed || '');
        } catch {
          castStr = String(m.cast || '');
        }

        return [
          m.id || '',
          m.slug || '',
          m.title_it || '',
          m.title_original || m.title_en || '',
          m.director || 'N/D',
          m.duration_minutes !== null && m.duration_minutes !== undefined ? Number(m.duration_minutes) : '',
          m.rating !== null && m.rating !== undefined ? Number(m.rating) : '',
          m.release_year || '',
          genresStr,
          m.tmdb_id || '',
          castStr,
          m.poster_url || ''
        ];
      })
    ];

    // Tab: Showtimes
    const showtimeRows: (string | number)[][] = [
      [
        'ID Spettacolo',
        'Film',
        'Cinema',
        'Città',
        'Data Spettacolo (AAAA-MM-GG)',
        'Orario',
        'Formato',
        'Lingua',
        'Sorgente Biglietto',
        'Link Ufficiale Biglietto',
        'Ultimo Scrape'
      ],
      ...showtimes.map((s: any) => [
        s.id || '',
        s.movie_title || '',
        s.cinema_name || '',
        s.city_name || '',
        s.show_date || '',
        s.time || '',
        s.format || '2D',
        s.language || 'IT',
        s.ticket_source || 'Botteghino',
        s.ticket_url || '',
        s.scraped_at || ''
      ])
    ];

    // Tab: ScrapeLog
    const logRows: (string | number)[][] = [
      [
        'Data Esecuzione',
        'Sorgente',
        'Città Coinvolte',
        'Cinema Aggiornati',
        'Film Aggiornati',
        'Spettacoli Sincronizzati',
        'Crediti Firecrawl Utilizzati',
        'Stato Esecuzione',
        'Dettagli Rotazione'
      ],
      ...logs.map((l: any) => [
        l.run_at || '',
        l.source || '',
        l.cities_touched !== null ? Number(l.cities_touched) : 0,
        l.cinemas_touched !== null ? Number(l.cinemas_touched) : 0,
        l.movies_touched !== null ? Number(l.movies_touched) : 0,
        l.showtimes_touched !== null ? Number(l.showtimes_touched) : 0,
        l.firecrawl_credits_used !== null ? Number(l.firecrawl_credits_used) : 0,
        l.status || 'success',
        l.details || ''
      ])
    ];

    // 5. Ensure all required named tabs exist
    const requiredTabs = ['Panoramica', 'Cinemas', 'Movies', 'Showtimes', 'ScrapeLog'];
    await ensureSheetTabsExist(sheetsObj.client, targetSpreadsheetId, requiredTabs);

    // 6. Clear existing values across tabs to prevent ghost rows
    try {
      await sheetsObj.client.spreadsheets.values.batchClear({
        spreadsheetId: targetSpreadsheetId,
        requestBody: {
          ranges: [
            'Panoramica!A1:Z500',
            'Cinemas!A1:Z10000',
            'Movies!A1:Z5000',
            'Showtimes!A1:Z25000',
            'ScrapeLog!A1:Z1000'
          ]
        }
      });
    } catch (clearErr: any) {
      console.warn('[GoogleSheets] Tab clear warning (non-fatal, proceeding to write):', clearErr?.message);
    }

    // 7. Write new values in one efficient batch update
    await sheetsObj.client.spreadsheets.values.batchUpdate({
      spreadsheetId: targetSpreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `'Panoramica'!A1`, values: overviewRows },
          { range: `'Cinemas'!A1`, values: cinemaRows },
          { range: `'Movies'!A1`, values: movieRows },
          { range: `'Showtimes'!A1`, values: showtimeRows },
          { range: `'ScrapeLog'!A1`, values: logRows }
        ]
      }
    });

    const durationMs = Date.now() - startTime;
    const successMsg = `Sincronizzazione completata in ${(durationMs / 1000).toFixed(1)}s: ${cinemas.length} cinema, ${movies.length} film, ${showtimes.length} orari su Google Sheets.`;
    console.log(`[GoogleSheets] ✅ ${successMsg}`);

    // 8. Record success in site_settings
    await recordSyncStatus('success', successMsg);

    return {
      success: true,
      spreadsheet_id: targetSpreadsheetId,
      spreadsheet_url: spreadsheetUrl,
      synced_counts: {
        cinemas: cinemas.length,
        movies: movies.length,
        showtimes: showtimes.length,
        logs: logs.length
      },
      duration_ms: durationMs,
      message: successMsg
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const statusCode = err?.response?.status || err?.code;
    let friendlyError = err?.message || String(err);

    if (statusCode === 403 || friendlyError.includes('The caller does not have permission')) {
      friendlyError = `Permesso negato (403): Condividi il foglio Google con l'email "${sheetsObj.email}" con ruolo "Editor".`;
    } else if (statusCode === 404) {
      friendlyError = `Foglio non trovato (404): ID "${targetSpreadsheetId}" non valido o rimosso.`;
    }

    console.error(`[GoogleSheets] ❌ Errore durante la sincronizzazione con Google Sheets: ${friendlyError}`);
    await recordSyncStatus('error', friendlyError);

    return {
      success: false,
      spreadsheet_id: targetSpreadsheetId,
      spreadsheet_url: spreadsheetUrl,
      duration_ms: durationMs,
      message: friendlyError,
      error: friendlyError
    };
  }
}

/**
 * Saves the last sync result into site_settings.
 */
async function recordSyncStatus(status: 'success' | 'error', message: string): Promise<void> {
  const now = new Date().toISOString();
  try {
    const updates = [
      ['google_sheets_last_sync_at', now],
      ['google_sheets_last_sync_status', status],
      ['google_sheets_last_sync_message', message]
    ];
    for (const [key, val] of updates) {
      await executeRawSql(
        `INSERT INTO site_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, val]
      );
    }
  } catch (err: any) {
    console.warn('[GoogleSheets] Failed to record sync status in site_settings:', err?.message);
  }
}
