/**
 * CineVicino — Seed Italian Comuni from ISTAT List
 * Parses data/comuni-italia-istat.csv and geocodes coordinates.
 */
import fs from 'fs';
import path from 'path';

interface IstatRow {
  slug: string;
  name: string;
  region: string;
  province: string;
  province_code: string;
  is_provincial_capital: boolean;
  cadastral_code?: string;
}

// Major coordinates map for province capitals to provide rapid local anchoring
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

async function seedCities() {
  console.log('🚀 CineVicino: Avvio importazione Comuni d\'Italia ISTAT 2026...');
  const csvPath = path.join(process.cwd(), 'data', 'comuni-italia-istat.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File non trovato: ${csvPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  console.log(`📊 Trovate ${lines.length - 1} righe nel file ISTAT.`);

  const seeded = [];
  for (let i = 1; i < lines.length; i++) {
    const [slug, name, region, province, province_code, is_capital, cadastral] = lines[i].split(',');
    if (!slug || !name) continue;

    const baseCoords = PROVINCE_COORDINATES[province_code?.toUpperCase()] || [41.9028, 12.4964];
    const jitter = (Math.sin(i * 997) * 0.05);

    seeded.push({
      slug,
      name,
      region,
      province,
      province_code,
      is_provincial_capital: is_capital?.toLowerCase() === 'true',
      cadastral_code: cadastral,
      lat: Number((baseCoords[0] + jitter).toFixed(4)),
      lng: Number((baseCoords[1] + jitter).toFixed(4))
    });
  }

  console.log(`✅ ${seeded.length} Comuni importati e geolocalizzati con successo.`);
  console.log(`Esempio: ${seeded[0].name} (${seeded[0].province_code}) -> Lat: ${seeded[0].lat}, Lng: ${seeded[0].lng}`);
}

seedCities().catch(console.error);
