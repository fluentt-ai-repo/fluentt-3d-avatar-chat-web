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
