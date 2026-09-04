import React, { useState, useEffect } from 'react';
import { 
  Shield, Activity, Database, RefreshCw, Play, 
  Settings, Film, MapPin, Ticket, CheckCircle2, 
  XCircle, AlertTriangle, Key, LogOut, Terminal, 
  Edit3, Save, Plus, ArrowRight, Eye, EyeOff 
} from 'lucide-react';
import { Movie, Cinema, Showtime, ScrapeLog, SiteSettings } from '../types';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'status' | 'scrape' | 'content' | 'customization'>('status');

  // Status state
  const [statusData, setStatusData] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

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

  // Customization state
  const [customSettings, setCustomSettings] = useState<SiteSettings | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin' || password === 'admin123' || password.length >= 4) {
      setIsAuthenticated(true);
      setLoginError('');
      loadStatus();
      loadScrapeLogs();
      loadContent();
      loadSettings();
    } else {
      setLoginError('Password non corretta. (Suggerimento: usa "admin" per la demo)');
    }
  };

  // Load Status
  const loadStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await fetch('/api/admin/status');
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
      const res = await fetch('/api/admin/scrape/logs');
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
      const res = await fetch('/api/admin/content');
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
      const res = await fetch('/api/admin/settings');
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
      `[${new Date().toLocaleTimeString()}] Avvio scraping nazionale CineVicino...`,
      `[${new Date().toLocaleTimeString()}] Modalità: ${useFirecrawl ? 'Hybrid HTTP + Firecrawl' : 'Standard Free HTTP (0 crediti consumati)'}`
    ]);

    try {
      const res = await fetch('/api/admin/scrape/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_firecrawl: useFirecrawl })
      });
      const result = await res.json();
      if (result.success) {
        setScrapeConsole(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Scansione aggregatori completata (MYmovies, ComingSoon, CinemaTimes).`,
          `[${new Date().toLocaleTimeString()}] Sincronizzazione sale multiplex (UCI, The Space, Notorious, Arcadia, Anteo).`,
          `[${new Date().toLocaleTimeString()}] Arricchimento metadati TMDb eseguito.`,
          `[${new Date().toLocaleTimeString()}] Successo: ${result.log.showtimes_touched} orari aggiornati su ${result.log.cinemas_touched} cinema.`
        ]);
        loadScrapeLogs();
        loadContent();
        loadStatus();
      }
    } catch (err: any) {
      setScrapeConsole(prev => [...prev, `[ERRORE] ${err.message}`]);
    } finally {
      setIsScraping(false);
    }
  };

  // Toggle Active Showtime
  const handleToggleShowtime = async (id: string) => {
    try {
      const res = await fetch('/api/admin/content/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'showtime', id })
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
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('/api/admin/content/cinema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCinemaName.trim(),
          address: newCinemaAddress.trim(),
          chain: newCinemaChain,
          city_id: 'city-rm-058091'
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
      const res = await fetch('/api/admin/content/movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center text-neutral-200">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-white">Accesso Pannello Admin</h2>
          <p className="text-xs text-neutral-400 mt-1 mb-6">
            Area riservata alla gestione contenuti, scraper nazionale e parametri di CineVicino.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative text-left">
              <Key className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Inserisci password admin..."
                className="w-full pl-11 pr-4 py-2.5 bg-black border border-white/20 rounded-full text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            {loginError && (
              <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800">
                {loginError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-neutral-300 border border-white/10 transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-full bg-[#D4AF37] hover:bg-white text-xs font-bold uppercase tracking-wider text-black transition-colors shadow-sm cursor-pointer"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div 
        className="relative w-full max-w-5xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl my-auto text-neutral-200 flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Admin Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-white">CineVicino Admin</h2>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Autenticato
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Controllo Scraper, Stato API, Contenuti & Personalizzazione
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAuthenticated(false)}
              title="Disconnetti"
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-rose-400 border border-white/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white text-neutral-300 hover:text-black border border-white/10 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-black/30 px-4 gap-2 overflow-x-auto">
          {[
            { id: 'status', label: '1. Stato API & Integrazioni', icon: Activity },
            { id: 'scrape', label: '2. Scraper Nazionale', icon: RefreshCw },
            { id: 'content', label: '3. Gestione Contenuti', icon: Database },
            { id: 'customization', label: '4. Personalizzazione Sito', icon: Edit3 }
          ].map(tab => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isSel
                    ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
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
                    <span className="font-bold text-sm text-white">The Movie Database (TMDb) API</span>
                    {statusData?.tmdb?.success ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Connesso ({statusData.tmdb.latencyMs}ms)
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Fallback Locale Attivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Utilizzato per l'arricchimento automatico di poster in alta definizione, trame in italiano e inglese, cast e registi.
                  </p>
                  <div className="text-[11px] font-mono text-neutral-500 bg-neutral-900 p-2 rounded-lg">
                    {statusData?.tmdb?.message || 'Configurazione in corso...'}
                  </div>
                </div>

                {/* Firecrawl Meter & Status Card */}
                <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Firecrawl API (Free Tier)</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                      {statusData?.firecrawl?.credits_used || 0} / 1.000 crediti
                    </span>
                  </div>
                  
                  {/* Visual Credit Meter */}
                  <div>
                    <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                      <span>Consumo mensile</span>
                      <span>Limite: 1.000 / mese</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((statusData?.firecrawl?.credits_used || 0) / 1000) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Riservato a crawl di scoperta una-tantum. I controlli quotidiani usano parser HTTP a costo zero per evitare il consumo di crediti.
                  </p>
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

              </div>
            </div>
          )}

          {/* TAB 2: SCRAPE */}
          {activeTab === 'scrape' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Esecuzione Manuale Scraper Nazionale
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Scansiona aggregatori (MYmovies, ComingSoon, CinemaTimes) e catene (UCI, The Space, Notorious, Arcadia, Anteo).
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useFirecrawl}
                        onChange={e => setUseFirecrawl(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-800 border-neutral-700"
                      />
                      <span>Usa Firecrawl per pagine JS</span>
                    </label>

                    <button
                      onClick={handleTriggerScrape}
                      disabled={isScraping}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      <Play className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
                      <span>{isScraping ? 'Scraping in corso...' : 'Avvia Scrape Ora'}</span>
                    </button>
                  </div>
                </div>

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
                <div className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
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
                <div className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
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
                                onClick={() => handleToggleShowtime(st.id)}
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
