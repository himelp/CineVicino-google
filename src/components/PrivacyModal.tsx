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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl my-auto text-neutral-200 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-white">
                {t.privacyPolicy} & GDPR
              </h2>
              <p className="text-xs text-neutral-400">
                Tutela dei dati, geolocalizzazione locale e trasparenza
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white text-neutral-400 hover:text-black transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs text-neutral-300 leading-relaxed">
          
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-[#D4AF37] font-serif font-bold text-sm">
              <MapPin className="w-4 h-4" />
              <span>1. Geolocalizzazione Esclusivamente Locale</span>
            </div>
            <p className="text-neutral-300 leading-relaxed">
              Quando fai clic su "Cinema vicino a me", le coordinate GPS fornite dal tuo browser vengono elaborate temporaneamente per calcolare la distanza in linea d'aria dai cinema italiani. Le tue coordinate non vengono salvate, storicizzate né associate ad alcun profilo pubblicitario sui nostri server.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-[#D4AF37] font-serif font-bold text-sm">
              <Database className="w-4 h-4" />
              <span>2. Attribuzione The Movie Database (TMDb)</span>
            </div>
            <p className="text-neutral-300 leading-relaxed">
              {t.tmdbAttribution} I metadati relativi a locandine, trame e cast cinematografico sono reperiti per finalità puramente informative e culturali nel rispetto dei termini di servizio di TMDb.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-[#D4AF37] font-serif font-bold text-sm">
              <Lock className="w-4 h-4" />
              <span>3. Cookie e Archiviazione Locale</span>
            </div>
            <p className="text-neutral-300 leading-relaxed">
              Utilizziamo esclusivamente <code className="bg-white/10 px-1.5 py-0.5 rounded text-[#D4AF37] font-mono">localStorage</code> per salvare i tuoi cinema e film preferiti sul tuo dispositivo e memorizzare la tua scelta relativa ai cookie. Nessun cookie di terze parti per tracciamento comportamentale o profilazione pubblicitaria viene installato.
            </p>
          </div>

          {privacyText && (
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
              <span className="font-bold text-white block mb-1">Dichiarazione personalizzata dall'amministratore:</span>
              <p className="whitespace-pre-line text-neutral-300 leading-relaxed">
                {privacyText}
              </p>
            </div>
          )}

        </div>

        <div className="p-5 border-t border-white/10 flex justify-end bg-black/40">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-[#D4AF37] hover:bg-white text-black text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Ho capito
          </button>
        </div>
      </div>
    </div>
  );
};
