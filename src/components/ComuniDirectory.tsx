import React, { useState, useEffect } from 'react';
import { Search, MapPin, Film, Building2, ChevronRight, CheckCircle, ArrowLeft } from 'lucide-react';
import { City } from '../types';
import { Language, translations } from '../utils/i18n';

interface ComuniDirectoryProps {
  lang: Language;
  onSelectCity: (city: City) => void;
  onBack: () => void;
}

export const ComuniDirectory: React.FC<ComuniDirectoryProps> = ({
  lang,
  onSelectCity,
  onBack
}) => {
  const t = translations[lang];
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [onlyWithCinemas, setOnlyWithCinemas] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const regions = [
    'Tutte le Regioni',
    'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
    'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
    'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia',
    'Toscana', 'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto'
  ];

  useEffect(() => {
    async function loadCities() {
      try {
        setLoading(true);
        let url = `/api/cities?limit=150`;
        if (selectedRegion !== 'all' && selectedRegion !== 'Tutte le Regioni') {
          url += `&region=${encodeURIComponent(selectedRegion)}`;
        }
        if (query.trim()) {
          url += `&q=${encodeURIComponent(query.trim())}`;
        }
        if (onlyWithCinemas) {
          url += `&with_cinemas=true`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setCities(data.cities || []);
          setTotalCount(data.total || 0);
        }
      } catch (e) {
        console.error('Failed to load comuni', e);
      } finally {
        setLoading(false);
      }
    }

    loadCities();
  }, [selectedRegion, query, onlyWithCinemas]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      
      {/* Header & Back */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Torna alla home</span>
        </button>

        <span className="text-xs text-neutral-400 font-mono">
          Totale Comuni trovati: <strong className="text-white">{totalCount}</strong>
        </span>
      </div>

      {/* Directory Title */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Elenco Nazionale Comuni d'Italia (ISTAT 2026)
        </h1>
        <p className="text-sm text-neutral-400 mt-2">
          Trova la programmazione cinematografica per qualunque comune d'Italia. Per i comuni privi di sale cinematografiche, calcoliamo automaticamente il cinema più vicino con relativa distanza chilometrica.
        </p>
      </div>

      {/* Filters & Search Box */}
      <div className="p-4 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 mb-8 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Query input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtra per nome comune, provincia (es. Roma, MI, Napoli, Cortina)..."
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Only with cinema checkbox */}
          <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer select-none bg-neutral-950 px-4 py-2.5 rounded-xl border border-neutral-800">
            <input
              type="checkbox"
              checked={onlyWithCinemas}
              onChange={e => setOnlyWithCinemas(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-800 border-neutral-700"
            />
            <span className="font-medium">Mostra solo comuni con cinema</span>
          </label>
        </div>

        {/* Region Pills */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-800">
          {regions.map(r => {
            const isSelected = selectedRegion === r || (selectedRegion === 'all' && r === 'Tutte le Regioni');
            return (
              <button
                key={r}
                onClick={() => setSelectedRegion(r === 'Tutte le Regioni' ? 'all' : r)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comuni Grid */}
      {loading ? (
        <div className="py-16 text-center text-neutral-500 text-sm">
          Caricamento comuni italiani dal catalogo ISTAT...
        </div>
      ) : cities.length === 0 ? (
        <div className="py-16 text-center bg-neutral-900/60 rounded-3xl border border-neutral-800 p-8">
          <p className="text-neutral-400 text-sm">
            Nessun comune trovato con i filtri selezionati.
          </p>
          <button
            onClick={() => {
              setQuery('');
              setSelectedRegion('all');
              setOnlyWithCinemas(false);
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white"
          >
            Reimposta tutti i filtri
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {cities.map(c => (
            <button
              key={c.id}
              onClick={() => onSelectCity(c)}
              className="p-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 transition-all text-left group flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                    {c.name}
                  </span>
                  <span className="text-[11px] font-mono text-neutral-500">
                    ({c.province_code})
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400 block mt-0.5">
                  {c.region}
                </span>
              </div>

              {(c.cinema_count || 0) > 0 ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                  {c.cinema_count} cinema
                </span>
              ) : (
                <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 group-hover:translate-x-0.5 transition-all" />
              )}
            </button>
          ))}
        </div>
      )}

    </div>
  );
};
