/**
 * CineVicino — Nationwide Scraper & TMDb Enrichment Runner
 * Can be run standalone (e.g. via crontab daily at 12:00) or called from Admin UI.
 */
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
    const result = await cinemaScraper.executeFullScrape(
      { useFirecrawl: false }, // Use plain free HTTP parser for routine runs
      (update) => {
        console.log(`[${update.timestamp.slice(11, 19)}] [${update.source}] ${update.message}`);
      }
    );

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
