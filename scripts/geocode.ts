/**
 * CineVicino — CLI Geocoding Runner
 * Geocodes Italian comuni using OpenStreetMap Nominatim with rate limiting and caching.
 * Usage: npx tsx scripts/geocode.ts [limit]
 */
import { initDb, closeDb, executeRawSql } from '../src/db/index';
import { runBatchGeocoding } from '../src/services/geocoder';

async function main() {
  const limit = parseInt(process.argv[2] || '10', 10);
  console.log(`🗺️ CineVicino Geocoding Runner: Avvio per ${limit} comuni...`);

  await initDb();

  const stats = await executeRawSql(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE geocode_status = 'complete') as completed,
      COUNT(*) FILTER (WHERE geocode_status = 'pending') as pending,
      COUNT(*) FILTER (WHERE geocode_status = 'rate_limited') as rate_limited,
      COUNT(*) FILTER (WHERE geocode_status = 'error') as error,
      COUNT(*) FILTER (WHERE geocode_status = 'not_found') as not_found
    FROM cities
  `);

  console.log('Stato geocodifica attuale:', stats.rows[0]);

  const result = await runBatchGeocoding({
    limit,
    onProgress: ({ current, total, city, result }) => {
      console.log(`[${current}/${total}] ${city}: ${result.status} ${result.lat ? `(${result.lat}, ${result.lng})` : ''}`);
    }
  });

  console.log('Risultato batch:', result);
  await closeDb();
}

main().catch(console.error);
