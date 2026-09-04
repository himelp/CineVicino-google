import { City, Cinema, Movie, Showtime, User, Favorite, AlertSubscription, ScrapeLog, SiteSettings } from '../types';
import fs from 'fs';
import path from 'path';

// Seed Italian Provincial Capitals and Major Hubs with real GPS coordinates for Haversine calculations
const INITIAL_CITIES: City[] = [
  { id: 'c-roma', slug: 'roma', name: 'Roma', region: 'Lazio', province: 'Roma', province_code: 'RM', is_provincial_capital: true, lat: 41.9028, lng: 12.4964, cinema_count: 32 },
  { id: 'c-milano', slug: 'milano', name: 'Milano', region: 'Lombardia', province: 'Milano', province_code: 'MI', is_provincial_capital: true, lat: 45.4642, lng: 9.1900, cinema_count: 28 },
  { id: 'c-napoli', slug: 'napoli', name: 'Napoli', region: 'Campania', province: 'Napoli', province_code: 'NA', is_provincial_capital: true, lat: 40.8518, lng: 14.2681, cinema_count: 18 },
  { id: 'c-torino', slug: 'torino', name: 'Torino', region: 'Piemonte', province: 'Torino', province_code: 'TO', is_provincial_capital: true, lat: 45.0703, lng: 7.6869, cinema_count: 16 },
  { id: 'c-firenze', slug: 'firenze', name: 'Firenze', region: 'Toscana', province: 'Firenze', province_code: 'FI', is_provincial_capital: true, lat: 43.7696, lng: 11.2558, cinema_count: 14 },
  { id: 'c-bologna', slug: 'bologna', name: 'Bologna', region: 'Emilia-Romagna', province: 'Bologna', province_code: 'BO', is_provincial_capital: true, lat: 44.4949, lng: 11.3426, cinema_count: 15 },
  { id: 'c-genova', slug: 'genova', name: 'Genova', region: 'Liguria', province: 'Genova', province_code: 'GE', is_provincial_capital: true, lat: 44.4056, lng: 8.9463, cinema_count: 11 },
  { id: 'c-palermo', slug: 'palermo', name: 'Palermo', region: 'Sicilia', province: 'Palermo', province_code: 'PA', is_provincial_capital: true, lat: 38.1157, lng: 13.3615, cinema_count: 12 },
  { id: 'c-bari', slug: 'bari', name: 'Bari', region: 'Puglia', province: 'Bari', province_code: 'BA', is_provincial_capital: true, lat: 41.1171, lng: 16.8719, cinema_count: 9 },
  { id: 'c-catania', slug: 'catania', name: 'Catania', region: 'Sicilia', province: 'Catania', province_code: 'CT', is_provincial_capital: true, lat: 37.5079, lng: 15.0830, cinema_count: 8 },
  { id: 'c-venezia', slug: 'venezia', name: 'Venezia', region: 'Veneto', province: 'Venezia', province_code: 'VE', is_provincial_capital: true, lat: 45.4408, lng: 12.3155, cinema_count: 7 },
  { id: 'c-verona', slug: 'verona', name: 'Verona', region: 'Veneto', province: 'Verona', province_code: 'VR', is_provincial_capital: true, lat: 45.4384, lng: 10.9916, cinema_count: 8 },
  { id: 'c-messina', slug: 'messina', name: 'Messina', region: 'Sicilia', province: 'Messina', province_code: 'ME', is_provincial_capital: true, lat: 38.1938, lng: 15.5540, cinema_count: 6 },
  { id: 'c-padova', slug: 'padova', name: 'Padova', region: 'Veneto', province: 'Padova', province_code: 'PD', is_provincial_capital: true, lat: 45.4064, lng: 11.8768, cinema_count: 9 },
  { id: 'c-trieste', slug: 'trieste', name: 'Trieste', region: 'Friuli-Venezia Giulia', province: 'Trieste', province_code: 'TS', is_provincial_capital: true, lat: 45.6495, lng: 13.7768, cinema_count: 6 },
  { id: 'c-brescia', slug: 'brescia', name: 'Brescia', region: 'Lombardia', province: 'Brescia', province_code: 'BS', is_provincial_capital: true, lat: 45.5416, lng: 10.2118, cinema_count: 8 },
  { id: 'c-taranto', slug: 'taranto', name: 'Taranto', region: 'Puglia', province: 'Taranto', province_code: 'TA', is_provincial_capital: true, lat: 40.4644, lng: 17.2470, cinema_count: 5 },
  { id: 'c-parma', slug: 'parma', name: 'Parma', region: 'Emilia-Romagna', province: 'Parma', province_code: 'PR', is_provincial_capital: true, lat: 44.8015, lng: 10.3279, cinema_count: 6 },
  { id: 'c-prato', slug: 'prato', name: 'Prato', region: 'Toscana', province: 'Prato', province_code: 'PO', is_provincial_capital: true, lat: 43.8777, lng: 11.1022, cinema_count: 4 },
  { id: 'c-modena', slug: 'modena', name: 'Modena', region: 'Emilia-Romagna', province: 'Modena', province_code: 'MO', is_provincial_capital: true, lat: 44.6471, lng: 10.9252, cinema_count: 6 },
  { id: 'c-reggio-calabria', slug: 'reggio-di-calabria', name: 'Reggio Calabria', region: 'Calabria', province: 'Reggio Calabria', province_code: 'RC', is_provincial_capital: true, lat: 38.1113, lng: 15.6473, cinema_count: 4 },
  { id: 'c-reggio-emilia', slug: 'reggio-nell-emilia', name: "Reggio nell'Emilia", region: 'Emilia-Romagna', province: 'Reggio nell\'Emilia', province_code: 'RE', is_provincial_capital: true, lat: 44.6983, lng: 10.6312, cinema_count: 5 },
  { id: 'c-perugia', slug: 'perugia', name: 'Perugia', region: 'Umbria', province: 'Perugia', province_code: 'PG', is_provincial_capital: true, lat: 43.1107, lng: 12.3908, cinema_count: 6 },
  { id: 'c-ravenna', slug: 'ravenna', name: 'Ravenna', region: 'Emilia-Romagna', province: 'Ravenna', province_code: 'RA', is_provincial_capital: true, lat: 44.4184, lng: 12.2035, cinema_count: 5 },
  { id: 'c-livorno', slug: 'livorno', name: 'Livorno', region: 'Toscana', province: 'Livorno', province_code: 'LI', is_provincial_capital: true, lat: 43.5485, lng: 10.3106, cinema_count: 4 },
  { id: 'c-cagliari', slug: 'cagliari', name: 'Cagliari', region: 'Sardegna', province: 'Cagliari', province_code: 'CA', is_provincial_capital: true, lat: 39.2238, lng: 9.1217, cinema_count: 7 },
  { id: 'c-foggia', slug: 'foggia', name: 'Foggia', region: 'Puglia', province: 'Foggia', province_code: 'FG', is_provincial_capital: true, lat: 41.4622, lng: 15.5447, cinema_count: 4 },
  { id: 'c-rimini', slug: 'rimini', name: 'Rimini', region: 'Emilia-Romagna', province: 'Rimini', province_code: 'RN', is_provincial_capital: true, lat: 44.0678, lng: 12.5695, cinema_count: 5 },
  { id: 'c-salerno', slug: 'salerno', name: 'Salerno', region: 'Campania', province: 'Salerno', province_code: 'SA', is_provincial_capital: true, lat: 40.6824, lng: 14.7681, cinema_count: 6 },
  { id: 'c-ferrara', slug: 'ferrara', name: 'Ferrara', region: 'Emilia-Romagna', province: 'Ferrara', province_code: 'FE', is_provincial_capital: true, lat: 44.8381, lng: 11.6198, cinema_count: 4 },
  { id: 'c-sassari', slug: 'sassari', name: 'Sassari', region: 'Sardegna', province: 'Sassari', province_code: 'SS', is_provincial_capital: true, lat: 40.7259, lng: 8.5556, cinema_count: 4 },
  { id: 'c-latina', slug: 'latina', name: 'Latina', region: 'Lazio', province: 'Latina', province_code: 'LT', is_provincial_capital: true, lat: 41.4676, lng: 12.9037, cinema_count: 4 },
  { id: 'c-monza', slug: 'monza', name: 'Monza', region: 'Lombardia', province: 'Monza e della Brianza', province_code: 'MB', is_provincial_capital: true, lat: 45.5845, lng: 9.2744, cinema_count: 5 },
  { id: 'c-siracusa', slug: 'siracusa', name: 'Siracusa', region: 'Sicilia', province: 'Siracusa', province_code: 'SR', is_provincial_capital: true, lat: 37.0755, lng: 15.2866, cinema_count: 3 },
  { id: 'c-pescara', slug: 'pescara', name: 'Pescara', region: 'Abruzzo', province: 'Pescara', province_code: 'PE', is_provincial_capital: true, lat: 42.4618, lng: 14.2161, cinema_count: 5 },
  { id: 'c-bergamo', slug: 'bergamo', name: 'Bergamo', region: 'Lombardia', province: 'Bergamo', province_code: 'BG', is_provincial_capital: true, lat: 45.6983, lng: 9.6773, cinema_count: 7 },
  { id: 'c-forli', slug: 'forli', name: 'Forlì', region: 'Emilia-Romagna', province: 'Forlì-Cesena', province_code: 'FC', is_provincial_capital: true, lat: 44.2227, lng: 12.0407, cinema_count: 3 },
  { id: 'c-trento', slug: 'trento', name: 'Trento', region: 'Trentino-Alto Adige/Südtirol', province: 'Trento', province_code: 'TN', is_provincial_capital: true, lat: 46.0748, lng: 11.1217, cinema_count: 4 },
  { id: 'c-vicenza', slug: 'vicenza', name: 'Vicenza', region: 'Veneto', province: 'Vicenza', province_code: 'VI', is_provincial_capital: true, lat: 45.5455, lng: 11.5354, cinema_count: 5 },
  { id: 'c-terni', slug: 'terni', name: 'Terni', region: 'Umbria', province: 'Terni', province_code: 'TR', is_provincial_capital: true, lat: 42.5641, lng: 12.6405, cinema_count: 3 },
  { id: 'c-bolzano', slug: 'bolzano', name: 'Bolzano', region: 'Trentino-Alto Adige/Südtirol', province: 'Bolzano/Bozen', province_code: 'BZ', is_provincial_capital: true, lat: 46.4983, lng: 11.3548, cinema_count: 4 },
  { id: 'c-novara', slug: 'novara', name: 'Novara', region: 'Piemonte', province: 'Novara', province_code: 'NO', is_provincial_capital: true, lat: 45.4469, lng: 8.6214, cinema_count: 3 },
  { id: 'c-piacenza', slug: 'piacenza', name: 'Piacenza', region: 'Emilia-Romagna', province: 'Piacenza', province_code: 'PC', is_provincial_capital: true, lat: 45.0526, lng: 9.6930, cinema_count: 4 },
  { id: 'c-ancona', slug: 'ancona', name: 'Ancona', region: 'Marche', province: 'Ancona', province_code: 'AN', is_provincial_capital: true, lat: 43.6158, lng: 13.5189, cinema_count: 4 },
  { id: 'c-andria', slug: 'andria', name: 'Andria', region: 'Puglia', province: 'Barletta-Andria-Trani', province_code: 'BT', is_provincial_capital: true, lat: 41.2269, lng: 16.2974, cinema_count: 2 },
  { id: 'c-arezzo', slug: 'arezzo', name: 'Arezzo', region: 'Toscana', province: 'Arezzo', province_code: 'AR', is_provincial_capital: true, lat: 43.4633, lng: 11.8797, cinema_count: 3 },
  { id: 'c-udine', slug: 'udine', name: 'Udine', region: 'Friuli-Venezia Giulia', province: 'Udine', province_code: 'UD', is_provincial_capital: true, lat: 46.0637, lng: 13.2446, cinema_count: 4 },
  { id: 'c-cesena', slug: 'cesena', name: 'Cesena', region: 'Emilia-Romagna', province: 'Forlì-Cesena', province_code: 'FC', is_provincial_capital: true, lat: 44.1396, lng: 12.2432, cinema_count: 3 },
  { id: 'c-lecce', slug: 'lecce', name: 'Lecce', region: 'Puglia', province: 'Lecce', province_code: 'LE', is_provincial_capital: true, lat: 40.3548, lng: 18.1724, cinema_count: 5 },
  { id: 'c-pesaro', slug: 'pesaro', name: 'Pesaro', region: 'Marche', province: 'Pesaro e Urbino', province_code: 'PU', is_provincial_capital: true, lat: 43.9102, lng: 12.9133, cinema_count: 3 },
  { id: 'c-barletta', slug: 'barletta', name: 'Barletta', region: 'Puglia', province: 'Barletta-Andria-Trani', province_code: 'BT', is_provincial_capital: true, lat: 41.3197, lng: 16.2825, cinema_count: 2 },
  { id: 'c-alessandria', slug: 'alessandria', name: 'Alessandria', region: 'Piemonte', province: 'Alessandria', province_code: 'AL', is_provincial_capital: true, lat: 44.9129, lng: 8.6152, cinema_count: 3 },
  { id: 'c-la-spezia', slug: 'la-spezia', name: 'La Spezia', region: 'Liguria', province: 'La Spezia', province_code: 'SP', is_provincial_capital: true, lat: 44.1105, lng: 9.8437, cinema_count: 3 },
  { id: 'c-pisa', slug: 'pisa', name: 'Pisa', region: 'Toscana', province: 'Pisa', province_code: 'PI', is_provincial_capital: true, lat: 43.7228, lng: 10.4017, cinema_count: 4 },
  { id: 'c-pistoia', slug: 'pistoia', name: 'Pistoia', region: 'Toscana', province: 'Pistoia', province_code: 'PT', is_provincial_capital: true, lat: 43.9333, lng: 10.9167, cinema_count: 3 },
  { id: 'c-lucca', slug: 'lucca', name: 'Lucca', region: 'Toscana', province: 'Lucca', province_code: 'LU', is_provincial_capital: true, lat: 43.8429, lng: 10.5027, cinema_count: 3 },
  { id: 'c-catanzaro', slug: 'catanzaro', name: 'Catanzaro', region: 'Calabria', province: 'Catanzaro', province_code: 'CZ', is_provincial_capital: true, lat: 38.9098, lng: 16.5877, cinema_count: 3 },
  { id: 'c-treviso', slug: 'treviso', name: 'Treviso', region: 'Veneto', province: 'Treviso', province_code: 'TV', is_provincial_capital: true, lat: 45.6669, lng: 12.2430, cinema_count: 4 },
  { id: 'c-brindisi', slug: 'brindisi', name: 'Brindisi', region: 'Puglia', province: 'Brindisi', province_code: 'BR', is_provincial_capital: true, lat: 40.6327, lng: 17.9418, cinema_count: 3 },
  { id: 'c-como', slug: 'como', name: 'Como', region: 'Lombardia', province: 'Como', province_code: 'CO', is_provincial_capital: true, lat: 45.8081, lng: 9.0852, cinema_count: 4 },
  { id: 'c-grosseto', slug: 'grosseto', name: 'Grosseto', region: 'Toscana', province: 'Grosseto', province_code: 'GR', is_provincial_capital: true, lat: 42.7606, lng: 11.1136, cinema_count: 3 },
  { id: 'c-varese', slug: 'varese', name: 'Varese', region: 'Lombardia', province: 'Varese', province_code: 'VA', is_provincial_capital: true, lat: 45.8206, lng: 8.8251, cinema_count: 4 },
  { id: 'c-asti', slug: 'asti', name: 'Asti', region: 'Piemonte', province: 'Asti', province_code: 'AT', is_provincial_capital: true, lat: 44.9008, lng: 8.2069, cinema_count: 2 },
  { id: 'c-caserta', slug: 'caserta', name: 'Caserta', region: 'Campania', province: 'Caserta', province_code: 'CE', is_provincial_capital: true, lat: 41.0726, lng: 14.3323, cinema_count: 4 },
  { id: 'c-ragusa', slug: 'ragusa', name: 'Ragusa', region: 'Sicilia', province: 'Ragusa', province_code: 'RG', is_provincial_capital: true, lat: 36.9269, lng: 14.7307, cinema_count: 3 },
  { id: 'c-pavia', slug: 'pavia', name: 'Pavia', region: 'Lombardia', province: 'Pavia', province_code: 'PV', is_provincial_capital: true, lat: 45.1847, lng: 9.1582, cinema_count: 3 },
  { id: 'c-cremona', slug: 'cremona', name: 'Cremona', region: 'Lombardia', province: 'Cremona', province_code: 'CR', is_provincial_capital: true, lat: 45.1336, lng: 10.0275, cinema_count: 3 },
  { id: 'c-laquila', slug: 'l-aquila', name: "L'Aquila", region: 'Abruzzo', province: 'L\'Aquila', province_code: 'AQ', is_provincial_capital: true, lat: 42.3498, lng: 13.3995, cinema_count: 3 },
  { id: 'c-trapani', slug: 'trapani', name: 'Trapani', region: 'Sicilia', province: 'Trapani', province_code: 'TP', is_provincial_capital: true, lat: 38.0176, lng: 12.5365, cinema_count: 2 },
  { id: 'c-viterbo', slug: 'viterbo', name: 'Viterbo', region: 'Lazio', province: 'Viterbo', province_code: 'VT', is_provincial_capital: true, lat: 42.4174, lng: 12.1047, cinema_count: 3 },
  { id: 'c-cosenza', slug: 'cosenza', name: 'Cosenza', region: 'Calabria', province: 'Cosenza', province_code: 'CS', is_provincial_capital: true, lat: 39.3099, lng: 16.2502, cinema_count: 3 },
  { id: 'c-potenza', slug: 'potenza', name: 'Potenza', region: 'Basilicata', province: 'Potenza', province_code: 'PZ', is_provincial_capital: true, lat: 40.6404, lng: 15.8056, cinema_count: 3 },
  { id: 'c-crotone', slug: 'crotone', name: 'Crotone', region: 'Calabria', province: 'Crotone', province_code: 'KR', is_provincial_capital: true, lat: 39.0808, lng: 17.1272, cinema_count: 2 },
  { id: 'c-savona', slug: 'savona', name: 'Savona', region: 'Liguria', province: 'Savona', province_code: 'SV', is_provincial_capital: true, lat: 44.3080, lng: 8.4810, cinema_count: 3 },
  { id: 'c-matera', slug: 'matera', name: 'Matera', region: 'Basilicata', province: 'Matera', province_code: 'MT', is_provincial_capital: true, lat: 40.6664, lng: 16.6043, cinema_count: 3 },
  { id: 'c-benevento', slug: 'benevento', name: 'Benevento', region: 'Campania', province: 'Benevento', province_code: 'BN', is_provincial_capital: true, lat: 41.1307, lng: 14.7816, cinema_count: 2 },
  { id: 'c-agrigento', slug: 'agrigento', name: 'Agrigento', region: 'Sicilia', province: 'Agrigento', province_code: 'AG', is_provincial_capital: true, lat: 37.3111, lng: 13.5765, cinema_count: 3 },
  { id: 'c-avellino', slug: 'avellino', name: 'Avellino', region: 'Campania', province: 'Avellino', province_code: 'AV', is_provincial_capital: true, lat: 40.9147, lng: 14.7906, cinema_count: 2 },
  { id: 'c-aosta', slug: 'aosta', name: 'Aosta', region: 'Valle d\'Aosta/Vallée d\'Aoste', province: 'Valle d\'Aosta/Vallée d\'Aoste', province_code: 'AO', is_provincial_capital: true, lat: 45.7373, lng: 7.3195, cinema_count: 2 },
  { id: 'c-melzo', slug: 'melzo', name: 'Melzo', region: 'Lombardia', province: 'Milano', province_code: 'MI', is_provincial_capital: false, lat: 45.5000, lng: 9.4200, cinema_count: 1 },
  { id: 'c-campi-bisenzio', slug: 'campi-bisenzio', name: 'Campi Bisenzio', region: 'Toscana', province: 'Firenze', province_code: 'FI', is_provincial_capital: false, lat: 43.8242, lng: 11.1342, cinema_count: 1 },
  { id: 'c-marcon', slug: 'marcon', name: 'Marcon', region: 'Veneto', province: 'Venezia', province_code: 'VE', is_provincial_capital: false, lat: 45.5539, lng: 12.2961, cinema_count: 1 },
  { id: 'c-sesto-san-giovanni', slug: 'sesto-san-giovanni', name: 'Sesto San Giovanni', region: 'Lombardia', province: 'Milano', province_code: 'MI', is_provincial_capital: false, lat: 45.5328, lng: 9.2272, cinema_count: 2 },
  { id: 'c-sanremo', slug: 'sanremo', name: 'Sanremo', region: 'Liguria', province: 'Imperia', province_code: 'IM', is_provincial_capital: false, lat: 43.8160, lng: 7.7766, cinema_count: 2 },
  { id: 'c-cortina', slug: 'cortina-d-ampezzo', name: "Cortina d'Ampezzo", region: 'Veneto', province: 'Belluno', province_code: 'BL', is_provincial_capital: false, lat: 46.5405, lng: 12.1357, cinema_count: 1 },
  { id: 'c-taormina', slug: 'taormina', name: 'Taormina', region: 'Sicilia', province: 'Messina', province_code: 'ME', is_provincial_capital: false, lat: 37.8516, lng: 15.2853, cinema_count: 1 },
];

