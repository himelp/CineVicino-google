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

    // 1. Read last_scrape_offset from the unified single source of truth
    const storedOffset = await cinemaScraper.getStoredCursor();
    const batchLimit = 25;
    const cursorStateBefore = await cinemaScraper.getScraperCursorState(batchLimit);

    console.log(`📍 Offset attuale: ${storedOffset} / ${cursorStateBefore.total_eligible_cities} comuni idonei`);
    if (cursorStateBefore.current_batch_cities.length > 0) {
      console.log(`🏙️ Batch attuale (${cursorStateBefore.current_batch_cities.length} città): ${cursorStateBefore.current_batch_cities.map(c => c.name).join(', ')}`);
    }

    // 2. Execute full scrape with advanceCursor: true (persists next offset using targetCities.length)
    const result = await cinemaScraper.executeFullScrape(
      { useFirecrawl: false, offset: storedOffset, limit: batchLimit, advanceCursor: true },
      (update) => {
        console.log(`[${update.timestamp.slice(11, 19)}] [${update.source}] ${update.message}`);
      }
    );

    const nextOffset = result.next_offset !== undefined ? result.next_offset : await cinemaScraper.getStoredCursor();
    console.log(`💾 Rotazione avanzata: nuovo offset ${nextOffset} / ${result.total_eligible_cities || cursorStateBefore.total_eligible_cities}.`);

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
