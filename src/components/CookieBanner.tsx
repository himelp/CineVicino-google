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
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/95 border border-neutral-700 shadow-2xl backdrop-blur-md text-neutral-200 text-xs space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">
              {t.cookieTitle}
            </h4>
            <p className="text-neutral-400 mt-1 leading-relaxed text-[11px]">
              {t.cookieDesc}{' '}
              <button
                onClick={onOpenPrivacy}
                className="text-amber-400 hover:underline inline font-medium"
              >
                {t.privacyPolicy}
              </button>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-800">
          <button
            onClick={handleDeclineNonEssential}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-[11px] transition-colors"
          >
            {t.cookieDecline}
          </button>
          <button
            onClick={handleAcceptAll}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] transition-colors shadow-sm"
          >
            {t.cookieAccept}
          </button>
        </div>
      </div>
    </div>
  );
};