const INITIAL_CINEMAS: Cinema[] = [
  // MILANO & LOMBARDIA
  {
    id: 'cin-uci-bicocca',
    city_id: 'c-milano',
    name: 'UCI Cinemas Bicocca',
    chain: 'UCI',
    address: 'Via Chiese 60, 20126 Milano (Centro Sarca / Bicocca Village)',
    lat: 45.5244,
    lng: 9.2144,
    website_url: 'https://www.ucicinemas.it/cinema/lombardia/milano/uci-cinemas-bicocca-milano/',
    features: ['IMAX', 'Dolby Atmos', 'Poltrone VIP Recliner', '18 Sale']
  },
  {
    id: 'cin-space-odeon',
    city_id: 'c-milano',
    name: 'The Space Cinema Milano Duomo',
    chain: 'The Space Cinema',
    address: 'Via Santa Radegonda 8, 20121 Milano (Duomo)',
    lat: 45.4658,
    lng: 9.1915,
    website_url: 'https://www.thespacecinema.it/cinema/milano',
    features: ['Laser 4K', 'Dolby Surround 7.1', 'Centro Storico']
  },
  {
    id: 'cin-anteo-palazzo',
    city_id: 'c-milano',
    name: 'Anteo Palazzo del Cinema',
    chain: 'Anteo',
    address: 'Piazza XXV Aprile 8, 20121 Milano (Garibaldi / Moscova)',
    lat: 45.4808,
    lng: 9.1884,
    website_url: 'https://www.spaziocinema.info/cinema/anteo-palazzo-del-cinema',
    features: ['Sala Astra', 'Caffè Letterario', 'Film in V.O. Sottotitolati', 'Cinema d\'Autore']
  },
  {
    id: 'cin-citylife-anteo',
    city_id: 'c-milano',
    name: 'CityLife Anteo',
    chain: 'Anteo',
    address: 'Piazza Tre Torri 1, 20145 Milano (CityLife Shopping District)',
    lat: 45.4776,
    lng: 9.1558,
    website_url: 'https://www.spaziocinema.info/cinema/citylife-anteo',
    features: ['Laser 4K', 'Dolby Atmos', 'Architettura Zaha Hadid']
  },
  {
    id: 'cin-notorious-sesto',
    city_id: 'c-sesto-san-giovanni',
    name: 'Notorious Cinemas Sesto San Giovanni',
    chain: 'Notorious',
    address: 'Via Milanese, 20099 Sesto San Giovanni MI (Centro Sarca)',
    lat: 45.5283,
    lng: 9.2241,
    website_url: 'https://www.notoriouscinemas.it/cinema/sesto-san-giovanni',
    features: ['Poltrone Recliner Elettriche', 'Audio Spaziale', 'Bar Gourmet']
  },
  {
    id: 'cin-arcadia-melzo',
    city_id: 'c-melzo',
    name: 'Arcadia Cinema Melzo — Sala Energia',
    chain: 'Arcadia',
    address: 'Via Martiri della Libertà 5, 20066 Melzo MI',
    lat: 45.4982,
    lng: 9.4231,
    website_url: 'https://www.arcadiacinema.com/melzo',
    features: ['Sala Energia (Schermo 30m)', 'Dolby Atmos Meyer Sound', '70mm Panavision', 'Miglior Sala d\'Europa']
  },
  {
    id: 'cin-arcadia-stezzano',
    city_id: 'c-bergamo',
    name: 'Arcadia Stezzano (Le Due Torri)',
    chain: 'Arcadia',
    address: 'Via Guzzanica 62/64, 24040 Stezzano BG',
    lat: 45.6512,
    lng: 9.6480,
    website_url: 'https://www.arcadiacinema.com/stezzano',
    features: ['Dolby Atmos', 'Laser 4K Christie', 'Poltrone Comfort']
  },
  // ROMA & LAZIO
  {
    id: 'cin-uci-porta-roma',
    city_id: 'c-roma',
    name: 'UCI Cinemas Porta di Roma',
    chain: 'UCI',
    address: 'Via Alberto Lionello 201, 00139 Roma (Galleria Commerciale Porta di Roma)',
    lat: 41.9748,
    lng: 12.5372,
    website_url: 'https://www.ucicinemas.it/cinema/lazio/roma/uci-cinemas-porta-di-roma/',
    features: ['IMAX', 'ISense Dolby Atmos', '14 Sale Digitali', 'Parcheggio Gratuito']
  },
  {
    id: 'cin-space-parco-medici',
    city_id: 'c-roma',
    name: 'The Space Cinema Parco de\' Medici',
    chain: 'The Space Cinema',
    address: 'Via Salvatore Rebecchini 3, 00148 Roma',
    lat: 41.8315,
    lng: 12.3995,
    website_url: 'https://www.thespacecinema.it/cinema/roma-parco-de-medici',
    features: ['18 Sale', 'Dolby Atmos', 'Poltrone VIP Recliner']
  },
  {
    id: 'cin-troisi-roma',
    city_id: 'c-roma',
    name: 'Cinema Troisi (Piccolo America)',
    chain: 'independent',
    address: 'Via Girolamo Induno 1, 00153 Roma (Trastevere)',
    lat: 41.8845,
    lng: 12.4722,
    website_url: 'https://cinematroisi.it',
    features: ['Aperto 24/7', 'Aula Studio', 'Proiezioni 35mm e 4K', 'Bar Bio']
  },
  {
    id: 'cin-farnese-roma',
    city_id: 'c-roma',
    name: 'Cinema Farnese Arthouse',
    chain: 'independent',
    address: 'Piazza Campo de\' Fiori 56, 00186 Roma',
    lat: 41.8956,
    lng: 12.4722,
    website_url: 'https://cinemafarnese.it',
    features: ['Cinema Storico dal 1930', 'Rassegne d\'Autore', 'Lingua Originale VOSE']
  },
  // FIRENZE & TOSCANA
  {
    id: 'cin-uci-campi-bisenzio',
    city_id: 'c-campi-bisenzio',
    name: 'UCI Luxe Campi Bisenzio',
    chain: 'UCI',
    address: 'Via Fratelli Cervi 9, 50013 Campi Bisenzio FI (I Gigli)',
    lat: 43.8260,
    lng: 11.1415,
    website_url: 'https://www.ucicinemas.it/cinema/toscana/firenze/uci-luxe-campi-bisenzio-firenze/',
    features: ['iSense Atmos', 'Tutte Poltrone Recliner VIP', 'Menu Gourmet in Sala']
  },
  {
    id: 'cin-space-firenze',
    city_id: 'c-firenze',
    name: 'The Space Cinema Firenze',
    chain: 'The Space Cinema',
    address: 'Via di Novoli 42, 50127 Firenze',
    lat: 43.7915,
    lng: 11.2225,
    website_url: 'https://www.thespacecinema.it/cinema/firenze',
    features: ['Dolby 7.1', 'Sale Climatizzate', 'Parcheggio Convenzionato']
  },
  // BOLOGNA & EMILIA-ROMAGNA
  {
    id: 'cin-space-bologna',
    city_id: 'c-bologna',
    name: 'The Space Cinema Bologna',
    chain: 'The Space Cinema',
    address: 'Viale Tito Carnacini 35, 40127 Bologna',
    lat: 44.5205,
    lng: 11.3785,
    website_url: 'https://www.thespacecinema.it/cinema/bologna',
    features: ['Poltrone Recliner', 'Audio Tri-Amp', 'Easy Park']
  },
  {
    id: 'cin-modernissimo-bologna',
    city_id: 'c-bologna',
    name: 'Cinema Modernissimo (Cineteca di Bologna)',
    chain: 'independent',
    address: 'Piazza Re Enzo 1, 40124 Bologna',
    lat: 44.4942,
    lng: 11.3430,
    website_url: 'https://cinetecadibologna.it/cinema-modernissimo/',
    features: ['Restauro Belle Époque', 'Pellicola 35mm e 70mm', 'Cineteca Nazionale']
  },
  // TORINO & PIEMONTE
  {
    id: 'cin-uci-lingotto',
    city_id: 'c-torino',
    name: 'UCI Cinemas Lingotto',
    chain: 'UCI',
    address: 'Via Nizza 262, 10126 Torino (Centro 8 Gallery Lingotto)',
    lat: 45.0315,
    lng: 7.6660,
    website_url: 'https://www.ucicinemas.it/cinema/piemonte/torino/uci-cinemas-lingotto-torino/',
    features: ['ISense Dolby Atmos', '11 Sale', 'Accesso Diretto Metro Lingotto']
  },
  {
    id: 'cin-massimo-torino',
    city_id: 'c-torino',
    name: 'Cinema Massimo (Museo Nazionale del Cinema)',
    chain: 'independent',
    address: 'Via Giuseppe Verdi 18, 10124 Torino',
    lat: 45.0682,
    lng: 7.6931,
    website_url: 'https://www.museocinema.it/it/cinema-massimo',
    features: ['Tre Sale Storiche', 'Festival e Rassegne Internazionali', 'Archivio Storico']
  },
  // NAPOLI & CAMPANIA
  {
    id: 'cin-space-napoli',
    city_id: 'c-napoli',
    name: 'The Space Cinema Napoli',
    chain: 'The Space Cinema',
    address: 'Viale Giochi del Mediterraneo, 80125 Napoli (Fuorigrotta)',
    lat: 40.8265,
    lng: 14.1785,
    website_url: 'https://www.thespacecinema.it/cinema/napoli',
    features: ['11 Sale', 'Poltrone VIP', 'Dolby Surround']
  },
  {
    id: 'cin-modernissimo-napoli',
    city_id: 'c-napoli',
    name: 'Cinema Modernissimo Napoli',
    chain: 'independent',
    address: 'Via Cisterna dell\'Olio 49, 80134 Napoli',
    lat: 40.8492,
    lng: 14.2505,
    website_url: 'https://modernissimonapoli.it',
    features: ['5 Sale nel Cuore di Napoli', 'Cinema Indipendente e Grandi Uscite', 'Ticketing 18Tickets']
  },
  // GENOVA & LIGURIA
  {
    id: 'cin-uci-fiumara',
    city_id: 'c-genova',
    name: 'UCI Cinemas Fiumara',
    chain: 'UCI',
    address: 'Via Fiumara 15, 16149 Genova Sampierdarena',
    lat: 44.4125,
    lng: 8.8875,
    website_url: 'https://www.ucicinemas.it/cinema/liguria/genova/uci-cinemas-fiumara-genova/',
    features: ['14 Sale', 'ISense Dolby Atmos', 'Poltrone VIP']
  },
  // BARI & PUGLIA
  {
    id: 'cin-uci-molfetta',
    city_id: 'c-bari',
    name: 'UCI Cinemas Showville Bari',
    chain: 'UCI',
    address: 'Via Giannini 9, 70125 Bari (Mungivacca)',
    lat: 41.0965,
    lng: 16.8905,
    website_url: 'https://www.ucicinemas.it/cinema/puglia/bari/uci-cinemas-showville-bari/',
    features: ['8 Sale', 'Audio Digitale', 'Ampio Parcheggio']
  },
  // VENEZIA & VENETO
  {
    id: 'cin-uci-marcon',
    city_id: 'c-marcon',
    name: 'UCI Cinemas Marcon (Valecenter)',
    chain: 'UCI',
    address: 'Via Mattei 1, 30020 Marcon VE',
    lat: 45.5539,
    lng: 12.2961,
    website_url: 'https://www.ucicinemas.it/cinema/veneto/venezia/uci-cinemas-marcon-venezia/',
    features: ['12 Sale', 'Dolby Atmos', 'Poltrone Recliner']
  },
  // PALERMO & SICILIA
  {
    id: 'cin-space-palermo',
    city_id: 'c-palermo',
    name: 'The Space Cinema Palermo (Forum)',
    chain: 'The Space Cinema',
    address: 'Via Filippo Pecoraino, 90124 Palermo (Centro Forum)',
    lat: 38.0935,
    lng: 13.4145,
    website_url: 'https://www.thespacecinema.it/cinema/palermo',
    features: ['7 Sale', 'Dolby Digital 3D', 'Poltrone VIP']
  },
  // CAGLIARI & SARDEGNA
  {
    id: 'cin-space-quartucciu',
    city_id: 'c-cagliari',
    name: 'The Space Cinema Quartucciu',
    chain: 'The Space Cinema',
    address: 'Via delle Serre, 09044 Quartucciu CA (Le Vele)',
    lat: 39.2550,
    lng: 9.1770,
    website_url: 'https://www.thespacecinema.it/cinema/quartucciu',
    features: ['9 Sale', 'Poltrone Recliner', 'Dolby Atmos']
  }
];

