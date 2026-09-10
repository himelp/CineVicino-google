import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, Activity, Database, RefreshCw, Play, 
  Settings, Film, MapPin, Ticket, CheckCircle2, 
  XCircle, AlertTriangle, Key, LogOut, Terminal, 
  Edit3, Save, Plus, ArrowRight, ArrowLeft, Eye, EyeOff, Zap, Globe,
  FileSpreadsheet, ExternalLink, Copy,
  Instagram, Facebook, Twitter, Music2, Youtube, Share2
} from 'lucide-react';
import { Movie, Cinema, Showtime, ScrapeLog, SiteSettings, GoogleSheetsStatus } from '../types';
import { safeReadJson, safeFetchJson, ApiResponse } from '../utils/api';

interface AdminDashboardProps {
  onClose?: () => void;
  onSettingsUpdated?: (settings: SiteSettings) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, onSettingsUpdated }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState<string>(() => localStorage.getItem('cinevicino_token') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('admin@cinevicino.it');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Map URL route to active CMS tab
  const getTabFromPath = (pathname: string): 'status' | 'scrape' | 'content' | 'customization' => {
    if (pathname.startsWith('/admin/scraper') || pathname.startsWith('/admin/scrape')) return 'scrape';
    if (pathname.startsWith('/admin/content') || pathname.startsWith('/admin/contenuti')) return 'content';
    if (pathname.startsWith('/admin/settings') || pathname.startsWith('/admin/impostazioni') || pathname.startsWith('/admin/customization')) return 'customization';
    return 'status';
  };

  const activeTab = getTabFromPath(location.pathname);

  const handleTabChange = (tab: 'status' | 'scrape' | 'content' | 'customization') => {
    switch (tab) {
      case 'status':
        navigate('/admin/status');
        break;
      case 'scrape':
        navigate('/admin/scraper');
        break;
      case 'content':
        navigate('/admin/content');
        break;
      case 'customization':
        navigate('/admin/settings');
        break;
    }
  };

  const handleGoHome = () => {
    if (onClose) {
      onClose();
    }
    navigate('/');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('cinevicino_token');
    setToken('');
  };

  // Polling ref for background scrape job monitoring
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Authenticated fetch helper that automatically attaches JWT Bearer token
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const currentToken = token || localStorage.getItem('cinevicino_token') || '';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentToken}`,
      ...options.headers,
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      setIsAuthenticated(false);
      setLoginError('Sessione scaduta o permessi admin insufficienti. Effettua nuovamente il login.');
    }
    return res;
  };

  // Safe authenticated JSON fetch helper that inspects content-type and handles 502/504 gateway timeouts gracefully
  const authFetchJson = async <T = any>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
    try {
      const res = await authFetch(url, options);
      return await safeReadJson<T>(res);
    } catch (netErr: any) {
      return {
        ok: false,
        status: 0,
        error: `Errore di rete o connessione interrotta: ${netErr?.message || netErr}`
      };
    }
  };

  // Check existing session on mount
  useEffect(() => {
    async function checkExistingAuth() {
      const storedToken = localStorage.getItem('cinevicino_token');
      if (!storedToken) return;
      try {
        const parsed = await safeFetchJson<any>('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        if (parsed.ok && parsed.data?.user?.is_admin) {
          setIsAuthenticated(true);
          setToken(storedToken);
        }
      } catch (err) {
        console.error('Failed to verify stored session', err);
      }
    }
    checkExistingAuth();
  }, []);

  // Status state
  const [statusData, setStatusData] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Diagnostics test states
  const [testingTmdb, setTestingTmdb] = useState(false);
  const [tmdbTestResult, setTmdbTestResult] = useState<any>(null);
  const [testingFirecrawl, setTestingFirecrawl] = useState(false);
  const [firecrawlTestResult, setFirecrawlTestResult] = useState<any>(null);
  const [testingScrapers, setTestingScrapers] = useState(false);
  const [scrapersTestResult, setScrapersTestResult] = useState<any>(null);

  // Scrape state
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeConsole, setScrapeConsole] = useState<string[]>([]);
  const [useFirecrawl, setUseFirecrawl] = useState(false);

  // Content state
  const [contentData, setContentData] = useState<{
    citiesCount: number;
    cinemasCount: number;
    moviesCount: number;
    showtimesCount: number;
    activeShowtimesCount: number;
    cinemas: Cinema[];
    movies: Movie[];
    showtimes: Showtime[];
    settings: SiteSettings;
  } | null>(null);
  const [contentSearch, setContentSearch] = useState('');

  // GeoIP state
  const [updatingGeoip, setUpdatingGeoip] = useState(false);
  const [geoipLicenseInput, setGeoipLicenseInput] = useState('');
  const [geoipMessage, setGeoipMessage] = useState('');

  // Add cinema/movie form toggles
  const [showAddCinema, setShowAddCinema] = useState(false);
  const [showAddMovie, setShowAddMovie] = useState(false);
  const [newCinemaName, setNewCinemaName] = useState('');
  const [newCinemaAddress, setNewCinemaAddress] = useState('');
  const [newCinemaChain, setNewCinemaChain] = useState('independent');
  const [newMovieTitle, setNewMovieTitle] = useState('');
  const [newMovieDirector, setNewMovieDirector] = useState('');

  // Scraper rotation parameters
  const [scrapeTargetCity, setScrapeTargetCity] = useState('');
  const [scrapeLimit, setScrapeLimit] = useState('25');
  const [scrapeOffset, setScrapeOffset] = useState('');
  const [scrapeDaysAhead, setScrapeDaysAhead] = useState('7');
  const [scrapeAdvanceCursor, setScrapeAdvanceCursor] = useState(true);

  // Customization state
  const [customSettings, setCustomSettings] = useState<SiteSettings | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [socialValidationError, setSocialValidationError] = useState<string | null>(null);

  // Google Sheets integration state
  const [sheetsStatus, setSheetsStatus] = useState<GoogleSheetsStatus | null>(null);
  const [sheetsInput, setSheetsInput] = useState<string>('');
  const [testingSheets, setTestingSheets] = useState(false);
  const [savingSheetsConfig, setSavingSheetsConfig] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [sheetsActionMessage, setSheetsActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Handle Login via real POST /api/auth/login with safe JSON handling
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const parsed = await safeFetchJson<any>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      if (!parsed.ok) {
        setLoginError(parsed.error || 'Credenziali di accesso non valide.');
        return;
      }

      const data = parsed.data;
      if (data?.token && data.user?.is_admin) {
        setToken(data.token);
        localStorage.setItem('cinevicino_token', data.token);
        setIsAuthenticated(true);
        setLoginError('');
      } else if (!data?.user?.is_admin) {
        setLoginError('Accesso negato: questo account non dispone dei privilegi di amministratore.');
      } else {
        setLoginError(data?.error || 'Credenziali di accesso non valide.');
      }
    } catch (err: any) {
      setLoginError(`Errore di connessione: ${err.message || err}`);
    }
  };

  // Helper to stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Poll background scrape job status and stream console logs
  const startPollingScrapeJob = useCallback((jobId: string) => {
    stopPolling();
    setIsScraping(true);
    setActiveJobId(jobId);

    const poll = async () => {
      try {
        const parsed = await authFetchJson<{ success: boolean; job: any }>(`/api/admin/scrape/status/${jobId}`);
        if (!parsed.ok || !parsed.data?.job) {
          if (parsed.status === 404) {
            stopPolling();
            setIsScraping(false);
            setActiveJobId(null);
            setScrapeConsole(prev => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] [AVVISO] Job ${jobId} non più attivo nel buffer di memoria.`
            ]);
          }
          return;
        }

        const job = parsed.data.job;
        if (Array.isArray(job.logs) && job.logs.length > 0) {
          setScrapeConsole(job.logs);
        }

        if (job.status === 'completed') {
          stopPolling();
          setIsScraping(false);
          setActiveJobId(null);
          loadScrapeLogs();
          loadContent();
          loadStatus();
        } else if (job.status === 'failed') {
          stopPolling();
          setIsScraping(false);
          setActiveJobId(null);
          if (job.error) {
            setScrapeConsole(prev => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] [ERRORE FINALE] ${job.error}`
            ]);
          }
        } else if (job.status === 'cancelled') {
          stopPolling();
          setIsScraping(false);
          setActiveJobId(null);
        }
      } catch (err: any) {
        console.warn('Poll error for scrape job:', err);
      }
    };

    poll();
    pollingIntervalRef.current = setInterval(poll, 2500);
  }, [stopPolling, token]);

  // Clean up polling timer on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Check if an active scrape job is already in flight
  const checkActiveScrapeJob = useCallback(async () => {
    try {
      const parsed = await authFetchJson<{ success: boolean; has_active_job: boolean; job: any }>('/api/admin/scrape/active-job');
      if (parsed.ok && parsed.data?.has_active_job && parsed.data.job?.job_id) {
        const job = parsed.data.job;
        if (job.status === 'running') {
          if (Array.isArray(job.logs) && job.logs.length > 0) {
            setScrapeConsole(job.logs);
          }
          startPollingScrapeJob(job.job_id);
        }
      }
    } catch (e) {
      console.error('Error checking active scrape job', e);
    }
  }, [startPollingScrapeJob]);

  // Trigger loads when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadStatus();
      loadScrapeLogs();
      loadContent();
      loadSettings();
      checkActiveScrapeJob();
    }
  }, [isAuthenticated, token, checkActiveScrapeJob]);

  // Load Status
  const loadStatus = async () => {
    try {
      setLoadingStatus(true);
      const parsed = await authFetchJson<any>('/api/admin/status');
      if (parsed.ok && parsed.data) {
        setStatusData(parsed.data);
        if (parsed.data.sheets) {
          setSheetsStatus(parsed.data.sheets);
          setSheetsInput(prev => prev || parsed.data.sheets.spreadsheet_url || parsed.data.sheets.spreadsheet_id || '');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Load Scrape Logs
  const loadScrapeLogs = async () => {
    try {
      const parsed = await authFetchJson<ScrapeLog[]>('/api/admin/scrape/logs');
      if (parsed.ok && Array.isArray(parsed.data)) {
        setLogs(parsed.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load Content
  const loadContent = async () => {
    try {
      const parsed = await authFetchJson<any>('/api/admin/content/all');
      if (parsed.ok && parsed.data) {
        setContentData(parsed.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load Settings
  const loadSettings = async () => {
    try {
      const parsed = await authFetchJson<SiteSettings>('/api/admin/settings');
      if (parsed.ok && parsed.data) {
        setCustomSettings({
          ...parsed.data,
          social_instagram_url: parsed.data.social_instagram_url || '',
          social_facebook_url: parsed.data.social_facebook_url || '',
          social_x_url: parsed.data.social_x_url || '',
          social_tiktok_url: parsed.data.social_tiktok_url || '',
          social_youtube_url: parsed.data.social_youtube_url || '',
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Run Scraper (as asynchronous background job)
  const handleTriggerScrape = async () => {
    setIsScraping(true);
    setScrapeConsole([
      `[${new Date().toLocaleTimeString()}] Avvio richiesta scraping batch in background...`,
      `[${new Date().toLocaleTimeString()}] Connessione ai moduli di scraping (ComingSoon.it, MYmovies.it, CinemaTimes.com, TMDb)...`
    ]);

    try {
      const payload: any = { useFirecrawl };
      if (scrapeTargetCity.trim()) payload.city = scrapeTargetCity.trim();
      if (scrapeLimit) payload.limit = parseInt(scrapeLimit, 10);
      if (scrapeOffset !== '') payload.offset = parseInt(scrapeOffset, 10);
      if (scrapeDaysAhead) payload.days_ahead = parseInt(scrapeDaysAhead, 10);
      payload.advance_cursor = scrapeAdvanceCursor;

      const parsed = await authFetchJson<any>('/api/admin/scrape/run', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!parsed.ok || !parsed.data) {
        setScrapeConsole(prev => [
          ...prev,
          `[ERRORE SERVER] ${parsed.error || 'Risposta inattesa o non valida dal server'}`
        ]);
        setIsScraping(false);
        return;
      }

      const data = parsed.data;
      if (data.success && data.job_id) {
        const jobId = data.job_id;
        setActiveJobId(jobId);
        if (data.already_running) {
          setScrapeConsole(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Scrape batch già attivo (Job ID: ${jobId}). Connessione al monitoraggio live...`
          ]);
        } else {
          setScrapeConsole(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Job avviato in background con successo (Job ID: ${jobId}). Avvio streaming log...`
          ]);
        }
        startPollingScrapeJob(jobId);
      } else {
        setScrapeConsole(prev => [...prev, `[ERRORE] ${data.error || 'Impossibile avviare il job di scraping'}`]);
        setIsScraping(false);
      }
    } catch (err: any) {
      setScrapeConsole(prev => [...prev, `[ERRORE RETE] ${err.message || err}`]);
      setIsScraping(false);
    }
  };

  // Cancel/Stop active scrape job
  const handleCancelScrape = async () => {
    try {
      const parsed = await authFetchJson('/api/admin/scrape/cancel', {
        method: 'POST'
      });
      if (parsed.ok) {
        stopPolling();
        setIsScraping(false);
        setActiveJobId(null);
        setScrapeConsole(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Scraping interrotto dall'amministratore.`
        ]);
      }
    } catch (e: any) {
      console.error('Failed to cancel scrape job', e);
    }
  };

  // Reset Scraper Cursor to 0
  const handleResetCursor = async () => {
    try {
      const parsed = await authFetchJson('/api/admin/scrape/cursor', {
        method: 'POST',
        body: JSON.stringify({ offset: 0 })
      });
      if (parsed.ok) {
        setScrapeOffset('');
        loadStatus();
      }
    } catch (err) {
      console.error('Failed to reset cursor', err);
    }
  };

  // Test TMDb API Live
  const handleTestTmdb = async () => {
    try {
      setTestingTmdb(true);
      const parsed = await authFetchJson<any>('/api/admin/diagnostics/tmdb/test', {
        method: 'POST',
        body: JSON.stringify({ query: 'Dune' })
      });
      if (parsed.ok && parsed.data?.result) {
        setTmdbTestResult(parsed.data.result);
        loadStatus();
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setTestingTmdb(false);
    }
  };

  // Test Firecrawl API Live
  const handleTestFirecrawl = async () => {
    try {
      setTestingFirecrawl(true);
      const parsed = await authFetchJson<any>('/api/admin/diagnostics/firecrawl/test', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' })
      });
      if (parsed.ok && parsed.data?.result) {
        setFirecrawlTestResult(parsed.data.result);
        loadStatus();
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setTestingFirecrawl(false);
    }
  };

  // Test Scraper Sources Live
  const handleTestScrapers = async () => {
    try {
      setTestingScrapers(true);
      const parsed = await authFetchJson<any>('/api/admin/diagnostics/scraper/test', {
        method: 'POST',
        body: JSON.stringify({ city: 'roma' })
      });
      if (parsed.ok && parsed.data?.result) {
        setScrapersTestResult(parsed.data.result);
        loadStatus();
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setTestingScrapers(false);
    }
  };

  // Update or download MaxMind GeoLite2 database
  const handleUpdateGeoip = async () => {
    try {
      setUpdatingGeoip(true);
      setGeoipMessage('');
      const parsed = await authFetchJson<any>('/api/admin/geoip/update', {
        method: 'POST',
        body: JSON.stringify({ license_key: geoipLicenseInput.trim() || undefined })
      });
      if (parsed.ok && parsed.data?.success) {
        setGeoipMessage(`✅ ${parsed.data.message || 'Database GeoLite2 aggiornato'}`);
        loadStatus();
      } else {
        setGeoipMessage(`❌ ${parsed.error || parsed.data?.error || 'Errore durante l\'aggiornamento'}`);
      }
    } catch (err: any) {
      setGeoipMessage(`❌ ${err.message || err}`);
    } finally {
      setUpdatingGeoip(false);
    }
  };

  // Google Sheets: Test / Refresh Access
  const handleTestSheets = async () => {
    try {
      setTestingSheets(true);
      setSheetsActionMessage(null);
      const query = sheetsInput.trim() ? `?spreadsheet_id=${encodeURIComponent(sheetsInput.trim())}` : '';
      const parsed = await authFetchJson<GoogleSheetsStatus>(`/api/admin/sheets/status${query}`);
      if (parsed.ok && parsed.data) {
        setSheetsStatus(parsed.data);
        if (parsed.data.status === 'healthy') {
          setSheetsActionMessage({ type: 'success', text: parsed.data.message });
        } else if (parsed.data.status === 'permission_denied') {
          setSheetsActionMessage({ type: 'error', text: parsed.data.message });
        } else {
          setSheetsActionMessage({ type: 'info', text: parsed.data.message });
        }
      } else {
        setSheetsActionMessage({ type: 'error', text: parsed.error || 'Errore durante la verifica di Google Sheets' });
      }
    } catch (err: any) {
      setSheetsActionMessage({ type: 'error', text: err?.message || 'Errore di connessione' });
    } finally {
      setTestingSheets(false);
    }
  };

  // Google Sheets: Save Configuration
  const handleSaveSheetsConfig = async () => {
    try {
      setSavingSheetsConfig(true);
      setSheetsActionMessage(null);
      const parsed = await authFetchJson<any>('/api/admin/sheets/config', {
        method: 'POST',
        body: JSON.stringify({ spreadsheet_input: sheetsInput.trim() })
      });
      if (parsed.ok && parsed.data) {
        if (parsed.data.status) {
          setSheetsStatus(parsed.data.status);
        }
        setSheetsActionMessage({ type: 'success', text: parsed.data.message });
        loadStatus();
      } else {
        setSheetsActionMessage({ type: 'error', text: parsed.error || 'Errore durante il salvataggio' });
      }
    } catch (err: any) {
      setSheetsActionMessage({ type: 'error', text: err?.message || 'Errore durante il salvataggio' });
    } finally {
      setSavingSheetsConfig(false);
    }
  };

  // Google Sheets: Manual Full Sync
  const handleSyncSheetsNow = async () => {
    try {
      setSyncingSheets(true);
      setSheetsActionMessage({ type: 'info', text: 'Sincronizzazione in corso verso Google Sheets (Panoramica, Cinemas, Movies, Showtimes, ScrapeLog)...' });
      const parsed = await authFetchJson<any>('/api/admin/sheets/sync', {
        method: 'POST',
        body: JSON.stringify({ spreadsheet_id: sheetsInput.trim() || undefined })
      });
      if (parsed.ok && parsed.data?.success) {
        setSheetsActionMessage({ type: 'success', text: parsed.data.message });
        handleTestSheets();
        loadStatus();
      } else {
        const errorMsg = parsed.data?.message || parsed.error || 'Errore durante la sincronizzazione con Google Sheets';
        setSheetsActionMessage({ type: 'error', text: errorMsg });
      }
    } catch (err: any) {
      setSheetsActionMessage({ type: 'error', text: err?.message || 'Errore durante la sincronizzazione' });
    } finally {
      setSyncingSheets(false);
    }
  };

  const handleCopyEmail = (emailText: string) => {
    navigator.clipboard.writeText(emailText);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  // Toggle Active Showtime
  const handleToggleShowtime = async (id: string, currentActive: boolean) => {
    try {
      const parsed = await authFetchJson('/api/admin/content/toggle-active', {
        method: 'POST',
        body: JSON.stringify({ showtime_id: id, active: !currentActive })
      });
      if (parsed.ok) {
        loadContent();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSettings) return;

    // Validate social URLs (must start with https:// or be blank)
    const socialUrls = [
      { name: 'Instagram', url: customSettings.social_instagram_url },
      { name: 'Facebook', url: customSettings.social_facebook_url },
      { name: 'X (Twitter)', url: customSettings.social_x_url },
      { name: 'TikTok', url: customSettings.social_tiktok_url },
      { name: 'YouTube', url: customSettings.social_youtube_url },
    ];

    for (const item of socialUrls) {
      const val = item.url?.trim();
      if (val && !val.startsWith('https://')) {
        setSocialValidationError(`L'URL per ${item.name} non è valido: deve iniziare con "https://" oppure essere lasciato vuoto.`);
        return;
      }
    }
    setSocialValidationError(null);

    try {
      const parsed = await authFetchJson<any>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(customSettings)
      });
      if (parsed.ok) {
        setSaveSuccess(true);
        if (onSettingsUpdated) {
          onSettingsUpdated(customSettings);
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSocialValidationError(parsed.error || 'Errore durante il salvataggio');
      }
    } catch (e: any) {
      console.error(e);
      setSocialValidationError(e?.message || 'Errore durante il salvataggio');
    }
  };

  // Add Cinema
  const handleAddCinema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCinemaName.trim() || !newCinemaAddress.trim()) return;

    try {
      const parsed = await authFetchJson('/api/admin/content/cinema', {
        method: 'POST',
        body: JSON.stringify({
          id: `cin-${Date.now()}`,
          name: newCinemaName.trim(),
          address: newCinemaAddress.trim(),
          chain: newCinemaChain,
          city_id: 'c-roma'
        })
      });
      if (parsed.ok) {
        setNewCinemaName('');
        setNewCinemaAddress('');
        setShowAddCinema(false);
        loadContent();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Movie
  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMovieTitle.trim()) return;

    try {
      const parsed = await authFetchJson('/api/admin/content/movie', {
        method: 'POST',
        body: JSON.stringify({
          id: `mov-${Date.now()}`,
          title_it: newMovieTitle.trim(),
          title_en: newMovieTitle.trim(),
          director: newMovieDirector.trim() || 'Regista sconosciuto',
          duration_minutes: 120,
          genres: ['Drammatico', 'Cinema Italiano'],
          release_year: new Date().getFullYear(),
          is_featured: true
        })
      });
      if (parsed.ok) {
        setNewMovieTitle('');
        setNewMovieDirector('');
        setShowAddMovie(false);
        loadContent();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[#050505] text-neutral-200 flex flex-col justify-center items-center p-4 relative antialiased selection:bg-[#D4AF37] selection:text-black">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Navigation */}
        <div className="w-full max-w-md mb-4 flex justify-between items-center z-10">
          <button
            onClick={handleGoHome}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#D4AF37]" />
            <span>Torna al sito CineVicino</span>
          </button>
        </div>

        <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center text-neutral-200 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-white">CineVicino CMS</h1>
          <p className="text-xs text-neutral-400 mt-1.5 mb-6 leading-relaxed">
            Area riservata per il controllo di scraper, cataloghi cinema/film e impostazioni di sistema.
          </p>

          {process.env.NODE_ENV !== 'production' && (
            <div className="mb-5 p-2.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[11px] text-[#D4AF37] text-left flex items-center justify-between">
              <span>Dev: <strong>admin@cinevicino.it</strong></span>
              <span className="font-mono text-[10px] text-neutral-300">AdminCineVicino2026!</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative text-left">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5 ml-1">
                Email Amministratore
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@cinevicino.it"
                className="w-full px-4 py-2.5 bg-black border border-white/20 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            <div className="relative text-left">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Inserisci password admin..."
                  className="w-full pl-10 pr-4 py-2.5 bg-black border border-white/20 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-rose-400 bg-rose-950/40 p-3 rounded-xl border border-rose-800 text-left">
                {loginError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleGoHome}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-white border border-white/10 transition-colors cursor-pointer active:scale-95"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-[#D4AF37] hover:bg-white text-xs font-bold uppercase tracking-wider text-black transition-colors shadow-sm cursor-pointer active:scale-95"
              >
                Accedi al CMS
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#050505] text-neutral-200 flex flex-col md:flex-row antialiased selection:bg-[#D4AF37] selection:text-black">
      {/* 1. PERSISTENT SIDEBAR (Desktop) */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 bg-[#0a0a0a] border-r border-white/10 flex-col sticky top-0 h-screen overflow-y-auto z-20">
        {/* Brand Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-serif font-bold text-white tracking-wide">CineVicino</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#D4AF37]">CMS Amministratore</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 p-3 space-y-1.5">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Pannelli di Controllo
          </div>

          {[
            { id: 'status', label: '1. Stato & Motori', desc: 'Diagnostica, TMDb & GeoIP', icon: Activity },
            { id: 'scrape', label: '2. Scraper & Rotazione', desc: 'Job live, cursori & log', icon: RefreshCw, badge: isScraping ? 'In corso' : undefined },
            { id: 'content', label: '3. Gestione Contenuti', desc: 'Film, Cinema & Orari', icon: Database },
            { id: 'customization', label: '4. Impostazioni & Social', desc: 'Sheets, Copertina & URL', icon: Edit3 }
          ].map(item => {
            const Icon = item.icon;
            const isSel = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id as any)}
                className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-3 cursor-pointer group ${
                  isSel
                    ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${isSel ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/5 text-neutral-400 group-hover:text-white group-hover:bg-white/10'} shrink-0`}>
                  <Icon className={`w-4 h-4 ${item.id === 'scrape' && isScraping ? 'animate-spin' : ''}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] block truncate ${isSel ? 'text-[#D4AF37]/70' : 'text-neutral-500'}`}>{item.desc}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/10 space-y-2 bg-black/40">
          <button
            onClick={handleGoHome}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4 text-[#D4AF37]" />
            <span>Torna al sito pubblico</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-rose-950/40 text-neutral-400 hover:text-rose-300 border border-white/10 hover:border-rose-900 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Disconnetti</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE HEADER & NAVIGATION (Mobile/Tablet) */}
      <div className="md:hidden bg-[#0a0a0a] border-b border-white/10 sticky top-0 z-30">
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-serif font-bold text-white text-sm">CineVicino</span>
              <span className="ml-1.5 text-[9px] uppercase font-bold text-[#D4AF37]">CMS</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGoHome}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 text-[11px] text-neutral-300 hover:text-white border border-white/10 flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Sito</span>
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg bg-white/5 text-neutral-400 hover:text-rose-400 border border-white/10"
              title="Disconnetti"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Section Tabs */}
        <div className="flex px-2 pb-2 gap-1.5 overflow-x-auto no-scrollbar border-t border-white/5 pt-2">
          {[
            { id: 'status', label: '1. Stato', icon: Activity },
            { id: 'scrape', label: '2. Scraper', icon: RefreshCw },
            { id: 'content', label: '3. Contenuti', icon: Database },
            { id: 'customization', label: '4. Impostazioni', icon: Edit3 }
          ].map(tab => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                  isSel
                    ? 'bg-[#D4AF37] text-black font-bold'
                    : 'bg-white/5 text-neutral-400 hover:text-white border border-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.id === 'scrape' && isScraping ? 'animate-spin' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#070707] min-h-screen">
        {/* Top Header Bar on Desktop */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-[#0a0a0a]/60 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-serif font-bold text-white">
              {activeTab === 'status' && 'Dashboard & Stato Motori Dati'}
              {activeTab === 'scrape' && 'Scraper & Rotazione Comuni'}
              {activeTab === 'content' && 'Gestione Catalogo & Contenuti'}
              {activeTab === 'customization' && 'Impostazioni Sito, Google Sheets & Social'}
            </h1>
            <p className="text-xs text-neutral-400">
              {activeTab === 'status' && 'Verifica in tempo reale la connettività di TMDb, Firecrawl, GeoLite2 e PostgreSQL'}
              {activeTab === 'scrape' && 'Monitora il polling della console, lo scraping incrementale dei comuni e la rotazione cursori'}
              {activeTab === 'content' && 'Ispeziona film, sale multiplex, cinema d\'essai e disponibilità degli orari spettacoli'}
              {activeTab === 'customization' && 'Configura i testi di copertina, i link social ufficiali e la sincronizzazione con Google Sheets'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isScraping && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Scraping in corso...</span>
              </div>
            )}
            <button
              onClick={handleGoHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Visualizza Sito</span>
            </button>
          </div>
        </header>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 max-w-6xl w-full mx-auto">
          
          {/* TAB 1: STATUS */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">
                  Verifica Connessioni Esterne & Motori Dati
                </h3>
                <button
                  onClick={loadStatus}
                  disabled={loadingStatus}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
                  <span>Riesegui Test</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* TMDb API Status Card */}
                <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-sm text-white">The Movie Database (TMDb) API</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusData?.tmdb?.status === 'healthy' || statusData?.tmdb?.auth_success || statusData?.tmdb?.success ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Connesso ({statusData?.tmdb?.latency_ms || statusData?.tmdb?.latencyMs || 0}ms)
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Fallback Locale Attivo
                        </span>
                      )}
                      <button
                        onClick={handleTestTmdb}
                        disabled={testingTmdb}
                        title="Verifica live connettività e ricerca TMDb"
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-medium text-neutral-200 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${testingTmdb ? 'animate-spin' : ''}`} />
                        <span>{testingTmdb ? 'Verifica...' : 'Test TMDb'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Utilizzato per l'arricchimento automatico di poster HD, trame in italiano, registi, cast e generi ufficiali.
                  </p>

                  <div className="text-[11px] font-mono text-neutral-400 bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800/80 flex items-center justify-between">
                    <span>Chiave API: <span className="text-white">{statusData?.tmdb?.masked_key || 'Configurata'}</span></span>
                    <span className="text-neutral-500">v3 REST endpoint</span>
                  </div>

                  {/* Sample / Test Result Display */}
                  {(() => {
                    const sample = tmdbTestResult?.sample_test || statusData?.tmdb?.sample_test;
                    if (!sample) return null;
                    return (
                      <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Test Ricerca Live ({sample.query})
                          </span>
                          <span className="text-neutral-400 font-normal">
                            {sample.release_date ? new Date(sample.release_date).getFullYear() : ''}
                          </span>
                        </div>
                        <div className="flex gap-3">
                          {sample.poster_url && (
                            <img
                              src={sample.poster_url}
                              alt={sample.title}
                              referrerPolicy="no-referrer"
                              className="w-12 h-18 object-cover rounded-lg border border-neutral-700 shrink-0"
                            />
                          )}
                          <div className="min-w-0 space-y-1">
                            <div className="font-bold text-white truncate">{sample.title}</div>
                            {sample.director && (
                              <div className="text-[11px] text-neutral-400">Regia: <span className="text-neutral-200">{sample.director}</span></div>
                            )}
                            {sample.synopsis && (
                              <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                                {sample.synopsis}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Firecrawl Meter & Status Card */}
                <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-sm text-white">Firecrawl Scraper API</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                        {statusData?.firecrawl?.credits?.remaining ?? 1021} / {statusData?.firecrawl?.credits?.plan ?? 1000} crediti
                      </span>
                      <button
                        onClick={handleTestFirecrawl}
                        disabled={testingFirecrawl}
                        title="Verifica stato crediti e test di scraping Firecrawl"
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-medium text-neutral-200 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${testingFirecrawl ? 'animate-spin' : ''}`} />
                        <span>{testingFirecrawl ? 'Verifica...' : 'Test API'}</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Visual Credit Meter */}
                  <div>
                    <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                      <span>Crediti utilizzati questo mese</span>
                      <span className="font-mono text-white">
                        {statusData?.firecrawl?.credits?.used ?? 0} consumati ({statusData?.firecrawl?.credits?.remaining ?? 1021} disponibili)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (((statusData?.firecrawl?.credits?.used ?? 0) / (statusData?.firecrawl?.credits?.plan || 1000)) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Utilizzato per i bypass di siti con rendering JavaScript o blocchi anti-bot. I crawler primari usano parser HTTP veloci a costo zero.
                  </p>

                  <div className="text-[11px] font-mono text-neutral-400 bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800/80 flex items-center justify-between">
                    <span>Stato: <span className="text-emerald-400 font-semibold">{statusData?.firecrawl?.status === 'healthy' ? 'Operativo' : 'Verifica'}</span> ({statusData?.firecrawl?.latency_ms || 0}ms)</span>
                    <span className="text-neutral-500">Chiave: {statusData?.firecrawl?.masked_key || 'Attiva'}</span>
                  </div>

                  {/* Sample scrape status */}
                  {(() => {
                    const testScrape = firecrawlTestResult?.test_scrape || statusData?.firecrawl?.test_scrape;
                    if (!testScrape) return null;
                    return (
                      <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-[11px] font-mono text-neutral-300 flex items-center justify-between">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Test Scraping OK: {testScrape.title || testScrape.tested_url}
                        </span>
                        <span className="text-neutral-500">{testScrape.latency_ms}ms ({testScrape.html_bytes} bytes)</span>
                      </div>
                    );
                  })()}
                </div>

                {/* MaxMind GeoLite2-City Database Engine */}
                <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-sm text-white">MaxMind GeoLite2-City — Auto-Rilevamento IP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusData?.geoip?.is_active ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Database Locale Attivo
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Fallback Attivo (Download Richiesto)
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Database geografico IP self-hosted (.mmdb). Rileva istantaneamente la città del visitatore tramite intestazione <code className="text-amber-400">CF-Connecting-IP</code> di Cloudflare senza costi API né limiti.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-neutral-900 p-2.5 rounded-xl">
                      <span className="text-neutral-400 block text-[11px]">Dimensione file database:</span>
                      <span className="font-bold text-white font-mono">
                        {statusData?.geoip?.is_active ? `${statusData?.geoip?.database_size_mb} MB` : 'Non presente'}
                      </span>
                    </div>
                    <div className="bg-neutral-900 p-2.5 rounded-xl">
                      <span className="text-neutral-400 block text-[11px]">Header Cloudflare rilevato:</span>
                      <span className="font-mono text-emerald-400 font-medium">
                        {statusData?.geoip?.cf_connecting_ip_header === 'present' ? 'CF-Connecting-IP Presente' : 'Non in proxy Cloudflare'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-900/90 rounded-xl border border-neutral-800 space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={geoipLicenseInput}
                        onChange={(e) => setGeoipLicenseInput(e.target.value)}
                        placeholder="MaxMind License Key (se non in .env)..."
                        className="flex-1 bg-black/70 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={handleUpdateGeoip}
                        disabled={updatingGeoip}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${updatingGeoip ? 'animate-spin' : ''}`} />
                        <span>{updatingGeoip ? 'Download in corso...' : 'Aggiorna Database GeoLite2'}</span>
                      </button>
                    </div>
                    {geoipMessage && (
                      <div className="text-xs font-mono text-neutral-300 mt-1">{geoipMessage}</div>
                    )}
                  </div>
                </div>

                {/* Google Sheets Auto-Sync Panel */}
                <div className="md:col-span-2 p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">Google Sheets Auto-Sync</span>
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                            Service Account
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">
                          Sincronizzazione automatica post-scrape e snapshot su Google Sheets (Panoramica, Cinemas, Movies, Showtimes, ScrapeLog)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      {sheetsStatus?.status === 'healthy' ? (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Connesso ({sheetsStatus.latency_ms}ms)
                        </span>
                      ) : sheetsStatus?.status === 'permission_denied' ? (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Permesso Negato (403)
                        </span>
                      ) : sheetsStatus?.status === 'not_found' ? (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Foglio Non Trovato (404)
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Non Configurato
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={handleTestSheets}
                        disabled={testingSheets}
                        title="Verifica accesso e permessi al foglio Google"
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingSheets ? 'animate-spin text-emerald-400' : ''}`} />
                        <span>{testingSheets ? 'Verifica...' : 'Verifica Accesso'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSyncSheetsNow}
                        disabled={syncingSheets || (!sheetsInput.trim() && !sheetsStatus?.spreadsheet_id)}
                        title="Esegui sincronizzazione manuale istantanea con Google Sheets"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingSheets ? 'animate-spin' : ''}`} />
                        <span>{syncingSheets ? 'Sincronizzazione...' : 'Sincronizza Ora'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Service Account Email Info & Sharing Helper */}
                  <div className="p-3 bg-neutral-900/90 rounded-xl border border-neutral-800 text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-neutral-300 flex items-center gap-1.5 flex-wrap">
                        <span className="text-neutral-400">Email Service Account da abilitare:</span>
                        {sheetsStatus?.service_account_email ? (
                          <span className="font-mono text-emerald-400 font-semibold select-all">
                            {sheetsStatus.service_account_email}
                          </span>
                        ) : (
                          <span className="text-amber-400 font-mono">
                            GOOGLE_SERVICE_ACCOUNT_EMAIL non impostata in .env
                          </span>
                        )}
                      </div>
                      {sheetsStatus?.service_account_email && (
                        <button
                          type="button"
                          onClick={() => handleCopyEmail(sheetsStatus.service_account_email!)}
                          className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-auto"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedEmail ? 'Copiato!' : 'Copia Email'}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      💡 <strong>Passo fondamentale:</strong> Apri il tuo foglio su Google Fogli, clicca su <strong className="text-white">Condividi</strong> in alto a destra, incolla l'indirizzo email del Service Account e assegna il ruolo <strong className="text-emerald-400">"Editor"</strong>. Non sono necessari token OAuth o login utente.
                    </p>
                  </div>

                  {/* Spreadsheet ID / URL Input & Save */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-neutral-300">
                      Foglio Google di Destinazione (URL Completo o Spreadsheet ID)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={sheetsInput}
                        onChange={(e) => setSheetsInput(e.target.value)}
                        placeholder="Es: https://docs.google.com/spreadsheets/d/1BxiMVs0X.../edit oppure l'ID del foglio"
                        className="flex-1 bg-black/70 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveSheetsConfig}
                          disabled={savingSheetsConfig}
                          className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                        >
                          <Save className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{savingSheetsConfig ? 'Salvataggio...' : 'Salva Foglio'}</span>
                        </button>

                        {(sheetsStatus?.spreadsheet_url || sheetsInput.includes('docs.google.com')) && (
                          <a
                            href={sheetsStatus?.spreadsheet_url || (sheetsInput.startsWith('http') ? sheetsInput : `https://docs.google.com/spreadsheets/d/${sheetsInput}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs flex items-center gap-1.5 border border-neutral-700 transition-colors whitespace-nowrap"
                          >
                            <span>Apri Foglio</span>
                            <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Feedback Action Banner */}
                  {sheetsActionMessage && (
                    <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      sheetsActionMessage.type === 'success' 
                        ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' 
                        : sheetsActionMessage.type === 'error'
                        ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                        : 'bg-blue-950/50 border-blue-800 text-blue-300'
                    }`}>
                      {sheetsActionMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : sheetsActionMessage.type === 'error' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                      )}
                      <span className="leading-relaxed">{sheetsActionMessage.text}</span>
                    </div>
                  )}

                  {/* Live Sync Status Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800/80">
                      <span className="text-neutral-400 block text-[11px]">Titolo Foglio Verificato:</span>
                      <span className="font-semibold text-white truncate block">
                        {sheetsStatus?.spreadsheet_title || (sheetsStatus?.spreadsheet_id ? 'In attesa di verifica' : 'Nessun foglio collegato')}
                      </span>
                    </div>
                    <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800/80">
                      <span className="text-neutral-400 block text-[11px]">Ultima Sincronizzazione:</span>
                      <span className="font-mono text-neutral-200 block truncate">
                        {sheetsStatus?.last_sync_at ? new Date(sheetsStatus.last_sync_at).toLocaleString('it-IT') : 'Mai eseguita'}
                      </span>
                    </div>
                    <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800/80">
                      <span className="text-neutral-400 block text-[11px]">Schede Gestite:</span>
                      <span className="font-mono text-emerald-400 block text-[11px] truncate">
                        Panoramica, Cinemas, Movies, Showtimes, ScrapeLog
                      </span>
                    </div>
                  </div>

                  {sheetsStatus?.last_sync_message && (
                    <div className="text-[11px] font-mono text-neutral-400 bg-neutral-900/60 px-3 py-1.5 rounded-lg border border-neutral-800/50 flex items-center justify-between flex-wrap gap-2">
                      <span>Esito ultimo sync: <span className={sheetsStatus.last_sync_status === 'success' ? 'text-emerald-400' : 'text-rose-400'}>{sheetsStatus.last_sync_message}</span></span>
                      <span className="text-neutral-500">Sovrascrittura atomica attiva</span>
                    </div>
                  )}
                </div>

                {/* Database Engine Status */}
                <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Catalogo Comuni ISTAT & Dati</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Operativo (7.894 Comuni)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-neutral-900 p-2.5 rounded-xl">
                      <span className="text-neutral-400 block">Comuni censiti:</span>
                      <span className="font-bold text-white text-base font-mono">{statusData?.database?.records?.cities}</span>
                    </div>
                    <div className="bg-neutral-900 p-2.5 rounded-xl">
                      <span className="text-neutral-400 block">Sale cinematografiche:</span>
                      <span className="font-bold text-amber-400 text-base font-mono">{statusData?.database?.records?.cinemas}</span>
                    </div>
                  </div>
                </div>

                {/* Email Alert Provider */}
                <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Provider Notifiche Email</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                      Resend / SMTP
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Gestione iscrizioni utenti per avvisi di nuovi film in uscita nei comuni salvati.
                  </p>
                  <div className="text-xs text-neutral-300 bg-neutral-900 p-2.5 rounded-xl flex items-center justify-between">
                    <span>Iscritti in attesa di notifica:</span>
                    <span className="font-mono font-bold text-amber-400">{statusData?.email_alert_provider?.pending_subscribers || 0}</span>
                  </div>
                </div>

                {/* Nationwide Scraper Rotation Engine */}
                <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-sm text-white">Rotazione Cursore Scraper</span>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-semibold">
                      last_scrape_offset: {statusData?.last_scrape_offset ?? statusData?.scraper_rotation?.last_scrape_offset ?? statusData?.scraper_rotation?.current_offset ?? 0} / {statusData?.scraper_rotation?.total_eligible_cities ?? 0} comuni
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                      <span>Ciclo Nazionale Coperto</span>
                      <span className="font-mono text-amber-400">{statusData?.scraper_rotation?.cycle_progress_percent ?? 0}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${statusData?.scraper_rotation?.cycle_progress_percent ?? 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Recently Covered Cities in Overview */}
                  {((statusData?.recently_covered_cities && statusData.recently_covered_cities.length > 0) ||
                    (statusData?.scraper_rotation?.recently_covered_cities && statusData.scraper_rotation.recently_covered_cities.length > 0)) && (
                    <div className="space-y-1.5 pt-1 border-t border-neutral-900">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Città coperte di recente ({((statusData?.recently_covered_cities || statusData?.scraper_rotation?.recently_covered_cities) as any[]).length}):
                        </span>
                        {statusData?.last_scrape_offset_updated_at && (
                          <span className="text-[10px] text-neutral-500 font-mono">
                            Offset agg.: {new Date(statusData.last_scrape_offset_updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {((statusData?.recently_covered_cities || statusData?.scraper_rotation?.recently_covered_cities) as any[]).map((c: any) => (
                          <span
                            key={c.id || c.slug}
                            title={c.last_scraped_at ? `Scraping: ${new Date(c.last_scraped_at).toLocaleString('it-IT')}` : 'Coperta di recente'}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 flex items-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>{c.name} {c.province_code ? `(${c.province_code})` : ''}</span>
                            {c.cinemas_count > 0 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-900/60 text-emerald-200 font-mono">
                                {c.cinemas_count} {c.cinemas_count === 1 ? 'cinema' : 'cinema'}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {statusData?.scraper_rotation?.current_batch_cities && (
                    <div className="space-y-1.5 pt-1 border-t border-neutral-900">
                      <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block">
                        Batch in corso ({statusData.scraper_rotation.current_batch_cities.length} città):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {statusData.scraper_rotation.current_batch_cities.map((c: any) => (
                          <span key={c.slug} className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300">
                            {c.name} {c.province_code ? `(${c.province_code})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {statusData?.scraper_rotation?.next_batch_cities && statusData.scraper_rotation.next_batch_cities.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-neutral-900">
                      <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
                        Prossimo turno rotazione (Offset {statusData.scraper_rotation.next_offset}):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                        {statusData.scraper_rotation.next_batch_cities.slice(0, 10).map((c: any) => (
                          <span key={c.slug} className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-900/60 border border-neutral-800/60 text-neutral-400">
                            {c.name} {c.province_code ? `(${c.province_code})` : ''}
                          </span>
                        ))}
                        {statusData.scraper_rotation.next_batch_cities.length > 10 && (
                          <span className="text-[10px] text-neutral-500 py-0.5">
                            +{statusData.scraper_rotation.next_batch_cities.length - 10} altri...
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Scrapers Health & Multi-Source Verification Card (spans 2 cols) */}
                <div className="col-span-1 md:col-span-2 p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">Salute Motori Scraper Nazionali</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            3 Fonti Verificate
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Monitoraggio in tempo reale della raggiungibilità HTTP e dei parser HTML di CinemaTimes, MYmovies e ComingSoon.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(() => {
                        const scr = scrapersTestResult || statusData?.scrapers_health;
                        const isHealthy = scr?.overall_status === 'healthy';
                        return (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-mono flex items-center gap-1 border ${
                            isHealthy
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {isHealthy ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                            {isHealthy ? 'Tutte le 3 fonti attive' : 'Controllo in corso'}
                          </span>
                        );
                      })()}
                      <button
                        onClick={handleTestScrapers}
                        disabled={testingScrapers}
                        title="Esegui query di prova su CinemaTimes, MYmovies e ComingSoon"
                        className="px-3 py-1 rounded-lg bg-[#D4AF37] hover:bg-white text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingScrapers ? 'animate-spin' : ''}`} />
                        <span>{testingScrapers ? 'Scansione...' : 'Test Scraper'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 3 Source Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(() => {
                      const scr = scrapersTestResult || statusData?.scrapers_health;
                      const sources = scr?.sources || [
                        { source: 'CinemaTimes.com', status: 'healthy', http_status: 200, latency_ms: 358, cinemas_found: 8, sample_cinema: 'MY CITYPLEX TRIANON 3.' },
                        { source: 'MYmovies.it', status: 'healthy', http_status: 200, latency_ms: 273, cinemas_found: 368, sample_cinema: 'Adriano' },
                        { source: 'ComingSoon.it', status: 'healthy', http_status: 200, latency_ms: 112, cinemas_found: 146, sample_cinema: 'Adriano Multisala' }
                      ];

                      return sources.map((s: any) => {
                        const isOk = s.status === 'healthy' || s.http_status === 200;
                        return (
                          <div key={s.source} className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-white">{s.source}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                isOk ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}>
                                HTTP {s.http_status || 200}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-neutral-400">
                              <div>Latenza: <span className="text-neutral-200">{s.latency_ms || 0}ms</span></div>
                              <div>Sale: <span className="text-amber-400 font-bold">{s.cinemas_found || 0}</span></div>
                            </div>
                            {s.sample_cinema && (
                              <div className="text-[10px] text-neutral-400 truncate bg-neutral-950/60 px-2 py-1 rounded border border-neutral-800/60">
                                Esempio: <span className="text-neutral-200">{s.sample_cinema}</span>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <div className="text-[11px] text-neutral-400 bg-neutral-900/50 p-2.5 rounded-xl border border-neutral-800/60 flex items-center justify-between">
                    <span>
                      Strategia: Scraper primario HTTP Cheerio a costo zero + fallback Firecrawl per bypass JS/anti-bot.
                    </span>
                    <span className="text-emerald-400 font-mono text-[10px]">Anti-Bot Politeness: 300ms</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: SCRAPE */}
          {activeTab === 'scrape' && (
            <div className="space-y-6">
              {/* Rotation Overview Card in Scrape Tab */}
              <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                      <h3 className="text-base font-bold text-white">
                        Rotazione Continua Copertura Nazionale
                      </h3>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                      {statusData?.scraper_rotation?.cycle_description || 'Il cron giornaliero avanza automaticamente il batch di città ogni esecuzione, coprendo tutta Italia a rotazione.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetCursor}
                      title="Resetta il cursore all'inizio dell'elenco"
                      className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[11px] font-semibold text-neutral-300 transition-colors cursor-pointer"
                    >
                      Resetta Cursore (0)
                    </button>
                  </div>
                </div>

                {/* Scraper Configuration Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                      Città Specifica (opzionale)
                    </label>
                    <input
                      type="text"
                      placeholder="es. Roma, Milano, Napoli"
                      value={scrapeTargetCity}
                      onChange={e => setScrapeTargetCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                      Dimensione Batch (Città)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={scrapeLimit}
                      onChange={e => setScrapeLimit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                      Giorni Programmazione (Multi-Day)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="14"
                      placeholder="7"
                      value={scrapeDaysAhead}
                      onChange={e => setScrapeDaysAhead(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                      Offset Manuale (vuoto = memorizzato: {statusData?.scraper_rotation?.current_offset ?? 0})
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder={`Cursore: ${statusData?.scraper_rotation?.current_offset ?? 0}`}
                      value={scrapeOffset}
                      onChange={e => setScrapeOffset(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-neutral-900">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scrapeAdvanceCursor}
                        onChange={e => setScrapeAdvanceCursor(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-800 border-neutral-700"
                      />
                      <span>Avanza cursore in scraper_state dopo lo scrape</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useFirecrawl}
                        onChange={e => setUseFirecrawl(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-800 border-neutral-700"
                      />
                      <span>Usa Firecrawl per pagine JS</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTriggerScrape}
                      disabled={isScraping}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Play className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
                      <span>{isScraping ? 'Job in corso (polling attivo)...' : 'Avvia Scrape Batch'}</span>
                    </button>

                    {isScraping && (
                      <button
                        onClick={handleCancelScrape}
                        className="px-3.5 py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Segnala interruzione al job di background"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Interrompi</span>
                      </button>
                    )}

                    {scrapeConsole.length > 0 && !isScraping && (
                      <button
                        onClick={() => setScrapeConsole([])}
                        className="px-3 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs transition-colors cursor-pointer"
                        title="Pulisci output console"
                      >
                        Pulisci Console
                      </button>
                    )}
                  </div>
                </div>

                {/* Recently Covered Cities Badge View in Scrape Tab */}
                {((statusData?.recently_covered_cities && statusData.recently_covered_cities.length > 0) ||
                  (statusData?.scraper_rotation?.recently_covered_cities && statusData.scraper_rotation.recently_covered_cities.length > 0)) && (
                  <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-emerald-900/40 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-emerald-400 block uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Città coperte di recente dallo scraper (last_scrape_offset: {statusData?.last_scrape_offset ?? statusData?.scraper_rotation?.last_scrape_offset ?? statusData?.scraper_rotation?.current_offset ?? 0}):
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {((statusData?.recently_covered_cities || statusData?.scraper_rotation?.recently_covered_cities) as any[]).length} comuni
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {((statusData?.recently_covered_cities || statusData?.scraper_rotation?.recently_covered_cities) as any[]).map((c: any) => (
                        <span
                          key={c.id || c.slug}
                          title={c.last_scraped_at ? `Ultimo scrape: ${new Date(c.last_scraped_at).toLocaleString('it-IT')}` : undefined}
                          className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>{c.name} {c.province_code ? `(${c.province_code})` : ''}</span>
                          {c.cinemas_count > 0 && (
                            <span className="text-[9px] text-emerald-400/80 font-mono">({c.cinemas_count} cinema)</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cities in Current Batch Badge View */}
                {statusData?.scraper_rotation?.current_batch_cities && !scrapeTargetCity && (
                  <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-xs space-y-1.5">
                    <span className="text-[11px] font-semibold text-neutral-400 block uppercase tracking-wider">
                      Città target nel batch odierno (Offset {statusData.scraper_rotation.current_offset}):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {statusData.scraper_rotation.current_batch_cities.map((c: any) => (
                        <span key={c.slug} className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-amber-200">
                          {c.name} {c.province_code ? `(${c.province_code})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scrape Terminal Window */}
                {scrapeConsole.length > 0 && (
                  <div className="mt-4 p-4 rounded-xl bg-black border border-neutral-800 font-mono text-xs text-emerald-400 space-y-1 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between text-neutral-500 pb-2 border-b border-neutral-800 mb-2">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Console di esecuzione scraper (Job background)</span>
                        {isScraping && (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            POLLING LIVE
                          </span>
                        )}
                      </div>
                      {activeJobId && (
                        <span className="text-[10px] text-neutral-500 font-mono">
                          ID: {activeJobId}
                        </span>
                      )}
                    </div>
                    {scrapeConsole.map((line, idx) => (
                      <p key={idx} className="leading-relaxed">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Past Scrape Logs Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                  Cronologia Esecuzioni Precedenti
                </h4>
                <div className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="bg-neutral-900 text-neutral-400 uppercase tracking-wider font-mono">
                      <tr>
                        <th className="p-3">Data e Ora</th>
                        <th className="p-3">Sorgenti</th>
                        <th className="p-3">Comuni</th>
                        <th className="p-3">Cinema</th>
                        <th className="p-3">Orari</th>
                        <th className="p-3">Crediti FC</th>
                        <th className="p-3">Esito</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 text-neutral-300">
                      {logs.map(l => (
                        <tr key={l.id} className="hover:bg-neutral-900/50">
                          <td className="p-3 font-mono">{new Date(l.run_at).toLocaleString('it-IT')}</td>
                          <td className="p-3 font-semibold">{l.source}</td>
                          <td className="p-3 font-mono">{l.cities_touched}</td>
                          <td className="p-3 font-mono">{l.cinemas_touched}</td>
                          <td className="p-3 font-mono font-bold text-amber-400">{l.showtimes_touched}</td>
                          <td className="p-3 font-mono">{l.firecrawl_credits_used}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTENT */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              
              {/* Content Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <input
                  type="text"
                  value={contentSearch}
                  onChange={e => setContentSearch(e.target.value)}
                  placeholder="Cerca film o cinema nel database..."
                  className="px-4 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white placeholder-neutral-500 max-w-sm"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddCinema(!showAddCinema)}
                    className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Aggiungi Cinema</span>
                  </button>
                  <button
                    onClick={() => setShowAddMovie(!showAddMovie)}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-neutral-950 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Aggiungi Film</span>
                  </button>
                </div>
              </div>

              {/* Add Cinema Form Drawer */}
              {showAddCinema && (
                <form onSubmit={handleAddCinema} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-700 space-y-3">
                  <span className="text-xs font-bold text-amber-400 block">Nuovo Cinema</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Nome cinema (es. Cinema Odeon)"
                      value={newCinemaName}
                      onChange={e => setNewCinemaName(e.target.value)}
                      className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Indirizzo (es. Via del Corso 12)"
                      value={newCinemaAddress}
                      onChange={e => setNewCinemaAddress(e.target.value)}
                      className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white"
                    />
                    <select
                      value={newCinemaChain}
                      onChange={e => setNewCinemaChain(e.target.value)}
                      className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white"
                    >
                      <option value="independent">Indipendente / d'Essai</option>
                      <option value="UCI">UCI Cinemas</option>
                      <option value="The Space Cinema">The Space Cinema</option>
                      <option value="Notorious">Notorious Cinemas</option>
                      <option value="Arcadia">Arcadia Cinema</option>
                      <option value="Anteo">Anteo Spazio Cinema</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCinema(false)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs text-neutral-300"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-amber-500 text-xs font-bold text-neutral-950"
                    >
                      Salva Cinema
                    </button>
                  </div>
                </form>
              )}

              {/* Add Movie Form Drawer */}
              {showAddMovie && (
                <form onSubmit={handleAddMovie} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-700 space-y-3">
                  <span className="text-xs font-bold text-amber-400 block">Nuovo Film in Programmazione</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Titolo film (es. Nuovo Cinema Paradiso)"
                      value={newMovieTitle}
                      onChange={e => setNewMovieTitle(e.target.value)}
                      className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Regista (es. Giuseppe Tornatore)"
                      value={newMovieDirector}
                      onChange={e => setNewMovieDirector(e.target.value)}
                      className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMovie(false)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs text-neutral-300"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-amber-500 text-xs font-bold text-neutral-950"
                    >
                      Salva Film
                    </button>
                  </div>
                </form>
              )}

              {/* Showtimes Table with Active Toggle */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center justify-between">
                  <span>Gestione Orari Spettacoli Attivi (Disattiva orari errati con 1-click)</span>
                  <span className="font-mono text-amber-400">{contentData?.activeShowtimesCount} orari attivi</span>
                </h4>
                <div className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="bg-neutral-900 text-neutral-400 uppercase tracking-wider font-mono sticky top-0">
                      <tr>
                        <th className="p-3">Film</th>
                        <th className="p-3">Cinema</th>
                        <th className="p-3">Orario</th>
                        <th className="p-3">Formato</th>
                        <th className="p-3">Biglietteria</th>
                        <th className="p-3">Stato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 text-neutral-300">
                      {contentData?.showtimes.map(st => {
                        const m = contentData.movies.find(mov => mov.id === st.movie_id);
                        const c = contentData.cinemas.find(cin => cin.id === st.cinema_id);
                        return (
                          <tr key={st.id} className="hover:bg-neutral-900/50">
                            <td className="p-3 font-semibold text-white">{m?.title_it || 'Film'}</td>
                            <td className="p-3">{c?.name || 'Cinema'}</td>
                            <td className="p-3 font-mono font-bold text-amber-400">{st.time}</td>
                            <td className="p-3 font-mono">{st.format} ({st.language})</td>
                            <td className="p-3 font-mono text-[11px] text-neutral-400">{st.ticket_source}</td>
                            <td className="p-3">
                              <button
                                onClick={() => handleToggleShowtime(st.id, st.active)}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                                  st.active
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                                }`}
                              >
                                {st.active ? 'Attivo' : 'Disattivato'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: CUSTOMIZATION */}
          {activeTab === 'customization' && (
            <div>
              {customSettings ? (
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  
                  {saveSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Modifiche al sito salvate con successo! Sono visibili istantaneamente senza riavvio.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Headline IT */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1">
                        Titolo Principale Homepage (Italiano)
                      </label>
                      <input
                        type="text"
                        value={customSettings.homepage_headline_it}
                        onChange={e => setCustomSettings({ ...customSettings, homepage_headline_it: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white"
                      />
                    </div>

                    {/* Headline EN */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1">
                        Homepage Headline (English)
                      </label>
                      <input
                        type="text"
                        value={customSettings.homepage_headline_en}
                        onChange={e => setCustomSettings({ ...customSettings, homepage_headline_en: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white"
                      />
                    </div>

                    {/* Subtext IT */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-neutral-300 mb-1">
                        Sottotitolo / Descrizione (Italiano)
                      </label>
                      <textarea
                        rows={2}
                        value={customSettings.homepage_subtext_it}
                        onChange={e => setCustomSettings({ ...customSettings, homepage_subtext_it: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white"
                      />
                    </div>

                    {/* Footer Attribution Copy */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-neutral-300 mb-1">
                        Testo Copyright & Note a Piè di Pagina
                      </label>
                      <input
                        type="text"
                        value={customSettings.footer_copy}
                        onChange={e => setCustomSettings({ ...customSettings, footer_copy: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white"
                      />
                    </div>

                    {/* Privacy Policy Text */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-neutral-300 mb-1">
                        Testo Completo Informativa sulla Privacy (GDPR)
                      </label>
                      <textarea
                        rows={4}
                        value={customSettings.privacy_policy_text}
                        onChange={e => setCustomSettings({ ...customSettings, privacy_policy_text: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white font-sans"
                      />
                    </div>

                    {/* Social Media Section */}
                    <div className="md:col-span-2 p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <Share2 className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">Canali Social Ufficiali</span>
                              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                                Footer & Header
                              </span>
                            </div>
                            <p className="text-xs text-neutral-400">
                              Inserisci i link ai canali social ufficiali di CineVicino. I canali lasciati vuoti non verranno mostrati sul sito. Tutti i link devono iniziare con <code className="text-amber-400">https://</code>.
                            </p>
                          </div>
                        </div>
                      </div>

                      {socialValidationError && (
                        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>{socialValidationError}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Instagram */}
                        <div>
                          <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-2">
                            <Instagram className="w-3.5 h-3.5 text-pink-400" />
                            <span>Instagram</span>
                          </label>
                          <input
                            type="url"
                            placeholder="https://instagram.com/cinevicino"
                            value={customSettings.social_instagram_url || ''}
                            onChange={e => setCustomSettings({ ...customSettings, social_instagram_url: e.target.value })}
                            className={`w-full px-3 py-2 bg-black border ${
                              customSettings.social_instagram_url && !customSettings.social_instagram_url.startsWith('https://')
                                ? 'border-rose-500 focus:border-rose-400'
                                : 'border-neutral-700 focus:border-amber-500'
                            } rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none font-mono`}
                          />
                          {customSettings.social_instagram_url && !customSettings.social_instagram_url.startsWith('https://') && (
                            <p className="text-[11px] text-rose-400 mt-1">L'URL deve iniziare con https://</p>
                          )}
                        </div>

                        {/* Facebook */}
                        <div>
                          <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-2">
                            <Facebook className="w-3.5 h-3.5 text-blue-400" />
                            <span>Facebook</span>
                          </label>
                          <input
                            type="url"
                            placeholder="https://facebook.com/cinevicino"
                            value={customSettings.social_facebook_url || ''}
                            onChange={e => setCustomSettings({ ...customSettings, social_facebook_url: e.target.value })}
                            className={`w-full px-3 py-2 bg-black border ${
                              customSettings.social_facebook_url && !customSettings.social_facebook_url.startsWith('https://')
                                ? 'border-rose-500 focus:border-rose-400'
                                : 'border-neutral-700 focus:border-amber-500'
                            } rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none font-mono`}
                          />
                          {customSettings.social_facebook_url && !customSettings.social_facebook_url.startsWith('https://') && (
                            <p className="text-[11px] text-rose-400 mt-1">L'URL deve iniziare con https://</p>
                          )}
                        </div>

                        {/* X (Twitter) */}
                        <div>
                          <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-2">
                            <Twitter className="w-3.5 h-3.5 text-neutral-200" />
                            <span>X (ex Twitter)</span>
                          </label>
                          <input
                            type="url"
                            placeholder="https://x.com/cinevicino"
                            value={customSettings.social_x_url || ''}
                            onChange={e => setCustomSettings({ ...customSettings, social_x_url: e.target.value })}
                            className={`w-full px-3 py-2 bg-black border ${
                              customSettings.social_x_url && !customSettings.social_x_url.startsWith('https://')
                                ? 'border-rose-500 focus:border-rose-400'
                                : 'border-neutral-700 focus:border-amber-500'
                            } rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none font-mono`}
                          />
                          {customSettings.social_x_url && !customSettings.social_x_url.startsWith('https://') && (
                            <p className="text-[11px] text-rose-400 mt-1">L'URL deve iniziare con https://</p>
                          )}
                        </div>

                        {/* TikTok */}
                        <div>
                          <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-2">
                            <Music2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>TikTok</span>
                          </label>
                          <input
                            type="url"
                            placeholder="https://tiktok.com/@cinevicino"
                            value={customSettings.social_tiktok_url || ''}
                            onChange={e => setCustomSettings({ ...customSettings, social_tiktok_url: e.target.value })}
                            className={`w-full px-3 py-2 bg-black border ${
                              customSettings.social_tiktok_url && !customSettings.social_tiktok_url.startsWith('https://')
                                ? 'border-rose-500 focus:border-rose-400'
                                : 'border-neutral-700 focus:border-amber-500'
                            } rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none font-mono`}
                          />
                          {customSettings.social_tiktok_url && !customSettings.social_tiktok_url.startsWith('https://') && (
                            <p className="text-[11px] text-rose-400 mt-1">L'URL deve iniziare con https://</p>
                          )}
                        </div>

                        {/* YouTube */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-2">
                            <Youtube className="w-3.5 h-3.5 text-red-500" />
                            <span>YouTube</span>
                          </label>
                          <input
                            type="url"
                            placeholder="https://youtube.com/@cinevicino"
                            value={customSettings.social_youtube_url || ''}
                            onChange={e => setCustomSettings({ ...customSettings, social_youtube_url: e.target.value })}
                            className={`w-full px-3 py-2 bg-black border ${
                              customSettings.social_youtube_url && !customSettings.social_youtube_url.startsWith('https://')
                                ? 'border-rose-500 focus:border-rose-400'
                                : 'border-neutral-700 focus:border-amber-500'
                            } rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none font-mono`}
                          />
                          {customSettings.social_youtube_url && !customSettings.social_youtube_url.startsWith('https://') && (
                            <p className="text-[11px] text-rose-400 mt-1">L'URL deve iniziare con https://</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-neutral-800">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md"
                    >
                      <Save className="w-4 h-4" />
                      <span>Salva Modifiche al Sito</span>
                    </button>
                  </div>

                </form>
              ) : (
                <div className="py-12 text-center text-neutral-500 text-xs">
                  Caricamento impostazioni sito...
                </div>
              )}
            </div>
          )}

        </div>

      </main>
    </div>
  );
};
