/**
 * CineVicino — Nationwide Scraper & TMDb Enrichment Runner
 * Can be run standalone (e.g. via crontab daily at 12:00) or called from Admin UI.
 */
import { initDb, executeRawSql } from '../src/db/index';
import { cinemaScraper } from '../src/services/scraper';

async function main() {
  console.log('====================================================');
  console.log('🎬 CineVicino — Scraping Nazionale e Arricchimento');
  console.log('====================================================');
  console.log(`Orario avvio: ${new Date().toISOString()}`);
  console.log('Aggregatori: MYmovies.it, ComingSoon.it, CinemaTimes.com');
  console.log('Circuiti: UCI Cinemas, The Space, Notorious, Arcadia, Anteo');
  console.log('Biglietterie: 18Tickets, Vivaticket, TicketOne, Liveticket');
  console.log('Enrichment: The Movie Database (TMDb) API');
  console.log('----------------------------------------------------');

  try {
    await initDb();

    // 1. Read last_scrape_offset from scraper_state table
    let storedOffset = 0;
    try {
      const stateRes = await executeRawSql(
        "SELECT last_scrape_offset FROM scraper_state WHERE id = 'default' LIMIT 1"
      );
      if (stateRes.rows && stateRes.rows.length > 0) {
        storedOffset = parseInt(stateRes.rows[0].last_scrape_offset, 10) || 0;
      } else {
        storedOffset = await cinemaScraper.getStoredCursor();
      }
    } catch {
      storedOffset = await cinemaScraper.getStoredCursor();
    }

    const batchLimit = 25;
    const cursorStateBefore = await cinemaScraper.getScraperCursorState(batchLimit);

    console.log(`📍 Offset attuale da scraper_state: ${storedOffset} / ${cursorStateBefore.total_eligible_cities} comuni idonei`);
    if (cursorStateBefore.current_batch_cities.length > 0) {
      console.log(`🏙️ Batch attuale (${cursorStateBefore.current_batch_cities.length} città): ${cursorStateBefore.current_batch_cities.map(c => c.name).join(', ')}`);
    }

    // 2. Pass offset to executeFullScrape with a limit of 25
    const result = await cinemaScraper.executeFullScrape(
      { useFirecrawl: false, offset: storedOffset, limit: batchLimit },
      (update) => {
        console.log(`[${update.timestamp.slice(11, 19)}] [${update.source}] ${update.message}`);
      }
    );

    // 3. Compute new offset, wrapping back to 0 when the limit is reached
    const totalCities = cursorStateBefore.total_eligible_cities;
    let nextOffset = storedOffset + batchLimit;
    if (totalCities > 0 && (nextOffset >= totalCities || result.cities_touched < batchLimit)) {
      console.log(`🔄 Raggiunta la fine dell'elenco nazionale (${totalCities} comuni totali). Reset offset a 0.`);
      nextOffset = 0;
    } else {
      console.log(`➡️ Batch completato. Prossimo offset calcolato: ${nextOffset} / ${totalCities}.`);
    }

    // 4. Update scraper_state table with the new offset upon completion
    await executeRawSql(
      `INSERT INTO scraper_state (id, last_scrape_offset, updated_at)
       VALUES ('default', $1, NOW())
       ON CONFLICT (id) DO UPDATE SET last_scrape_offset = EXCLUDED.last_scrape_offset, updated_at = NOW()`,
      [nextOffset]
    );
    await cinemaScraper.setStoredCursor(nextOffset);
    console.log(`💾 Nuovo offset ${nextOffset} salvato con successo nella tabella scraper_state.`);

    console.log('----------------------------------------------------');
    console.log('✅ Scraping completato con successo!');
    console.log(`- Comuni toccati: ${result.cities_touched}`);
    console.log(`- Cinema verificati: ${result.cinemas_touched}`);
    console.log(`- Film in programmazione: ${result.movies_touched}`);
    console.log(`- Orari spettacoli attivi: ${result.showtimes_touched}`);
    console.log(`- Crediti Firecrawl consumati: ${result.firecrawl_credits_used}`);
    console.log('====================================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Errore durante l\'esecuzione dello scraper:', error);
    process.exit(1);
  }
}

main();
