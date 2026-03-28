import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations, TranslationKey } from '@/lib/i18n';

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: TranslationKey) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
  isRtl: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('egate_lang') as Language) || 'en';
  });

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('egate_lang', l);
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: TranslationKey): string => {
    return translations[lang][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRtl: lang === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);