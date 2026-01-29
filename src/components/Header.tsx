import { useTranslation } from '@/lib/i18n';
import iconBack from '@/assets/icon-back.svg';
import logoInterbattery from '@/assets/logo-interbattery.png';
import iconLanguage from '@/assets/icon-language.png';

interface HeaderProps {
  onBack?: () => void;
  showBack?: boolean;
}

export function Header({ onBack, showBack = true }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header
      className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-[rgba(187,194,201,0.5)] relative z-[200]"
      style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}
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

      {/* Language button (design only) */}
      <button className="w-6 h-6 flex items-center justify-center">
        <img src={iconLanguage} alt="" className="w-6 h-6" />
      </button>
    </header>
  );
}
