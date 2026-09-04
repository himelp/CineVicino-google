import React, { useState, useEffect } from 'react';
import { Shield, Check, X } from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface CookieBannerProps {
  lang: Language;
  onOpenPrivacy: () => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({ lang, onOpenPrivacy }) => {
  const t = translations[lang];
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cinevicino_cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cinevicino_cookie_consent', 'all');
    setIsVisible(false);
  };

  const handleDeclineNonEssential = () => {
    localStorage.setItem('cinevicino_cookie_consent', 'essential');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-fadeIn">
      <div className="p-5 rounded-3xl bg-[#0a0a0a]/95 border border-white/15 shadow-2xl backdrop-blur-md text-neutral-200 text-xs space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] flex-shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-white text-sm">
              {t.cookieTitle}
            </h4>
            <p className="text-neutral-400 mt-1 leading-relaxed text-[11px]">
              {t.cookieDesc}{' '}
              <button
                onClick={onOpenPrivacy}
                className="text-[#D4AF37] hover:underline inline font-semibold cursor-pointer"
              >
                {t.privacyPolicy}
              </button>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            onClick={handleDeclineNonEssential}
            className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 font-medium text-[11px] transition-colors cursor-pointer"
          >
            {t.cookieDecline}
          </button>
          <button
            onClick={handleAcceptAll}
            className="px-5 py-1.5 rounded-full bg-[#D4AF37] hover:bg-white text-black font-bold text-[11px] uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
          >
            {t.cookieAccept}
          </button>
        </div>
      </div>
    </div>
  );
};
