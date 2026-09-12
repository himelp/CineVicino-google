import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Showtime } from '../types';
import { Language } from '../utils/i18n';
import { MapPin, ExternalLink, Ticket, Navigation, AlertCircle } from 'lucide-react';

interface MovieCinemaMapProps {
  showtimes: Showtime[];
  lang: Language;
  userLocation?: { lat: number; lng: number } | null;
  onResetCityFilter?: () => void;
  selectedCityFilter?: string;
  selectedDateLabel?: string;
}

interface CinemaWithShowtimes {
  cinema_id: string;
  cinema_name: string;
  cinema_chain?: string | null;
  cinema_address: string;
  lat: number;
  lng: number;
  city_name?: string;
  city_slug?: string;
  slots: Showtime[];
}

// Controller to handle bounds, resize, and centering
function MapController({ cinemas, userLocation }: { cinemas: CinemaWithShowtimes[]; userLocation?: { lat: number; lng: number } | null }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    // Invalidate size on load so Leaflet renders all tiles cleanly inside the modal container
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (cinemas.length === 0) {
      if (userLocation && !hasCenteredRef.current) {
        map.setView([userLocation.lat, userLocation.lng], 12);
        hasCenteredRef.current = true;
      }
      return;
    }

    if (cinemas.length === 1) {
      map.setView([cinemas[0].lat, cinemas[0].lng], 14, { animate: true });
    } else {
      const bounds = L.latLngBounds(cinemas.map(c => [c.lat, c.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
    }
  }, [cinemas, userLocation, map]);

  return null;
}

// Custom DivIcon for CineVicino cinema pins
function createCinemaMarkerIcon(count: number, chain?: string | null) {
  const isUci = chain?.toLowerCase().includes('uci');
  const isSpace = chain?.toLowerCase().includes('space');
  const badgeColor = isUci ? '#0284c7' : isSpace ? '#e11d48' : '#D4AF37';

  return L.divIcon({
    className: 'cinevicino-map-pin',
    html: `
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        background: #121212;
        border: 2.5px solid ${badgeColor};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 14px rgba(0,0,0,0.65), 0 0 10px ${badgeColor}55;
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <div style="
          transform: rotate(45deg);
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        ">
          🎬
        </div>
        ${count > 1 ? `
          <div style="
            position: absolute;
            top: -6px;
            right: -6px;
            background: #D4AF37;
            color: #000;
            font-size: 10px;
            font-weight: 800;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(45deg);
            border: 1.5px solid #121212;
            box-shadow: 0 2px 5px rgba(0,0,0,0.5);
          ">${count}</div>
        ` : ''}
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38]
  });
}

export const MovieCinemaMap: React.FC<MovieCinemaMapProps> = ({
  showtimes,
  lang,
  userLocation,
  onResetCityFilter,
  selectedCityFilter,
  selectedDateLabel
}) => {
  // Aggregate showtimes by cinema and only retain cinemas with valid coordinates
  const validCinemas = useMemo(() => {
    const map = new Map<string, CinemaWithShowtimes>();

    for (const s of showtimes) {
      if (!s.active) continue;
      
      const lat = s.cinema_lat;
      const lng = s.cinema_lng;

      // Validate numeric coordinates
      if (
        typeof lat !== 'number' || 
        typeof lng !== 'number' || 
        isNaN(lat) || 
        isNaN(lng) || 
        lat === 0 || 
        lng === 0
      ) {
        continue;
      }

      const key = s.cinema_id;
      if (!map.has(key)) {
        map.set(key, {
          cinema_id: s.cinema_id,
          cinema_name: s.cinema_name || 'Cinema',
          cinema_chain: s.cinema_chain || null,
          cinema_address: s.cinema_address || '',
          lat,
          lng,
          city_name: s.city_name,
          city_slug: s.city_slug,
          slots: []
        });
      }

      map.get(key)!.slots.push(s);
    }

    return Array.from(map.values());
  }, [showtimes]);

  // Default initial center: User's detected city or Geographic center of Italy
  const defaultCenter = useMemo<[number, number]>(() => {
    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      return [userLocation.lat, userLocation.lng];
    }
    // Rome / Italy center fallback
    return [41.9028, 12.4964];
  }, [userLocation]);

  const defaultZoom = validCinemas.length === 1 ? 14 : validCinemas.length > 1 ? 11 : 6;

  // Track click on outbound ticket link
  const handleTicketClick = (showtimeId: string) => {
    fetch(`/api/showtimes/${showtimeId}/click`, { method: 'POST' }).catch(() => {});
  };

  // If no cinemas with real coordinates and active showtimes
  if (validCinemas.length === 0) {
    return (
      <div className="py-12 px-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center max-w-lg mx-auto my-4 space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
          <MapPin className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <div className="space-y-1.5">
          <h4 className="text-white font-serif font-bold text-base">
            {lang === 'it' 
              ? 'Nessun cinema con mappa disponibile per i filtri selezionati' 
              : 'No cinemas with map coordinates found for selected filters'}
          </h4>
          <p className="text-neutral-400 text-xs leading-relaxed">
            {selectedCityFilter && selectedCityFilter !== 'all'
              ? (lang === 'it'
                  ? `Non ci sono sale geolocalizzate con programmazione attiva a ${selectedCityFilter.toUpperCase()} per ${selectedDateLabel || 'la data scelta'}. Prova a visualizzare tutte le città o a tornare alla vista elenco.`
                  : `No geolocated cinemas with active showtimes in ${selectedCityFilter.toUpperCase()} on ${selectedDateLabel || 'this date'}. Try showing all cities or switching to the list view.`)
              : (lang === 'it'
                  ? 'Nessuna sala con coordinate geografiche e programmazione attiva per questo titolo nella data selezionata.'
                  : 'No cinemas with verified coordinates and active showtimes for this title on the selected date.')}
          </p>
        </div>

        {selectedCityFilter && selectedCityFilter !== 'all' && onResetCityFilter && (
          <button
            onClick={onResetCityFilter}
            className="px-4 py-2 rounded-full bg-[#D4AF37] hover:bg-white text-black text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
          >
            {lang === 'it' ? 'Mostra cinema in tutta Italia' : 'Show all cities in Italy'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/15 bg-neutral-950 shadow-2xl">
      {/* Map Header Status Overlay */}
      <div className="absolute top-3 left-3 z-[1000] bg-neutral-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-xs flex items-center gap-2 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white font-medium">
          {validCinemas.length} {validCinemas.length === 1 ? (lang === 'it' ? 'cinema attivo' : 'active cinema') : (lang === 'it' ? 'cinema attivi' : 'active cinemas')}
        </span>
        {selectedCityFilter && selectedCityFilter !== 'all' && (
          <span className="text-neutral-400 uppercase font-mono text-[10px] pl-1 border-l border-white/10">
            {selectedCityFilter}
          </span>
        )}
      </div>

      {/* Actual Leaflet Map */}
      <div className="h-[420px] sm:h-[480px] w-full">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom={false}
          zoomControl={false}
          className="h-full w-full"
          style={{ background: '#18181b' }}
        >
          <ZoomControl position="topright" />

          {/* Free OpenStreetMap Tiles with required attribution */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <MapController cinemas={validCinemas} userLocation={userLocation} />

          {validCinemas.map(cinema => (
            <Marker
              key={cinema.cinema_id}
              position={[cinema.lat, cinema.lng]}
              icon={createCinemaMarkerIcon(cinema.slots.length, cinema.cinema_chain)}
            >
              <Popup className="cinevicino-leaflet-popup" maxWidth={320}>
                <div className="p-1 space-y-2 text-neutral-900">
                  <div className="border-b border-neutral-200 pb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-neutral-900 leading-tight">
                        {cinema.cinema_name}
                      </span>
                      {cinema.cinema_chain && (
                        <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700 border border-neutral-300">
                          {cinema.cinema_chain}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-600 mt-1 flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-neutral-500 shrink-0 mt-0.5" />
                      <span>{cinema.cinema_address}</span>
                    </p>
                  </div>

                  {/* Showtimes for this cinema */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
                      {lang === 'it' ? 'Orari programmati:' : 'Scheduled showtimes:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-0.5">
                      {cinema.slots.map(s => (
                        <a
                          key={s.id}
                          href={s.ticket_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleTicketClick(s.id)}
                          title={s.ticket_url ? 'Acquista biglietto ufficiale' : 'Consulta sito cinema'}
                          className="px-2.5 py-1 rounded-md bg-neutral-900 hover:bg-[#D4AF37] text-white hover:text-black transition-colors flex items-center gap-1.5 text-xs font-mono font-bold shadow-sm"
                        >
                          <span>{s.time}</span>
                          <span className="text-[9px] opacity-75 font-sans font-normal">
                            {s.format}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Directions link */}
                  <div className="pt-1 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-500">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cinema.cinema_address || cinema.cinema_name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Navigation className="w-2.5 h-2.5" />
                      <span>{lang === 'it' ? 'Indicazioni stradali' : 'Get directions'}</span>
                    </a>
                    <span className="text-neutral-400">
                      {cinema.city_name || ''}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Footer Info Notice */}
      <div className="px-4 py-2 bg-neutral-900/90 border-t border-white/10 text-[11px] text-neutral-400 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Ticket className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>
            {lang === 'it' 
              ? 'Clicca su un segnaposto per visualizzare gli orari e i biglietti ufficiali della sala.' 
              : 'Click on a cinema marker to view showtimes and official box-office links.'}
          </span>
        </div>
        <span className="text-neutral-500 font-mono text-[10px]">
          Leaflet + OpenStreetMap (Zero-Cost / Open Data)
        </span>
      </div>
    </div>
  );
};

export default MovieCinemaMap;