const INITIAL_MOVIES: Movie[] = [
  {
    id: 'mov-dune-2',
    slug: 'dune-parte-due',
    title_it: 'Dune: Parte Due',
    title_en: 'Dune: Part Two',
    title_original: 'Dune: Part Two',
    tmdb_id: 693134,
    poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    backdrop_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1600&auto=format&fit=crop',
    genres: ['Fantascienza', 'Avventura', 'Azione', 'Dramma'],
    duration_minutes: 166,
    rating: 8.7,
    synopsis_it: 'Paul Atreides si unisce a Chani e ai Fremen mentre trama la vendetta contro i cospiratori che hanno distrutto la sua famiglia. Di fronte a una scelta tra l\'amore della sua vita e il destino dell\'universo conosciuto, intraprende una missione per prevenire un futuro terribile che solo lui può prevedere.',
    synopsis_en: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee.',
    release_year: 2024,
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Javier Bardem', 'Austin Butler', 'Florence Pugh'],
    age_rating: '6+',
    is_featured: true
  },
  {
    id: 'mov-parthenope',
    slug: 'parthenope',
    title_it: 'Parthenope',
    title_en: 'Parthenope',
    title_original: 'Parthenope',
    tmdb_id: 1146200,
    poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    backdrop_url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1600&auto=format&fit=crop',
    genres: ['Dramma', 'Fantastico'],
    duration_minutes: 136,
    rating: 7.6,
    synopsis_it: 'Il lungo viaggio della vita di Parthenope, dalla sua nascita nel 1950 fino a oggi. Un\'epopea al femminile priva di eroismi, ma colma di un\'inestinguibile passione per la libertà, per Napoli e per gli imprevedibili volti dell\'amore.',
    synopsis_en: 'The long journey of Parthenope\'s life, from her birth in 1950 to today. A female epic devoid of heroism, but full of an inextinguishable passion for freedom, for Naples, and for the unpredictable faces of love.',
    release_year: 2024,
    director: 'Paolo Sorrentino',
    cast: ['Celeste Dalla Porta', 'Stefania Sandrelli', 'Gary Oldman', 'Silvio Orlando', 'Luisa Ranieri'],
    age_rating: 'VM14',
    is_featured: true
  },
  {
    id: 'mov-vermiglio',
    slug: 'vermiglio',
    title_it: 'Vermiglio',
    title_en: 'Vermiglio: The Mountain Bride',
    title_original: 'Vermiglio',
    tmdb_id: 1251398,
    poster_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop',
    backdrop_url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop',
    genres: ['Dramma', 'Storico'],
    duration_minutes: 119,
    rating: 8.2,
    synopsis_it: 'Nel 1944, in un remoto villaggio di montagna delle Alpi trentine, l\'arrivo di un soldato rifugiato sconvolge la vita della famiglia del maestro elementare, cambiando per sempre il destino delle sue figlie. Vincitore del Leone d\'Argento alla Mostra del Cinema di Venezia.',
    synopsis_en: 'In 1944, in a secluded alpine village in Trentino, the arrival of a deserting soldier alters the quiet routine of the local schoolmaster\'s family, forever transforming his daughters\' futures. Silver Lion winner at Venice Film Festival.',
    release_year: 2024,
    director: 'Maura Delpero',
    cast: ['Tommaso Ragno', 'Roberta Rovelli', 'Martina Scrinzi', 'Giuseppe De Domenico'],
    age_rating: 'T',
    is_featured: true
  },
  {
    id: 'mov-gladiatore-2',
    slug: 'il-gladiatore-ii',
    title_it: 'Il Gladiatore II',
    title_en: 'Gladiator II',
    title_original: 'Gladiator II',
    tmdb_id: 558449,
    poster_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=800&auto=format&fit=crop',
    backdrop_url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1600&auto=format&fit=crop',
    genres: ['Azione', 'Avventura', 'Dramma', 'Storico'],
    duration_minutes: 148,
    rating: 7.9,
    synopsis_it: 'Anni dopo aver assistito alla tragica morte del venerato eroe Massimo per mano dello zio, Lucio deve entrare nel Colosseo dopo che la sua casa è stata conquistata dai tirannici imperatori che ora guidano Roma con il pugno di ferro.',
    synopsis_en: 'Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius must enter the Colosseum after his home is conquered by the tyrannical Emperors who now lead Rome with an iron fist.',
    release_year: 2024,
    director: 'Ridley Scott',
    cast: ['Paul Mescal', 'Pedro Pascal', 'Denzel Washington', 'Connie Nielsen', 'Joseph Quinn'],
    age_rating: 'VM14',
    is_featured: true
  },
  {
    id: 'mov-the-substance',
    slug: 'the-substance',
    title_it: 'The Substance',
    title_en: 'The Substance',
    title_original: 'The Substance',
    tmdb_id: 933260,
    poster_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=800&auto=format&fit=crop',
    backdrop_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop',
    genres: ['Horror', 'Fantascienza', 'Dramma'],
    duration_minutes: 141,
    rating: 8.1,
    synopsis_it: 'Una celebrità in declino decide di utilizzare un farmaco del mercato nero, una sostanza che replica le cellule e crea temporaneamente una versione più giovane e migliore di se stessa. Premio per la miglior sceneggiatura a Cannes.',
    synopsis_en: 'A fading celebrity decides to use a black market drug, a cell-replicating substance that temporarily creates a younger, better version of herself. Best Screenplay winner at Cannes.',
    release_year: 2024,
    director: 'Coralie Fargeat',
    cast: ['Demi Moore', 'Margaret Qualley', 'Dennis Quaid'],
    age_rating: 'VM14',
    is_featured: false
  },
  {
    id: 'mov-anora',
    slug: 'anora',
    title_it: 'Anora',
    title_en: 'Anora',
    title_original: 'Anora',
    tmdb_id: 1064213,
    poster_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=800&auto=format&fit=crop',
    backdrop_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1600&auto=format&fit=crop',
    genres: ['Commedia', 'Dramma', 'Romance'],
    duration_minutes: 139,
    rating: 8.3,
    synopsis_it: 'Anora, una giovane sex worker di Brooklyn, ha la possibilità di vivere una favola quando incontra e sposa impulsivamente il figlio di un oligarca russo. La notizia arriva in Russia e la fiaba rischia di infrangersi. Palma d\'Oro al Festival di Cannes.',
    synopsis_en: 'Anora, a young sex worker from Brooklyn, gets her chance at a Cinderella story when she meets and impulsively marries the son of an oligarch. Once the news reaches Russia, her fairytale is threatened as the parents set out for New York to get the marriage annulled. Palme d\'Or winner.',
    release_year: 2024,
    director: 'Sean Baker',
    cast: ['Mikey Madison', 'Mark Eydelshteyn', 'Yura Borisov', 'Karren Karagulian'],
    age_rating: 'VM14',
    is_featured: false
  },
  {
    id: 'mov-il-ragazzo-e-l-airone',
    slug: 'il-ragazzo-e-l-airone',
    title_it: 'Il Ragazzo e l\'Airone',
    title_en: 'The Boy and the Heron',
    title_original: 'Kimitachi wa Dō Ikiru ka',
    tmdb_id: 508883,
    poster_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
    backdrop_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1600&auto=format&fit=crop',
    genres: ['Animazione', 'Avventura', 'Fantastico'],
    duration_minutes: 124,
    rating: 8.4,
    synopsis_it: 'Spinto dal desiderio di rivedere sua madre, il giovane Mahito si avventura in un regno incantato condiviso dai vivi e dai morti, guidato da un misterioso airone cenerino parlante. Capolavoro vincitore del Premio Oscar.',
    synopsis_en: 'While yearning for his deceased mother, a young boy named Mahito ventures into a world shared by the living and the dead, guided by a talking grey heron. Academy Award winning masterpiece by Hayao Miyazaki.',
    release_year: 2023,
    director: 'Hayao Miyazaki',
    cast: ['Soma Santoki', 'Masaki Suda', 'Aimyon', 'Yoshino Kimura'],
    age_rating: 'T',
    is_featured: false
  },
  {
    id: 'mov-ce-ancora-domani',
    slug: 'c-e-ancora-domani',
    title_it: 'C\'è ancora domani',
    title_en: 'There\'s Still Tomorrow',
    title_original: 'C\'è ancora domani',
    tmdb_id: 1151534,
    poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
    backdrop_url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1600&auto=format&fit=crop',
    genres: ['Dramma', 'Commedia', 'Storico'],
    duration_minutes: 118,
    rating: 8.8,
    synopsis_it: 'Roma, seconda metà degli anni Quaranta. Delia è la moglie di Ivano e madre di tre figli. Ruoli che la definiscono e di cui si accontenta, finché l\'arrivo di una lettera misteriosa non le accende il coraggio di rovesciare i piani prestabiliti.',
    synopsis_en: 'Rome, mid-1940s. Delia is a devoted wife and mother living in post-war Italy. When a mysterious letter arrives, she finds the courage to envision a different future and stand up for her dignity. Record-breaking Italian box office phenomenon.',
    release_year: 2023,
    director: 'Paola Cortellesi',
    cast: ['Paola Cortellesi', 'Valerio Mastandrea', 'Romana Maggiora Vergano', 'Emanuela Fanelli'],
    age_rating: 'T',
    is_featured: false
  }
];

