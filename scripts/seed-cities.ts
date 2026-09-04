/**
 * CineVicino — Seed All Italian Comuni from Official ISTAT Dataset into PostgreSQL
 * Inserts all ~7,894 - 7,904 municipalities into the PostgreSQL cities table.
 */
import fs from 'fs';
import path from 'path';
import { initDb, executeRawSql, closeDb } from '../src/db/index';

// Known provincial capitals anchor coordinates
const PROVINCE_COORDINATES: Record<string, [number, number]> = {
  RM: [41.9028, 12.4964],
  MI: [45.4642, 9.1900],
  NA: [40.8518, 14.2681],
  TO: [45.0703, 7.6869],
  PA: [38.1157, 13.3615],
  GE: [44.4056, 8.9463],
  BO: [44.4949, 11.3426],
  FI: [43.7696, 11.2558],
  BA: [41.1171, 16.8719],
  CT: [37.5079, 15.0830],
  VE: [45.4408, 12.3155],
  VR: [45.4384, 10.9916],
  ME: [38.1938, 15.5540],
  PD: [45.4064, 11.8768],
  TS: [45.6495, 13.7768],
  BS: [45.5416, 10.2118],
  TA: [40.4644, 17.2470],
  PR: [44.8015, 10.3279],
  PO: [43.8777, 11.1022],
  MO: [44.6471, 10.9252],
  RC: [38.1113, 15.6473],
  RE: [44.6983, 10.6312],
  PG: [43.1107, 12.3908],
  RA: [44.4184, 12.2035],
  LI: [43.5485, 10.3106],
  CA: [39.2238, 9.1217],
  FG: [41.4622, 15.5447],
  RN: [44.0678, 12.5695],
  SA: [40.6824, 14.7681],
  FE: [44.8381, 11.6198],
  SS: [40.7259, 8.5556],
  LT: [41.4676, 12.9037],
  MB: [45.5845, 9.2744],
  SR: [37.0755, 15.2866],
  PE: [42.4618, 14.2161],
  BG: [45.6983, 9.6773],
  FC: [44.2227, 12.0407],
  TN: [46.0748, 11.1217],
  VI: [45.5455, 11.5354],
  TR: [42.5641, 12.6405],
  BZ: [46.4983, 11.3548],
  NO: [45.4469, 8.6214],
  PC: [45.0526, 9.6930],
  AN: [43.6158, 13.5189],
  BT: [41.2269, 16.2974],
  AR: [43.4633, 11.8797],
  UD: [46.0637, 13.2446],
  LE: [40.3548, 18.1724],
  PU: [43.9102, 12.9133],
  AL: [44.9129, 8.6152],
  SP: [44.1105, 9.8437],
  PI: [43.7228, 10.4017],
  PT: [43.9333, 10.9167],
  LU: [43.8429, 10.5027],
  CZ: [38.9098, 16.5877],
  TV: [45.6669, 12.2430],
  BR: [40.6327, 17.9418],
  CO: [45.8081, 9.0852],
  GR: [42.7606, 11.1136],
  VA: [45.8206, 8.8251],
  AT: [44.9008, 8.2069],
  CE: [41.0726, 14.3323],
  RG: [36.9269, 14.7307],
  PV: [45.1847, 9.1582],
  CR: [45.1336, 10.0275],
  AQ: [42.3498, 13.3995],
  TP: [38.0176, 12.5365],
  VT: [42.4174, 12.1047],
  CS: [39.3099, 16.2502],
  PZ: [40.6404, 15.8056],
  KR: [39.0808, 17.1272],
  SV: [44.3080, 8.4810],
  MT: [40.6664, 16.6043],
  BN: [41.1307, 14.7816],
  AG: [37.3111, 13.5765],
  AV: [40.9147, 14.7906],
  AO: [45.7373, 7.3195]
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedAllComuni() {
  console.log('🚀 CineVicino: Inizializzazione database per importazione Comuni...');
  await initDb();

  // 1. Check existing count
  const countCheck = await executeRawSql('SELECT COUNT(*) as cnt FROM cities');
  const existingCount = parseInt(countCheck.rows[0].cnt || '0', 10);
  console.log(`📊 Comuni attualmente presenti in PostgreSQL: ${existingCount}`);

  // Load ISTAT JSON file
  const jsonPath = path.join(process.cwd(), 'data', 'comuni-italia-istat-all.json');
  let rawComuni: any[] = [];

  if (fs.existsSync(jsonPath)) {
    rawComuni = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📂 Caricati ${rawComuni.length} comuni da ${jsonPath}`);
  } else {
    // Fallback to CSV if json missing
    const csvPath = path.join(process.cwd(), 'data', 'comuni-italia-istat.csv');
    if (fs.existsSync(csvPath)) {
      const csvData = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
      for (let i = 1; i < csvData.length; i++) {
        const parts = csvData[i].split(',');
        if (parts[1]) {
          rawComuni.push({
            nome: parts[1],
            regione: { nome: parts[2] },
            provincia: { nome: parts[3] },
            sigla: parts[4],
            is_provincial_capital: parts[5]?.toLowerCase() === 'true',
            codiceCatastale: parts[6]
          });
        }
      }
      console.log(`📂 Caricati ${rawComuni.length} comuni da CSV`);
    }
  }

  if (rawComuni.length === 0) {
    console.error('❌ Nessun dato trovato per i comuni italiani!');
    process.exit(1);
  }

  // Load any existing Nominatim cache
  const cachePath = path.join(process.cwd(), 'data', 'nominatim-cache.json');
  let nominatimCache: Record<string, { lat: number; lng: number }> = {};
  if (fs.existsSync(cachePath)) {
    try {
      nominatimCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      console.log(`🗺️ Trovati ${Object.keys(nominatimCache).length} comuni pre-geocodificati in cache.`);
    } catch {}
  }

  // Batch insert into cities table
  console.log('⏳ Inserimento dei comuni nel database PostgreSQL...');
  let inserted = 0;
  let updated = 0;

  // Track unique slugs
  const usedSlugs = new Set<string>();

  for (const c of rawComuni) {
    const name = c.nome?.trim();
    if (!name) continue;

    const region = typeof c.regione === 'string' ? c.regione : (c.regione?.nome || 'Italia');
    const province = typeof c.provincia === 'string' ? c.provincia : (c.provincia?.nome || '');
    const province_code = (c.sigla || c.province_code || 'IT').toUpperCase();
    const cadastral_code = c.codiceCatastale || c.cadastral_code || null;

    let baseSlug = slugify(name);
    if (usedSlugs.has(baseSlug)) {
      baseSlug = `${baseSlug}-${province_code.toLowerCase()}`;
    }
    usedSlugs.add(baseSlug);

    const isCapital = c.is_provincial_capital === true || PROVINCE_COORDINATES[province_code] !== undefined && name.toLowerCase() === province.toLowerCase();

    // Check if coordinates exist in cache or province anchor
    const cacheKey = `${name.toLowerCase()}|${province_code.toLowerCase()}`;
    let lat: number;
    let lng: number;
    let geocodeStatus = 'pending';

    if (nominatimCache[cacheKey]) {
      lat = nominatimCache[cacheKey].lat;
      lng = nominatimCache[cacheKey].lng;
      geocodeStatus = 'complete';
    } else if (isCapital && PROVINCE_COORDINATES[province_code]) {
      [lat, lng] = PROVINCE_COORDINATES[province_code];
      geocodeStatus = 'complete';
    } else if (PROVINCE_COORDINATES[province_code]) {
      // Deterministic slight spatial offset based on name hash for clean initial layout before geocoder runs
      const hash = name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      const latOffset = ((hash % 100) - 50) * 0.003;
      const lngOffset = (((hash * 13) % 100) - 50) * 0.003;
      lat = Number((PROVINCE_COORDINATES[province_code][0] + latOffset).toFixed(4));
      lng = Number((PROVINCE_COORDINATES[province_code][1] + lngOffset).toFixed(4));
      geocodeStatus = 'pending';
    } else {
      lat = 41.9028;
      lng = 12.4964;
      geocodeStatus = 'pending';
    }

    const cityId = `c-${baseSlug}`;

    // UPSERT
    const query = `
      INSERT INTO cities (
        id, slug, name, region, province, province_code,
        is_provincial_capital, cadastral_code, lat, lng, geocode_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        region = EXCLUDED.region,
        province = EXCLUDED.province,
        province_code = EXCLUDED.province_code,
        is_provincial_capital = EXCLUDED.is_provincial_capital,
        cadastral_code = COALESCE(EXCLUDED.cadastral_code, cities.cadastral_code),
        lat = CASE WHEN cities.geocode_status = 'complete' THEN cities.lat ELSE EXCLUDED.lat END,
        lng = CASE WHEN cities.geocode_status = 'complete' THEN cities.lng ELSE EXCLUDED.lng END,
        geocode_status = CASE WHEN cities.geocode_status = 'complete' THEN cities.geocode_status ELSE EXCLUDED.geocode_status END;
    `;

    await executeRawSql(query, [
      cityId,
      baseSlug,
      name,
      region,
      province,
      province_code,
      isCapital,
      cadastral_code,
      lat,
      lng,
      geocodeStatus
    ]);
    inserted++;

    if (inserted % 1000 === 0) {
      console.log(`  ... processati ${inserted}/${rawComuni.length} Comuni`);
    }
  }

  const finalCheck = await executeRawSql('SELECT COUNT(*) as cnt, COUNT(*) FILTER (WHERE geocode_status = \'complete\') as geocoded FROM cities');
  console.log(`\n🎉 COMPLETATO! Totale Comuni in database: ${finalCheck.rows[0].cnt} (Geocodificati completi: ${finalCheck.rows[0].geocoded})`);

  await closeDb();
}

seedAllComuni().catch(err => {
  console.error('❌ Errore durante seed dei comuni:', err);
  process.exit(1);
});
