export type Language = 'it' | 'en';

export interface TranslationKeys {
  tagline: string;
  nearbyBtn: string;
  searchPlaceholder: string;
  searchComune: string;
  allCities: string;
  allMovies: string;
  allChains: string;
  independentChains: string;
  allFormats: string;
  allGenres: string;
  originalVersion: string;
  todayShowtimes: string;
  tomorrow: string;
  weekend: string;
  buyTicketsOn: string;
  officialWebsite: string;
  officialTicketPartner: string;
  noLocalCinemas: string;
  nearestCinemaIs: string;
  distanceKm: string;
  viewShowtimes: string;
  favorites: string;
  adminPanel: string;
  login: string;
  logout: string;
  guestUser: string;
  saveCinema: string;
  saveMovie: string;
  saved: string;
  emailAlerts: string;
  alertSubtext: string;
  subscribe: string;
  subSuccess: string;
  director: string;
  cast: string;
  duration: string;
  minutes: string;
  releaseYear: string;
  rating: string;
  genres: string;
  synopsis: string;
  featuredMovies: string;
  browseByRegion: string;
  topMultiplexes: string;
  cookieTitle: string;
  cookieDesc: string;
  cookieAccept: string;
  cookieDecline: string;
  cookieCustomize: string;
  privacyPolicy: string;
  tmdbAttribution: string;
  firecrawlInfo: string;

  // Banner
  bannerGps: string;
  bannerIp: string;
  bannerCinemasNear: string;
  bannerNotHere: string;
  bannerSearchComuni: string;
  bannerPreciseLocate: string;
  bannerLocating: string;
  bannerNoCityFound: string;
  bannerTypeMinChars: string;
  bannerSearching: string;

  // Common UI
  close: string;
  cancel: string;
  save: string;
  actions: string;
  back: string;
  all: string;

  // Movie Card & Detail
  showtimesAndHours: string;
  originalSynopsisNote: string;
  addToFavorites: string;
  removeFromFavorites: string;
  shareMovie: string;
  shareLinkCopied: string;
  selectDate: string;
  filterCity: string;
  noShowtimesForDate: string;
  officialTicketsAvailable: string;
  allShowtimesInCity: string;

  // City Detail
  cityCinemasTitle: string;
  cinemasCount: string;
  shareCity: string;
  todayProgramming: string;
  noFilterMatch: string;
  nearestCinemasTitle: string;

  // Admin Dashboard
  adminTitle: string;
  adminSubtitle: string;
  adminAuthenticated: string;
  adminLoginTitle: string;
  adminLoginDesc: string;
  adminEmailPlaceholder: string;
  adminPasswordPlaceholder: string;
  adminLoginBtn: string;
  adminLoggingIn: string;
  adminSessionExpired: string;
  tabStatus: string;
  tabScrape: string;
  tabContent: string;
  tabCustomization: string;
  municipalitiesCount: string;
  activeCinemasCount: string;
  moviesCount: string;
  liveShowtimesCount: string;
  lastScrape: string;
  firecrawlCredits: string;
  databaseStatus: string;
  tmdbApiStatus: string;
  testTmdbConn: string;
  testFirecrawlCredits: string;
  startScrapeBatch: string;
  stopScrapeBatch: string;
  liveLogs: string;
  noRecentLogs: string;
  settingsSaved: string;
  savingSettings: string;
  saveSettings: string;
}

