import 'dotenv/config';
import { downloadGeoLite2, getGeoIpStatus } from '../src/services/geoip';

async function main() {
  console.log('🌍 CineVicino — MaxMind GeoLite2-City Database Downloader / Updater');
  console.log('------------------------------------------------------------------');

  const licenseKey = process.env.MAXMIND_LICENSE_KEY;
  if (!licenseKey) {
    console.warn('⚠️ MAXMIND_LICENSE_KEY is not defined in your environment (.env).');
    console.warn('👉 Get your free license key at: https://www.maxmind.com/en/geolite2/signup');
    console.warn('👉 Add it to .env: MAXMIND_LICENSE_KEY="your_license_key"');
    process.exit(1);
  }

  console.log('⏳ Connecting to MaxMind and downloading GeoLite2-City.mmdb...');
  const result = await downloadGeoLite2(licenseKey);

  if (result.success) {
    console.log(`✅ Success: ${result.message}`);
    const status = getGeoIpStatus();
    console.log(`📊 File: ${status.database_file} (${status.database_size_mb} MB)`);
    console.log(`🕒 Updated: ${status.last_modified?.toISOString()}`);
    process.exit(0);
  } else {
    console.error(`❌ Failed: ${result.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error updating GeoLite2 database:', err);
  process.exit(1);
});
