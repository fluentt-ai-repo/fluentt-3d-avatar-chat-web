/**
 * Environment configuration helpers
 * Controls chat mode (ADK vs LiveKit) and API URLs
 */

// Chat mode: 'adk' or 'livekit'
export const CHAT_MODE = import.meta.env.VITE_CHAT_MODE || 'livekit';
export const isADKMode = CHAT_MODE === 'adk';
export const isLiveKitMode = CHAT_MODE === 'livekit';

// ADK API URL
export const ADK_URL = import.meta.env.VITE_ADK_URL || '';
export const ADK_USER_ID = import.meta.env.VITE_ADK_USER_ID || 'web_user';
export const ADK_APP_NAME = import.meta.env.VITE_ADK_APP_NAME || 'rag_agent';

// Session API configuration (for syncing avatar conversations with ADK sessions)
export const SESSION_API_URL = import.meta.env.VITE_SESSION_API_URL || '';
export const SESSION_API_KEY = import.meta.env.VITE_SESSION_API_KEY || '';

// LiveKit configuration
export const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || '';
export const ROOM_PREFIX = import.meta.env.VITE_ROOM_PREFIX || 'avatar';

// Unity build name
export const UNITY_BUILD_NAME = import.meta.env.VITE_UNITY_BUILD_NAME || 'avatar';

// ============================================
// UI Configuration
// ============================================

// FAQ Items
export interface FAQItem {
  id: string;
  text: string;
  type: 'search' | 'link';
  url?: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  { id: 'faq1', text: '서비스 이용 방법이 궁금해요', type: 'search' },
  { id: 'faq2', text: '운영 시간은 어떻게 되나요?', type: 'search' },
  { id: 'faq3', text: '문의는 어디로 하나요?', type: 'search' },
  { id: 'link1', text: '공식 홈페이지 바로가기', type: 'link', url: 'https://example.com' },
];

// Tool Options
export interface ToolOption {
  id: string;
  name: string;
  description: string;
  showAsTag: boolean;
  tagLabel?: string;
  prefix?: string; // ADK Agent 라우팅용 prefix (@@TOOL:xxx@@)
}

export const TOOL_OPTIONS: ToolOption[] = [
  {
    id: 'search',
    name: '일반 검색',
    description: '일반적인 질문에 빠른 답변을 제공합니다',
    showAsTag: false,
    prefix: '', // prefix 없음 = Root Agent가 판단
  },
  {
    id: 'manual',
    name: '메뉴얼 검색',
    description: '메뉴얼 및 FAQ를 검색합니다',
    showAsTag: true,
    tagLabel: '메뉴얼',
    prefix: '@@TOOL:manual@@',
  },
  {
    id: 'recommend',
    name: '맞춤 추천',
    description: '상황에 맞는 추천을 제공합니다',
    showAsTag: true,
    tagLabel: '추천',
    prefix: '@@TOOL:recommend@@',
  },
];

// Languages
export interface Language {
  code: string;
  name: string;
}

export const LANGUAGES: Language[] = [
  { code: 'ko', name: '한국어' },
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
];

export const DEFAULT_LANGUAGE = 'ko';
