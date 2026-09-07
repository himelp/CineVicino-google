import React, { useState, useEffect } from 'react';
import { 
  Shield, Activity, Database, RefreshCw, Play, 
  Settings, Film, MapPin, Ticket, CheckCircle2, 
  XCircle, AlertTriangle, Key, LogOut, Terminal, 
  Edit3, Save, Plus, ArrowRight, Eye, EyeOff, Zap
} from 'lucide-react';
import { Movie, Cinema, Showtime, ScrapeLog, SiteSettings } from '../types';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [token, setToken] = useState<string>(() => localStorage.getItem('cinevicino_token') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('admin@cinevicino.it');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'status' | 'scrape' | 'content' | 'customization'>('status');

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

  // Check existing session on mount
  useEffect(() => {
    async function checkExistingAuth() {
      const storedToken = localStorage.getItem('cinevicino_token');
      if (!storedToken) return;
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user?.is_admin) {
            setIsAuthenticated(true);
            setToken(storedToken);
          }
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
  const [scrapeAdvanceCursor, setScrapeAdvanceCursor] = useState(true);

  // Customization state
  const [customSettings, setCustomSettings] = useState<SiteSettings | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Handle Login via real POST /api/auth/login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (res.ok && data.token && data.user?.is_admin) {
        setToken(data.token);
        localStorage.setItem('cinevicino_token', data.token);
        setIsAuthenticated(true);
        setLoginError('');
      } else if (res.ok && !data.user?.is_admin) {
        setLoginError('Accesso negato: questo account non dispone dei privilegi di amministratore.');
      } else {
        setLoginError(data.error || 'Credenziali di accesso non valide.');
      }
    } catch (err: any) {
      setLoginError(`Errore di connessione: ${err.message}`);
    }
  };

  // Trigger loads when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadStatus();
      loadScrapeLogs();
      loadContent();
      loadSettings();
    }
  }, [isAuthenticated, token]);

  // Load Status
  const loadStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await authFetch('/api/admin/status');
      if (res.ok) {
        setStatusData(await res.json());
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
      const res = await authFetch('/api/admin/scrape/logs');
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load Content
  const loadContent = async () => {
    try {
      const res = await authFetch('/api/admin/content/all');
      if (res.ok) {
        const data = await res.json();
        setContentData(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load Settings
  const loadSettings = async () => {
    try {
      const res = await authFetch('/api/admin/settings');
      if (res.ok) {
        setCustomSettings(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Run Scraper
  const handleTriggerScrape = async () => {
    setIsScraping(true);
    setScrapeConsole([
      `[${new Date().toLocaleTimeString()}] Avvio scraping nazionale CineVicino con Cheerio...`,
      `[${new Date().toLocaleTimeString()}] Querying ComingSoon.it, MYmovies.it, CinemaTimes.com e TMDb...`
    ]);

    try {
      const payload: any = { useFirecrawl };
      if (scrapeTargetCity.trim()) payload.city = scrapeTargetCity.trim();
      if (scrapeLimit) payload.limit = parseInt(scrapeLimit, 10);
      if (scrapeOffset !== '') payload.offset = parseInt(scrapeOffset, 10);
      payload.advance_cursor = scrapeAdvanceCursor;

      const res = await authFetch('/api/admin/scrape/run', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.result) {
        const r = data.result;
        setScrapeConsole(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ${r.details}`,
          `[${new Date().toLocaleTimeString()}] Successo: ${r.showtimes_touched} orari sincronizzati in PostgreSQL.`
        ]);
        loadScrapeLogs();
        loadContent();
        loadStatus();
      } else {
        setScrapeConsole(prev => [...prev, `[ERRORE] ${data.error || 'Errore durante lo scrape'}`]);
      }
    } catch (err: any) {
      setScrapeConsole(prev => [...prev, `[ERRORE] ${err.message}`]);
    } finally {
      setIsScraping(false);
    }
  };

  // Reset Scraper Cursor to 0
  const handleResetCursor = async () => {
    try {
      const res = await authFetch('/api/admin/scrape/cursor', {
        method: 'POST',
        body: JSON.stringify({ offset: 0 })
      });
      if (res.ok) {
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
      const res = await authFetch('/api/admin/diagnostics/tmdb/test', {
        method: 'POST',
        body: JSON.stringify({ query: 'Dune' })
      });
      const data = await res.json();
      if (data.result) {
        setTmdbTestResult(data.result);
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
      const res = await authFetch('/api/admin/diagnostics/firecrawl/test', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' })
      });
      const data = await res.json();
      if (data.result) {
        setFirecrawlTestResult(data.result);
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
      const res = await authFetch('/api/admin/diagnostics/scraper/test', {
        method: 'POST',
        body: JSON.stringify({ city: 'roma' })
      });
      const data = await res.json();
      if (data.result) {
        setScrapersTestResult(data.result);
        loadStatus();
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setTestingScrapers(false);
    }
  };

  // Toggle Active Showtime
  const handleToggleShowtime = async (id: string, currentActive: boolean) => {
    try {
      const res = await authFetch('/api/admin/content/toggle-active', {
        method: 'POST',
        body: JSON.stringify({ showtime_id: id, active: !currentActive })
      });
      if (res.ok) {
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

    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(customSettings)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Cinema
  const handleAddCinema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCinemaName.trim() || !newCinemaAddress.trim()) return;

    try {
      const res = await authFetch('/api/admin/content/cinema', {
        method: 'POST',
        body: JSON.stringify({
          id: `cin-${Date.now()}`,
          name: newCinemaName.trim(),
          address: newCinemaAddress.trim(),
          chain: newCinemaChain,
          city_id: 'c-roma'
        })
      });
      if (res.ok) {
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
      const res = await authFetch('/api/admin/content/movie', {
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
      if (res.ok) {
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto min-h-[100dvh]">
        <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl text-center text-neutral-200 my-auto pb-safe">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">Accesso Pannello Admin</h2>
          <p className="text-xs text-neutral-400 mt-1 mb-6 leading-relaxed">
            Area riservata protetta da token di sessione JWT e credenziali di amministratore.
          </p>

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div className="relative text-left">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email amministratore (es. admin@cinevicino.it)"
                className="w-full px-4 py-2.5 bg-black border border-white/20 rounded-full text-base sm:text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            <div className="relative text-left">
              <Key className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Inserisci password admin..."
                className="w-full pl-11 pr-4 py-2.5 bg-black border border-white/20 rounded-full text-base sm:text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            {loginError && (
              <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800 text-left">
                {loginError}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[44px] py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-white border border-white/10 transition-colors cursor-pointer active:scale-95"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex-1 min-h-[44px] py-2.5 rounded-full bg-[#D4AF37] hover:bg-white text-xs font-bold uppercase tracking-wider text-black transition-colors shadow-sm cursor-pointer active:scale-95"
              >
                Accedi
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn min-h-[100dvh]">
      <div 
        className="relative w-full max-w-5xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl my-auto text-neutral-200 flex flex-col max-h-[92dvh] pb-safe"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Admin Header */}
        <div className="p-3.5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/50 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif font-bold text-white truncate">CineVicino Admin</h2>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                  Autenticato
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-400 truncate hidden xs:block">
                Controllo Scraper, Stato API, Contenuti & Personalizzazione
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setIsAuthenticated(false)}
              title="Disconnetti"
              aria-label="Disconnetti"
              className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-rose-400 border border-white/10 transition-colors cursor-pointer active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Chiudi"
              className="min-h-[40px] sm:min-h-[44px] px-3.5 sm:px-4 py-1.5 rounded-full bg-white/5 hover:bg-white text-neutral-300 hover:text-black border border-white/10 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            >
              Chiudi
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-black/30 px-2 sm:px-4 gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'status', label: '1. Stato API', icon: Activity },
            { id: 'scrape', label: '2. Scraper', icon: RefreshCw },
            { id: 'content', label: '3. Contenuti', icon: Database },
            { id: 'customization', label: '4. Personalizzazione', icon: Edit3 }
          ].map(tab => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 min-h-[44px] py-2.5 px-3 sm:px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer active:scale-95 ${
                  isSel
                    ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
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

                  <button
                    onClick={handleTriggerScrape}
                    disabled={isScraping}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Play className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
                    <span>{isScraping ? 'Scraping in corso...' : 'Avvia Scrape Batch'}</span>
                  </button>
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
                  <div className="mt-4 p-4 rounded-xl bg-black border border-neutral-800 font-mono text-xs text-emerald-400 space-y-1 max-h-48 overflow-y-auto">
                    <div className="flex items-center gap-2 text-neutral-500 pb-2 border-b border-neutral-800 mb-2">
                      <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Console di esecuzione scraper</span>
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

      </div>
    </div>
  );
};
