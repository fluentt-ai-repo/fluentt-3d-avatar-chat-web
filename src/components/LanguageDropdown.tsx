import { useEffect, useRef } from 'react';
import { Language, LANGUAGES } from '@/lib/config';

interface LanguageDropdownProps {
  isOpen: boolean;
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export function LanguageDropdown({ isOpen, selected, onSelect, onClose }: LanguageDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 bg-white rounded-[10px] z-[300]"
      style={{
        backdropFilter: 'blur(17.5px)',
        boxShadow: '0 35px 35px rgba(0, 0, 0, 0.25)',
        padding: '10px',
        border: '1px solid #fff',
      }}
    >
      <div className="flex flex-col gap-2 w-[128px]">
        {LANGUAGES.map((lang: Language) => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code)}
            className={`
              w-full h-[40px] px-4 py-3 text-center text-[14px] rounded-[8px] transition-colors
              ${selected === lang.code
                ? 'bg-[#03c3ff] text-white'
                : 'text-[#111] border border-[#ddd] hover:bg-gray-50'
              }
            `}
            style={{
              fontFamily: 'Pretendard, sans-serif',
              letterSpacing: '-0.28px',
              lineHeight: 1.4
            }}
          >
            {lang.name}
          </button>
        ))}
      </div>
    </div>
  );
}
