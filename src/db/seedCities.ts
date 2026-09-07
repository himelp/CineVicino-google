import fs from 'fs';
import path from 'path';
import { executeRawSql } from './index';

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
  CS: [39.2983, 16.2537],
  LU: [43.8429, 10.5027],
  TV: [45.6669, 12.2430],
  PI: [43.7228, 10.4017],
  PV: [45.1847, 9.1582],
  SP: [44.1025, 9.8241],
  CR: [45.1332, 10.0247],
  MN: [45.1564, 10.7914],
  AT: [44.9008, 8.2069],
  BL: [46.1425, 12.2167],
  CO: [45.8081, 9.0852],
  LC: [45.8559, 9.3977],
  SO: [46.1691, 9.8700],
  VA: [45.8206, 8.8251],
  VC: [45.3256, 8.4239],
  BI: [45.5664, 8.0537],
  VB: [45.9224, 8.5516],
  CN: [44.3845, 7.5427],
  SV: [44.3080, 8.4810],
  IM: [43.8861, 8.0264],
  PZ: [40.6404, 15.8056],
  MT: [40.6664, 16.6043],
  AG: [37.3111, 13.5765],
  BN: [41.1307, 14.7816],
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

export async function seedCitiesIfEmpty(): Promise<void> {
  try {
    const countRes = await executeRawSql('SELECT COUNT(*) as cnt FROM cities');
    const existing = parseInt(countRes.rows[0]?.cnt || '0', 10);
    if (existing >= 100) {
      return;
    }

    const jsonPath = path.join(process.cwd(), 'data', 'comuni-italia-istat-all.json');
    if (!fs.existsSync(jsonPath)) {
      return;
    }

    console.log(`[SeedCities] 🚀 Seeding Italian comuni dataset into PostgreSQL (currently ${existing})...`);
    const rawComuni = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    const cachePath = path.join(process.cwd(), 'data', 'nominatim-cache.json');
    let nominatimCache: Record<string, { lat: number; lng: number }> = {};
    if (fs.existsSync(cachePath)) {
      try {
        nominatimCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      } catch {}
    }

    const usedSlugs = new Set<string>();
    const CHUNK_SIZE = 100;

    for (let i = 0; i < rawComuni.length; i += CHUNK_SIZE) {
      const chunk = rawComuni.slice(i, i + CHUNK_SIZE);
      const valueClauses: string[] = [];
      const params: any[] = [];
      let pIdx = 1;

      for (const c of chunk) {
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

        const isCapital = c.is_provincial_capital === true || (PROVINCE_COORDINATES[province_code] !== undefined && name.toLowerCase() === province.toLowerCase());

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
          const hash = name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
          const latOffset = ((hash % 100) - 50) * 0.003;
          const lngOffset = (((hash * 13) % 100) - 50) * 0.003;
          lat = Number((PROVINCE_COORDINATES[province_code][0] + latOffset).toFixed(4));
          lng = Number((PROVINCE_COORDINATES[province_code][1] + lngOffset).toFixed(4));
        } else {
          lat = 41.9028;
          lng = 12.4964;
        }

        const cityId = `c-${baseSlug}`;

        valueClauses.push(`($${pIdx}, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, $${pIdx + 4}, $${pIdx + 5}, $${pIdx + 6}, $${pIdx + 7}, $${pIdx + 8}, $${pIdx + 9}, $${pIdx + 10})`);
        params.push(cityId, baseSlug, name, region, province, province_code, isCapital, cadastral_code, lat, lng, geocodeStatus);
        pIdx += 11;
      }

      if (valueClauses.length > 0) {
        const query = `
          INSERT INTO cities (
            id, slug, name, region, province, province_code,
            is_provincial_capital, cadastral_code, lat, lng, geocode_status
          ) VALUES ${valueClauses.join(', ')}
          ON CONFLICT (slug) DO NOTHING;
        `;
        await executeRawSql(query, params);
      }
    }

    const finalRes = await executeRawSql('SELECT COUNT(*) as cnt FROM cities');
    console.log(`[SeedCities] ✅ Italian Comuni seeded successfully: ${finalRes.rows[0]?.cnt} cities present in PostgreSQL.`);
  } catch (err: any) {
    console.error('[SeedCities] ⚠️ Notice during seedCitiesIfEmpty:', err?.message);
  }
}
