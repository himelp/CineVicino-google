import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Language, translations, TranslationKeys } from '../utils/i18n';

interface LanguageContextType {
  language: Language;
  lang: Language; // convenient alias
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'cinevicino_lang';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default to 'it' (primary audience of CineVicino: Italian cinema goers)
  // rather than browser language detection, to avoid unexpected switches
  // for local users with English OS/browser language settings.
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'it' || saved === 'en') {
        return saved;
      }
    } catch {
      // localStorage not accessible
    }
    return 'it';
  });

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // ignore localStorage errors
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'it' ? 'en' : 'it');
  };

  // Synchronize <html lang="..."> attribute for SEO & accessibility
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const value = useMemo(() => ({
    language,
    lang: language,
    setLanguage,
    toggleLanguage,
    t: translations[language]
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside LanguageProvider
    const fallbackLang: Language = 'it';
    return {
      language: fallbackLang,
      lang: fallbackLang,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: translations[fallbackLang]
    };
  }
  return context;
}

export function useTranslation() {
  const { t, language, lang, setLanguage, toggleLanguage } = useLanguage();
  return { t, language, lang, setLanguage, toggleLanguage };
}

/**
 * Returns localized movie title, prioritizing language selection with clean fallback.
 * Never returns blank.
 */
export function getMovieTitle(
  movie: { title_it?: string; title_en?: string; title_original?: string; title?: string } | null | undefined,
  lang: Language = 'it'
): string {
  if (!movie) return '';
  if (lang === 'en') {
    if (movie.title_en && movie.title_en.trim().length > 0) return movie.title_en.trim();
    if (movie.title_original && movie.title_original.trim().length > 0) return movie.title_original.trim();
    return movie.title_it?.trim() || movie.title?.trim() || '';
  }
  return movie.title_it?.trim() || movie.title?.trim() || movie.title_original?.trim() || '';
}

/**
 * Returns localized synopsis. When in English, prefers synopsis_en if non-empty;
 * otherwise falls back cleanly to synopsis_it and marks isFallback = true so the UI
 * never presents an empty space.
 */
export function getMovieSynopsis(
  movie: { synopsis_it?: string; synopsis_en?: string; synopsis?: string } | null | undefined,
  lang: Language = 'it'
): { text: string; isFallback: boolean } {
  if (!movie) return { text: '', isFallback: false };
  if (lang === 'en') {
    if (movie.synopsis_en && movie.synopsis_en.trim().length > 0) {
      return { text: movie.synopsis_en.trim(), isFallback: false };
    }
    const fallback = movie.synopsis_it?.trim() || movie.synopsis?.trim() || '';
    return { text: fallback, isFallback: fallback.length > 0 };
  }
  const itSynopsis = movie.synopsis_it?.trim() || movie.synopsis?.trim() || movie.synopsis_en?.trim() || '';
  return { text: itSynopsis, isFallback: false };
}
