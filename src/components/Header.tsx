import { useTranslation } from '@/lib/i18n';
import iconBack from '@/assets/icon-back.svg';
import logoInterbattery from '@/assets/logo-interbattery.png';
import buttonLanguage from '@/assets/button-language.png';

interface HeaderProps {
  onBack?: () => void;
  showBack?: boolean;
  onLanguageClick?: () => void;
}

export function Header({ onBack, showBack = true, onLanguageClick }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header
      className="shrink-0 flex items-center justify-between px-5 pb-3 relative z-[200]"
      style={{ paddingTop: 'calc(28px + env(safe-area-inset-top, 0px))' }}
    >
      {/* Back button */}
      {showBack && onBack ? (
        <button
          onClick={onBack}
          className="w-6 h-6 flex items-center justify-center"
          aria-label={t('common.back')}
        >
          <img src={iconBack} alt="" className="w-6 h-6" />
        </button>
      ) : (
        <div className="w-6 h-6" />
      )}

      {/* Logo */}
      <img
        src={logoInterbattery}
        alt="INTERBATTERY"
        className="absolute left-1/2 -translate-x-1/2 h-5"
      />

      {/* Language button */}
      <button
        onClick={onLanguageClick}
        className="flex items-center justify-center"
        aria-label={t('accessibility.selectLanguage')}
      >
        <img src={buttonLanguage} alt="" className="w-6 h-6" />
      </button>
    </header>
  );
}
