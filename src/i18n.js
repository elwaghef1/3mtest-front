import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import frTranslations from './locales/fr.json';
import arTranslations from './locales/ar.json';

// Vérifier si localStorage est disponible (pour éviter les erreurs SSR)
const getStoredLanguage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('language') || 'ar';
  }
  return 'ar';
};

const storedLanguage = getStoredLanguage();


i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: frTranslations },
      ar: { translation: arTranslations },
    },
    lng: storedLanguage, // langue par défaut
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;