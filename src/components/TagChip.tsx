interface TagChipProps {
  label: string;
  onRemove: () => void;
}

export function TagChip({ label, onRemove }: TagChipProps) {
  return (
    <span
      className="inline-flex items-center gap-[5px] px-3 py-2 bg-[#e8f0f5] rounded-full"
      style={{
        backdropFilter: 'blur(17.5px)',
        WebkitBackdropFilter: 'blur(17.5px)',
      }}
    >
      <span
        className="text-[14px] font-medium leading-[1.4] text-center"
        style={{
          color: '#78828d',
          fontFamily: 'Noto Sans KR, sans-serif',
          letterSpacing: '-0.28px',
        }}
      >
        {label}
      </span>
      <button
        onClick={onRemove}
        className="w-4 h-4 flex items-center justify-center"
        aria-label={`${label} 삭제`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 4L12 12M12 4L4 12"
            stroke="#78828d"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </span>
  );
}