export const translations: Record<Language, TranslationKeys> = {
  it: {
    tagline: 'Directory Cinema d\'Italia',
    nearbyBtn: 'Cinema vicino a me',
    searchPlaceholder: 'Cerca per comune (es. Roma, Milano, Melzo, Cortina...)',
    searchComune: 'Cerca un comune italiano...',
    allCities: 'Tutti i Comuni',
    allMovies: 'Film in sala',
    allChains: 'Tutte le catene',
    independentChains: 'Cinema Indipendenti / d\'Essai',
    allFormats: 'Tutti i formati',
    allGenres: 'Tutti i generi',
    originalVersion: 'Lingua Originale (VOSE)',
    todayShowtimes: 'Orari di oggi',
    tomorrow: 'Domani',
    weekend: 'Fine settimana',
    buyTicketsOn: 'Acquista su',
    officialWebsite: 'Sito ufficiale',
    officialTicketPartner: 'Biglietteria ufficiale',
    noLocalCinemas: 'Nessun cinema attualmente censito in questo comune.',
    nearestCinemaIs: 'Il cinema più vicino è',
    distanceKm: 'a circa',
    viewShowtimes: 'Vedi orari e programmazione',
    favorites: 'Preferiti',
    adminPanel: 'Pannello Admin',
    login: 'Accedi',
    logout: 'Esci',
    guestUser: 'Ospite',
    saveCinema: 'Salva cinema',
    saveMovie: 'Salva film',
    saved: 'Salvato',
    emailAlerts: 'Avvisi Nuove Uscite',
    alertSubtext: 'Ricevi una notifica email quando nuovi film arrivano nei cinema del tuo comune.',
    subscribe: 'Iscriviti',
    subSuccess: 'Iscrizione agli avvisi completata con successo!',
    director: 'Regia',
    cast: 'Cast',
    duration: 'Durata',
    minutes: 'min',
    releaseYear: 'Anno',
    rating: 'Valutazione',
    genres: 'Generi',
    synopsis: 'Trama',
    featuredMovies: 'In evidenza oggi nei cinema italiani',
    browseByRegion: 'Esplora per Regione',
    topMultiplexes: 'Circuiti e Sale d\'Autore',
    cookieTitle: 'Informativa sui Cookie e Privacy',
    cookieDesc: 'Utilizziamo cookie tecnici per salvare le tue preferenze e la geolocalizzazione (esclusivamente locale) per trovare i cinema più vicini a te in Italia.',
    cookieAccept: 'Accetta tutti',
    cookieDecline: 'Solo essenziali',
    cookieCustomize: 'Personalizza',
    privacyPolicy: 'Informativa sulla Privacy',
    tmdbAttribution: 'Questo prodotto utilizza le API di TMDb ma non è approvato né certificato da TMDb.',
    firecrawlInfo: 'Scraping ibrido: HTTP standard gratuito + Firecrawl limitato al free tier (1.000 crediti/mese).',

    // Banner
    bannerGps: 'GPS Preciso',
    bannerIp: 'Rilevato via IP',
    bannerCinemasNear: 'Cinema vicino a',
    bannerNotHere: 'Non sei qui? Cambia città',
    bannerSearchComuni: 'Cerca tra i 7.894 comuni...',
    bannerPreciseLocate: 'Usa la mia posizione precisa',
    bannerLocating: 'Rilevamento GPS...',
    bannerNoCityFound: 'Nessun comune trovato',
    bannerTypeMinChars: 'Digita almeno 2 lettere per trovare il tuo comune',
    bannerSearching: 'Ricerca in corso...',

    // Common UI
    close: 'Chiudi',
    cancel: 'Annulla',
    save: 'Salva',
    actions: 'Azioni',
    back: 'Indietro',
    all: 'Tutti',

    // Movie Card & Detail
    showtimesAndHours: 'Programmazione & Orari',
    originalSynopsisNote: 'Trama in lingua originale (italiano)',
    addToFavorites: 'Aggiungi ai preferiti',
    removeFromFavorites: 'Rimuovi dai preferiti',
    shareMovie: 'Condividi Film',
    shareLinkCopied: 'Link copiato negli appunti!',
    selectDate: 'Seleziona data',
    filterCity: 'Filtra per comune',
    noShowtimesForDate: 'Nessun orario di programmazione disponibile per questa data.',
    officialTicketsAvailable: 'Biglietti ufficiali disponibili',
    allShowtimesInCity: 'Tutti gli orari nella tua città',

    // City Detail
    cityCinemasTitle: 'Cinema e Sale a',
    cinemasCount: 'cinema censiti',
    shareCity: 'Condividi Comune',
    todayProgramming: 'Programmazione di oggi:',
    noFilterMatch: 'Nessun orario corrispondente ai filtri per oggi.',
    nearestCinemasTitle: 'Nessun cinema in questo comune. Cinema più vicini:',

    // Admin Dashboard
    adminTitle: 'CineVicino Admin',
    adminSubtitle: 'Controllo Scraper, Stato API, Contenuti & Personalizzazione',
    adminAuthenticated: 'Autenticato',
    adminLoginTitle: 'Accesso Pannello Admin',
    adminLoginDesc: 'Area riservata protetta da token di sessione JWT e credenziali di amministratore.',
    adminEmailPlaceholder: 'Email amministratore (es. admin@cinevicino.it)',
    adminPasswordPlaceholder: 'Inserisci password admin...',
    adminLoginBtn: 'Accedi al Pannello',
    adminLoggingIn: 'Accesso in corso...',
    adminSessionExpired: 'Sessione scaduta o permessi admin insufficienti. Effettua nuovamente il login.',
    tabStatus: '1. Stato API',
    tabScrape: '2. Scraper',
    tabContent: '3. Contenuti',
    tabCustomization: '4. Personalizzazione',
    municipalitiesCount: 'Comuni Censiti',
    activeCinemasCount: 'Cinema Attivi',
    moviesCount: 'Film in Sala',
    liveShowtimesCount: 'Spettacoli Live',
    lastScrape: 'Ultimo Scrape',
    firecrawlCredits: 'Crediti Firecrawl',
    databaseStatus: 'Database PostgreSQL',
    tmdbApiStatus: 'TMDb API',
    testTmdbConn: 'Test Connessione TMDb',
    testFirecrawlCredits: 'Verifica Crediti Firecrawl',
    startScrapeBatch: 'Avvia Scrape Batch',
    stopScrapeBatch: 'Arresta Scrape',
    liveLogs: 'Console Log in Tempo Reale',
    noRecentLogs: 'Nessun log recente registrato',
    settingsSaved: 'Impostazioni salvate con successo!',
    savingSettings: 'Salvataggio in corso...',
    saveSettings: 'Salva Impostazioni'
  },
  en: {
    tagline: 'Italian Cinema Directory',
    nearbyBtn: 'Cinemas near me',
    searchPlaceholder: 'Search any Italian city (e.g. Rome, Milan, Melzo, Cortina...)',
    searchComune: 'Search an Italian city...',
    allCities: 'All Municipalities',
    allMovies: 'Now Playing',
    allChains: 'All Chains',
    independentChains: 'Arthouse / Independent',
    allFormats: 'All formats',
    allGenres: 'All genres',
    originalVersion: 'Original Version (OV / VOSE)',
    todayShowtimes: 'Today\'s showtimes',
    tomorrow: 'Tomorrow',
    weekend: 'Weekend',
    buyTicketsOn: 'Buy tickets on',
    officialWebsite: 'Official website',
    officialTicketPartner: 'Official ticketing platform',
    noLocalCinemas: 'No cinema currently listed in this municipality.',
    nearestCinemaIs: 'The nearest cinema is',
    distanceKm: 'about',
    viewShowtimes: 'View showtimes & details',
    favorites: 'Favorites',
    adminPanel: 'Admin Panel',
    login: 'Log In',
    logout: 'Log Out',
    guestUser: 'Guest',
    saveCinema: 'Save cinema',
    saveMovie: 'Save movie',
    saved: 'Saved',
    emailAlerts: 'Movie Release Alerts',
    alertSubtext: 'Get an email alert when new movies premiere in your chosen Italian city.',
    subscribe: 'Subscribe',
    subSuccess: 'Subscribed to city movie alerts!',
    director: 'Director',
    cast: 'Cast',
    duration: 'Runtime',
    minutes: 'min',
    releaseYear: 'Year',
    rating: 'Rating',
    genres: 'Genres',
    synopsis: 'Synopsis',
    featuredMovies: 'Featured today in Italian cinemas',
    browseByRegion: 'Browse by Region',
    topMultiplexes: 'Chains & Arthouse Theaters',
    cookieTitle: 'Cookie and Privacy Notice',
    cookieDesc: 'We use technical cookies for your preferences and on-device geolocation to locate nearest cinemas across Italy.',
    cookieAccept: 'Accept all',
    cookieDecline: 'Essential only',
    cookieCustomize: 'Preferences',
    privacyPolicy: 'Privacy Policy',
    tmdbAttribution: 'This product uses the TMDb API but is not endorsed or certified by TMDb.',
    firecrawlInfo: 'Hybrid scraping: Free standard HTTP + Firecrawl capped at 1,000 free monthly credits.',

    // Banner
    bannerGps: 'Precise GPS',
    bannerIp: 'Detected via IP',
    bannerCinemasNear: 'Cinemas near',
    bannerNotHere: 'Not here? Change city',
    bannerSearchComuni: 'Search across 7,894 municipalities...',
    bannerPreciseLocate: 'Use my precise location',
    bannerLocating: 'Locating via GPS...',
    bannerNoCityFound: 'No municipality found',
    bannerTypeMinChars: 'Type at least 2 letters to find your municipality',
    bannerSearching: 'Searching...',

    // Common UI
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    actions: 'Actions',
    back: 'Back',
    all: 'All',

    // Movie Card & Detail
    showtimesAndHours: 'Showtimes & Schedule',
    originalSynopsisNote: 'Original language synopsis (Italian)',
    addToFavorites: 'Add to favorites',
    removeFromFavorites: 'Remove from favorites',
    shareMovie: 'Share Movie',
    shareLinkCopied: 'Link copied to clipboard!',
    selectDate: 'Select date',
    filterCity: 'Filter by municipality',
    noShowtimesForDate: 'No showtimes scheduled for this date.',
    officialTicketsAvailable: 'Official tickets available',
    allShowtimesInCity: 'All showtimes in your city',

    // City Detail
    cityCinemasTitle: 'Cinemas & Theaters in',
    cinemasCount: 'listed cinemas',
    shareCity: 'Share Municipality',
    todayProgramming: 'Today\'s schedule:',
    noFilterMatch: 'No showtimes matching current filters for today.',
    nearestCinemasTitle: 'No cinema in this municipality. Closest cinemas nearby:',

    // Admin Dashboard
    adminTitle: 'CineVicino Admin',
    adminSubtitle: 'Scraper Control, API Health, Content & Customization',
    adminAuthenticated: 'Authenticated',
    adminLoginTitle: 'Admin Panel Login',
    adminLoginDesc: 'Restricted area protected by JWT session tokens and admin credentials.',
    adminEmailPlaceholder: 'Admin email (e.g. admin@cinevicino.it)',
    adminPasswordPlaceholder: 'Enter admin password...',
    adminLoginBtn: 'Log In to Panel',
    adminLoggingIn: 'Logging in...',
    adminSessionExpired: 'Session expired or insufficient admin permissions. Please log in again.',
    tabStatus: '1. API Status',
    tabScrape: '2. Scraper',
    tabContent: '3. Content',
    tabCustomization: '4. Customization',
    municipalitiesCount: 'Census Municipalities',
    activeCinemasCount: 'Active Cinemas',
    moviesCount: 'Movies Now Showing',
    liveShowtimesCount: 'Live Showtimes',
    lastScrape: 'Last Scrape',
    firecrawlCredits: 'Firecrawl Credits',
    databaseStatus: 'PostgreSQL Database',
    tmdbApiStatus: 'TMDb API',
    testTmdbConn: 'Test TMDb Connection',
    testFirecrawlCredits: 'Check Firecrawl Credits',
    startScrapeBatch: 'Start Scrape Batch',
    stopScrapeBatch: 'Stop Scrape',
    liveLogs: 'Real-Time Console Logs',
    noRecentLogs: 'No recent logs recorded',
    settingsSaved: 'Settings saved successfully!',
    savingSettings: 'Saving...',
    saveSettings: 'Save Settings'
  }
};

// Export context and helpers so both direct and context imports work smoothly
export {
  LanguageProvider,
  useLanguage,
  useTranslation,
  getMovieTitle,
  getMovieSynopsis
} from '../context/LanguageContext';