function generateShowtimes(): Showtime[] {
  const dates = [
    new Date().toISOString().split('T')[0],
    new Date(Date.now() + 86400000).toISOString().split('T')[0],
    new Date(Date.now() + 172800000).toISOString().split('T')[0]
  ];

  const times = ['15:30', '17:45', '19:30', '21:00', '22:15'];
  const formats: ('2D' | '3D' | 'IMAX' | 'ISense' | 'Atmos')[] = ['2D', '2D', 'IMAX', 'Atmos', 'ISense'];
  const languages: ('IT' | 'VOSE' | 'OV')[] = ['IT', 'IT', 'VOSE', 'IT', 'OV'];

  const results: Showtime[] = [];
  let count = 1;

  INITIAL_CINEMAS.forEach(cinema => {
    INITIAL_MOVIES.slice(0, 5).forEach((movie, mIdx) => {
      dates.forEach((date, dIdx) => {
        const timeSlot = times[(mIdx + dIdx) % times.length];
        const format = (cinema.features?.some(f => f.includes('IMAX')) && mIdx === 0) ? 'IMAX' :
                       (cinema.features?.some(f => f.includes('Atmos')) && mIdx === 1) ? 'Atmos' :
                       formats[(mIdx + count) % formats.length];
        const language = (mIdx % 2 === 1) ? 'VOSE' : 'IT';

        // Target ticket url points to official ticketing source
        let ticketUrl = cinema.website_url;
        let ticketSource: Showtime['ticket_source'] = 'chain site';

        if (cinema.chain === 'independent') {
          if (cinema.id.includes('troisi') || cinema.id.includes('modernissimo')) {
            ticketUrl = `https://${cinema.id}.18tickets.it/film/${movie.slug}`;
            ticketSource = '18tickets';
          } else if (cinema.id.includes('farnese')) {
            ticketUrl = `https://www.liveticket.it/evento.aspx?Id=${count + 2000}`;
            ticketSource = 'liveticket';
          } else {
            ticketUrl = `https://www.vivaticket.it/it/event/${movie.slug}/${count + 4000}`;
            ticketSource = 'vivaticket';
          }
        } else if (cinema.chain === 'UCI') {
          ticketUrl = `${cinema.website_url}?film=${movie.slug}&time=${timeSlot.replace(':', '')}`;
          ticketSource = 'chain site';
        } else if (cinema.chain === 'The Space Cinema') {
          ticketUrl = `${cinema.website_url}?scheda-film=${movie.slug}`;
          ticketSource = 'chain site';
        } else if (cinema.chain === 'Arcadia') {
          ticketUrl = `https://www.arcadiacinema.com/biglietteria/${movie.slug}`;
          ticketSource = 'chain site';
        } else if (cinema.chain === 'Notorious') {
          ticketUrl = `https://www.notoriouscinemas.it/prenota/${movie.slug}`;
          ticketSource = 'chain site';
        } else if (cinema.chain === 'Anteo') {
          ticketUrl = `https://www.spaziocinema.info/biglietti/${cinema.id}/${movie.slug}`;
          ticketSource = 'chain site';
        }

        results.push({
          id: `st-${count++}`,
          movie_id: movie.id,
          cinema_id: cinema.id,
          show_date: date,
          time: timeSlot,
          format: format as any,
          language: language as any,
          ticket_url: ticketUrl,
          ticket_source: ticketSource,
          active: true,
          scraped_at: new Date().toISOString()
        });
      });
    });
  });

  return results;
}

