import React from 'react';
import { X, ShieldCheck, Database, MapPin, Eye, Lock } from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface PrivacyModalProps {
  lang: Language;
  onClose: () => void;
  privacyText?: string;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ lang, onClose, privacyText }) => {
  const t = translations[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl my-auto text-neutral-100 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {t.privacyPolicy} & GDPR
              </h2>
              <p className="text-xs text-neutral-400">
                Tutela dei dati, geolocalizzazione locale e trasparenza
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-300 leading-relaxed">
          
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <MapPin className="w-4 h-4" />
              <span>1. Geolocalizzazione Esclusivamente Locale</span>
            </div>
            <p>
              Quando fai clic su "Cinema vicino a me", le coordinate GPS fornite dal tuo browser vengono elaborate temporaneamente per calcolare la distanza in linea d'aria dai cinema italiani. Le tue coordinate non vengono salvate, storicizzate né associate ad alcun profilo pubblicitario sui nostri server.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Database className="w-4 h-4" />
              <span>2. Attribuzione The Movie Database (TMDb)</span>
            </div>
            <p>
              {t.tmdbAttribution} I metadati relativi a locandine, trame e cast cinematografico sono reperiti per finalità puramente informative e culturali nel rispetto dei termini di servizio di TMDb.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Lock className="w-4 h-4" />
              <span>3. Cookie e Archiviazione Locale</span>
            </div>
            <p>
              Utilizziamo esclusivamente <code className="bg-neutral-800 px-1 py-0.5 rounded text-amber-400 font-mono">localStorage</code> per salvare i tuoi cinema e film preferiti sul tuo dispositivo e memorizzare la tua scelta relativa ai cookie. Nessun cookie di terze parti per tracciamento comportamentale o profilazione pubblicitaria viene installato.
            </p>
          </div>

          {privacyText && (
            <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800">
              <span className="font-bold text-neutral-400 block mb-1">Dichiarazione personalizzata dall'amministratore:</span>
              <p className="whitespace-pre-line text-neutral-300">
                {privacyText}
              </p>
            </div>
          )}

        </div>

        <div className="p-4 border-t border-neutral-800 flex justify-end bg-neutral-950/40">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors"
          >
            Ho capito
          </button>
        </div>
      </div>
    </div>
  );
};
