/**
 * CineVicino — Nationwide Scraper & TMDb Enrichment Runner
 * Can be run standalone (e.g. via crontab daily at 12:00) or called from Admin UI.
 */
import { initDb } from '../src/db/index';
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

    // 1. Read persistent cursor from site_settings
    const storedOffset = await cinemaScraper.getStoredCursor();
    const batchLimit = 25;
    const cursorStateBefore = await cinemaScraper.getScraperCursorState(batchLimit);

    console.log(`📍 Offset attuale memorizzato: ${storedOffset} / ${cursorStateBefore.total_eligible_cities} comuni idonei`);
    if (cursorStateBefore.current_batch_cities.length > 0) {
      console.log(`🏙️ Batch attuale: ${cursorStateBefore.current_batch_cities.map(c => c.name).join(', ')}`);
    }

    // 2. Execute scrape for current rotating batch
    const result = await cinemaScraper.executeFullScrape(
      { useFirecrawl: false, offset: storedOffset, limit: batchLimit },
      (update) => {
        console.log(`[${update.timestamp.slice(11, 19)}] [${update.source}] ${update.message}`);
      }
    );

    // 3. Compute next offset: wrap back to 0 when reaching the end of the list
    let nextOffset = storedOffset + batchLimit;
    if (result.cities_touched < batchLimit || nextOffset >= cursorStateBefore.total_eligible_cities) {
      console.log(`🔄 Raggiunta la fine dell'elenco nazionale (${result.cities_touched} città elaborate). Il prossimo ciclo ripartirà da 0.`);
      nextOffset = 0;
    } else {
      console.log(`➡️ Rotazione completata per il batch attuale. Prossimo offset: ${nextOffset} (su ${cursorStateBefore.total_eligible_cities} comuni idonei).`);
    }

    // 4. Persist updated cursor back to site_settings
    await cinemaScraper.setStoredCursor(nextOffset);
    console.log(`💾 Nuovo offset salvato con successo in site_settings: ${nextOffset}`);

    console.log('----------------------------------------------------');
    console.log('✅ Scraping completato con successo!');
    console.log(`- Comuni toccati: ${result.cities_touched}`);
    console.log(`- Cinema verificati: ${result.cinemas_touched}`);
    console.log(`- Film in programmazione: ${result.movies_touched}`);
    console.log(`- Orari spettacoli attivi: ${result.showtimes_touched}`);
    console.log(`- Crediti Firecrawl consumati: ${result.firecrawl_credits_used}`);
    console.log('====================================================');
  } catch (error) {
    console.error('❌ Errore durante l\'esecuzione dello scraper:', error);
    process.exit(1);
  }
}

main();
