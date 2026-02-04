import { useEffect, useRef } from 'react';
import { ToolOption } from '@/lib/config';
import IconCheck from '@/assets/icon-check.svg?react';

interface ToolPopupProps {
  options: ToolOption[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function ToolPopup({ options, selected, onSelect, onClose }: ToolPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      className="absolute bottom-full left-0 mb-2 bg-white rounded-[10px] z-[300]"
      style={{
        backdropFilter: 'blur(17.5px)',
        boxShadow: '0 35px 35px rgba(0, 0, 0, 0.25)',
        padding: '12px',
        width: '267px'
      }}
    >
      <div className="flex flex-col gap-[10px]">
        {options.map((option, index) => {
          const isSelected = selected === option.id;
          return (
            <div key={option.id}>
              <button
                onClick={() => onSelect(option.id)}
                className="w-full flex items-center gap-1"
              >
                {/* Check icon */}
                <div
                  className="w-6 h-6 flex items-center justify-center flex-shrink-0"
                  style={{
                    color: isSelected ? '#03c3ff' : '#77818c',
                    opacity: isSelected ? 0.6 : 0.5
                  }}
                >
                  <IconCheck className="w-4 h-4" />
                </div>

                {/* Text content */}
                <div className="flex-1 flex flex-col gap-1 text-left">
                  <span
                    className="text-[15px] leading-[1.4]"
                    style={{
                      fontFamily: 'Noto Sans KR, sans-serif',
                      letterSpacing: '-0.3px',
                      color: isSelected ? '#03c3ff' : '#000'
                    }}
                  >
                    {option.name}
                  </span>
                  <span
                    className="text-[13px] leading-[1.4] text-[#78828d] whitespace-pre-line"
                    style={{
                      fontFamily: 'Noto Sans KR, sans-serif',
                      letterSpacing: '-0.26px'
                    }}
                  >
                    {option.description}
                  </span>
                </div>

                {/* Question icon */}
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                    <path
                      d="M8.5 16C12.6421 16 16 12.6421 16 8.5C16 4.35786 12.6421 1 8.5 1C4.35786 1 1 4.35786 1 8.5C1 12.6421 4.35786 16 8.5 16Z"
                      stroke="#000"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M8.5 13V13.01M8.5 10C8.5 8 10.5 8 10.5 6.5C10.5 5.39543 9.60457 4.5 8.5 4.5C7.39543 4.5 6.5 5.39543 6.5 6.5"
                      stroke="#000"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </button>

              {/* Divider */}
              {index < options.length - 1 && (
                <div className="h-[1px] bg-black/10 mt-[10px]" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