const INITIAL_LOGS: ScrapeLog[] = [
  {
    id: 'log-1',
    run_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    source: 'MYmovies.it + Chain Locators',
    cities_touched: 64,
    cinemas_touched: 24,
    movies_touched: 8,
    showtimes_touched: 360,
    firecrawl_credits_used: 12,
    status: 'success',
    details: 'Routine daily HTTP scrape completed successfully across Italian multiplexes (UCI, The Space, Notorious, Arcadia, Anteo) and independent circuits. TMDb metadata enriched for 8 titles.'
  },
  {
    id: 'log-2',
    run_at: new Date(Date.now() - 3600000 * 28).toISOString(),
    source: 'ComingSoon.it Trovacinema + Firecrawl Map',
    cities_touched: 60,
    cinemas_touched: 24,
    movies_touched: 7,
    showtimes_touched: 340,
    firecrawl_credits_used: 4,
    status: 'success',
    details: 'Full nationwide sync finished. Ticket links verified for 18Tickets, Vivaticket, Liveticket and chain domains.'
  }
];

const INITIAL_SETTINGS: SiteSettings = {
  homepage_headline_it: 'Tutti i cinema e gli orari dei film in Italia',
  homepage_headline_en: 'Every cinema and showtime across Italy',
  homepage_subtext_it: 'Scopri cosa c\'è in sala vicino a te, cerca per qualsiasi comune italiano e acquista i biglietti sui canali ufficiali.',
  homepage_subtext_en: 'Find what\'s playing near you, search any Italian city, and purchase tickets directly from official cinema portals.',
  featured_movie_ids: ['mov-dune-2', 'mov-parthenope', 'mov-vermiglio', 'mov-gladiatore-2'],
  footer_text_it: 'CineVicino — La directory del cinema in Italia. Dati film forniti da TMDb. Reindirizzamento diretto alle biglietterie ufficiali (UCI, The Space Cinema, Notorious, Arcadia, Anteo, 18Tickets, Vivaticket, Liveticket).',
  footer_text_en: 'CineVicino — Italy\'s Cinema Directory. Film data powered by TMDb. Direct outbound links to official ticketing platforms.',
  privacy_policy_it: 'CineVicino rispetta la tua privacy. La geolocalizzazione viene utilizzata esclusivamente in locale per calcolare la distanza dai cinema e non viene mai memorizzata sui nostri server.',
  privacy_policy_en: 'CineVicino respects your privacy. Geolocation is processed exclusively on-device to compute cinema distance and is never stored on our servers.',
  firecrawl_monthly_limit: 1000,
  firecrawl_credits_used: 24
};

