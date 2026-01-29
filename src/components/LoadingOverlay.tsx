import { useTranslation } from '@/lib/i18n';

interface LoadingOverlayProps {
  progress?: number;
  message?: string;
}

export function LoadingOverlay({ progress = 0, message }: LoadingOverlayProps) {
  const { t } = useTranslation();

  // SVG 원형 프로그레스 계산
  const size = 120;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <div className="flex flex-col items-center justify-center">
      {/* 원형 프로그레스 */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* 배경 트랙 */}
        <svg
          className="absolute inset-0"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(0, 45, 152, 0.15)"
            strokeWidth={strokeWidth}
          />
        </svg>

        {/* 프로그레스 링 */}
        <svg
          className="absolute inset-0 -rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#002D98" />
              <stop offset="100%" stopColor="#3366CC" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: 'drop-shadow(0 0 8px rgba(0, 45, 152, 0.4))',
            }}
          />
        </svg>

        {/* 중앙 퍼센트 텍스트 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-2xl font-medium tabular-nums"
            style={{ color: '#002D98' }}
          >
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>

      {/* 로딩 메시지 */}
      <p
        className="mt-6 text-[15px]"
        style={{ color: '#666666', letterSpacing: '-0.3px' }}
      >
        {message || t('common.loading')}
      </p>
    </div>
  );
}
