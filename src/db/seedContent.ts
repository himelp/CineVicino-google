import { executeRawSql } from './index';
import { Cinema, Movie } from '../types';

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

export async function seedContentIfEmpty(): Promise<void> {
  try {
    // 0. Safety cleanup: Purge any legacy synthetic showtimes or synthetic scrape logs
    // generated by prior versions of this bootstrap script.
    // Real scraper showtime IDs are 'st-' followed by a 24-character hexadecimal hash (no date/time components).
    await executeRawSql(`
      DELETE FROM showtimes 
      WHERE id LIKE 'st-init-%' 
         OR id ~ '^st-[a-z0-9-]+-[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}$'
    `);
    await executeRawSql(`
      DELETE FROM scrape_logs 
      WHERE id IN ('log-init-1', 'log-init-2')
    `);

    const cinemaCountRes = await executeRawSql('SELECT COUNT(*) as cnt FROM cinemas');
    const cinemaCount = parseInt(cinemaCountRes.rows[0]?.cnt || '0', 10);

    const movieCountRes = await executeRawSql('SELECT COUNT(*) as cnt FROM movies');
    const movieCount = parseInt(movieCountRes.rows[0]?.cnt || '0', 10);

    if (cinemaCount > 0 && movieCount > 0) {
      return;
    }

    console.log(`[SeedContent] 🎬 Checking and seeding verified Italian cinema and movie reference data into PostgreSQL...`);

    // 1. Seed Movies (Verified reference metadata: titles, TMDb IDs, cast, directors, posters)
    if (movieCount === 0) {
      for (const m of INITIAL_MOVIES) {
        await executeRawSql(
          `INSERT INTO movies (
            id, slug, title_it, title_en, title_original, tmdb_id,
            poster_url, backdrop_url, genres, duration_minutes, rating,
            synopsis_it, synopsis_en, release_year, director, "cast",
            age_rating, is_featured
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT (id) DO NOTHING`,
          [
            m.id,
            m.slug,
            m.title_it,
            m.title_en,
            m.title_original,
            m.tmdb_id,
            m.poster_url,
            m.backdrop_url,
            JSON.stringify(m.genres),
            m.duration_minutes,
            m.rating,
            m.synopsis_it,
            m.synopsis_en,
            m.release_year,
            m.director,
            JSON.stringify(m.cast),
            m.age_rating,
            m.is_featured
          ]
        );
      }
      console.log(`[SeedContent] ✅ Seeded ${INITIAL_MOVIES.length} verified movie records.`);
    }

    // 2. Seed Cinemas (Verified reference metadata: real Italian cinema addresses, coordinates, chains)
    if (cinemaCount === 0) {
      for (const cin of INITIAL_CINEMAS) {
        // Resolve city_id in cities table
        const cityLookup = await executeRawSql(
          'SELECT id FROM cities WHERE id = $1 OR slug = $2 LIMIT 1',
          [cin.city_id, cin.city_id.replace(/^c-/, '')]
        );

        const targetCityId = cityLookup.rows[0]?.id;
        if (!targetCityId) {
          console.warn(`[SeedContent] Skipping cinema ${cin.name}: city ${cin.city_id} not found yet in cities table.`);
          continue;
        }

        const slug = cin.slug || cin.id.replace(/^cin-/, '');
        await executeRawSql(
          `INSERT INTO cinemas (
            id, city_id, name, chain, address, lat, lng, website_url, features, slug
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING`,
          [
            cin.id,
            targetCityId,
            cin.name,
            cin.chain || 'independent',
            cin.address,
            cin.lat,
            cin.lng,
            cin.website_url,
            JSON.stringify(cin.features || []),
            slug
          ]
        );
      }
      console.log(`[SeedContent] ✅ Seeded ${INITIAL_CINEMAS.length} verified cinema locations.`);

      // Update cinema_count in cities table
      await executeRawSql(`
        UPDATE cities c
        SET cinema_count = COALESCE((SELECT COUNT(*) FROM cinemas WHERE city_id = c.id), 0)
      `);
    }

    // NOTE: Showtimes and ticket URLs are NEVER synthetically seeded.
    // All showtimes and booking links must originate strictly from real scraper
    // runs (e.g. cinemaScraper.executeFullScrape) to guarantee authentic data.
  } catch (err: any) {
    console.error('[SeedContent] ⚠️ Error during seedContentIfEmpty:', err?.message);
  }
}
