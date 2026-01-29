// Chat 메시지
export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: number;
  sender?: string;
  isFinal?: boolean;
}

// Agent 상태
export type AgentState = 'initializing' | 'idle' | 'listening' | 'thinking' | 'speaking';

// 화면 타입
export type ScreenType = 'chat' | 'avatar';

// FAQ 항목 (metadata 전송용)
export interface FAQItem {
  question: string;
  answer: string;
}

// 대화 히스토리 메시지 (LiveKit Agent 전달용)
export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

// LiveKit 메타데이터
export interface ClientMetadata {
  language: string;
  faqs?: FAQItem[];
  chatHistory?: HistoryMessage[];
}

// 토큰 요청/응답
export interface TokenRequest {
  room: string;
  identity: string;
  livekitUrl: string;
  metadata: ClientMetadata;
}

export interface TokenResponse {
  token: string;
}
