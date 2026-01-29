import { useLanguageStore, Language } from '@/lib/store/language-store';
import ko from './ko.json';
import en from './en.json';

type TranslationKey = keyof typeof ko;

const translations: Record<Language, Record<string, string>> = { ko, en };

export function useTranslation() {
  const { language, setLanguage } = useLanguageStore();

  const t = (key: TranslationKey | string): string => {
    return translations[language][key] || key;
  };

  return { t, language, setLanguage };
}

export { useLanguageStore, type Language };
