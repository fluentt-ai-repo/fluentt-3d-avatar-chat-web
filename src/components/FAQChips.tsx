import { FAQItem } from '@/lib/config';
import IconSearch from '@/assets/icon-search.svg?react';
import IconExternalLink from '@/assets/icon-external-link.svg?react';

interface FAQChipsProps {
  items: FAQItem[];
  onSelect: (item: FAQItem) => void;
}

export function FAQChips({ items, onSelect }: FAQChipsProps) {
  const handleClick = (item: FAQItem) => {
    if (item.type === 'link' && item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else {
      onSelect(item);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => handleClick(item)}
          className={`
            inline-flex items-center justify-center gap-[5px] px-3 py-2 rounded-full border-none
            text-center text-[14px] font-medium leading-[1.4] tracking-[-0.28px] transition-colors
            backdrop-blur-[17.5px]
            ${item.type === 'link'
              ? 'bg-[#cdeeff] text-[#01a4f0] hover:bg-[#b8e5ff]'
              : 'bg-[#8b95a129] text-[#78828d] hover:bg-[#8b95a1]/25'
            }
          `}
        >
          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {item.type === 'link' ? (
              <IconExternalLink className="w-4 h-4" />
            ) : (
              <IconSearch className="w-4 h-4" />
            )}
          </span>
          <span className="flex-1">{item.text}</span>
        </button>
      ))}
    </div>
  );
}