// In-Memory Database Store with Real-time Reactivity
class DatabaseStore {
  cities: City[] = [...INITIAL_CITIES];
  cinemas: Cinema[] = [...INITIAL_CINEMAS];
  movies: Movie[] = [...INITIAL_MOVIES];
  showtimes: Showtime[] = generateShowtimes();
  users: User[] = [
    {
      id: 'usr-admin',
      email: 'admin@cinevicino.it',
      name: 'Admin CineVicino',
      is_admin: true,
      created_at: new Date().toISOString()
    }
  ];
  favorites: Favorite[] = [];
  alertSubscriptions: AlertSubscription[] = [];
  scrapeLogs: ScrapeLog[] = [...INITIAL_LOGS];
  settings: SiteSettings = { ...INITIAL_SETTINGS };

  constructor() {
    this.hydrateFromCSV();
  }

  // Load ISTAT comuni from data/comuni-italia-istat.csv
  hydrateFromCSV() {
    try {
      const csvPath = path.join(process.cwd(), 'data', 'comuni-italia-istat.csv');
      if (fs.existsSync(csvPath)) {
        const raw = fs.readFileSync(csvPath, 'utf-8');
        const lines = raw.split('\n');
        const existingSlugs = new Set(this.cities.map(c => c.slug));

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const [slug, name, region, province, province_code, is_provincial_capital, cadastral_code] = line.split(',');
          if (slug && name && !existingSlugs.has(slug)) {
            // Find nearby capital coords as fallback baseline if needed
            const capital = this.cities.find(c => c.province_code === province_code || c.region === region) || this.cities[0];
            const jitterLat = (Math.random() - 0.5) * 0.12;
            const jitterLng = (Math.random() - 0.5) * 0.12;

            this.cities.push({
              id: `c-${slug}`,
              slug,
              name,
              region,
              province,
              province_code,
              is_provincial_capital: is_provincial_capital?.toLowerCase() === 'true',
              cadastral_code,
              lat: Number((capital.lat + jitterLat).toFixed(4)),
              lng: Number((capital.lng + jitterLng).toFixed(4)),
              cinema_count: 0
            });
            existingSlugs.add(slug);
          }
        }
      }
    } catch (e) {
      console.warn('CSV hydration warning:', e);
    }
  }

  // Haversine Distance helper (returns km)
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  }

  findNearbyCinemas(lat: number, lng: number, radiusKm: number = 50) {
    return this.cinemas
      .map(cinema => {
        const distance = this.calculateDistance(lat, lng, cinema.lat, cinema.lng);
        const city = this.cities.find(c => c.id === cinema.city_id);
        return {
          ...cinema,
          city_name: city?.name || '',
          city_slug: city?.slug || '',
          distance_km: distance
        };
      })
      .sort((a, b) => a.distance_km - b.distance_km);
  }

  findNearestCinemasForCity(citySlug: string) {
    const city = this.cities.find(c => c.slug === citySlug);
    if (!city) return [];
    return this.findNearbyCinemas(city.lat, city.lng);
  }
}

export const dbStore = new DatabaseStore();
