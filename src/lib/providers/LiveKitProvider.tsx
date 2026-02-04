import { useEffect, useCallback, useRef } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';
import { useLiveKit } from '@/lib/hooks';
import { useLanguageStore } from '@/lib/store/language-store';
import { useSessionStore } from '@/lib/store/session-store';
import { useTranslation } from '@/lib/i18n';
import { HistoryMessage } from '@/lib/types';

// Constants for JWT metadata size limits
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 200;
const MAX_METADATA_SIZE = 4096; // 4KB limit

interface LiveKitProviderProps {
  children: React.ReactNode;
  onDisconnect?: () => void;
}

/**
 * LiveKitProvider - Handles LiveKit connection lifecycle
 *
 * Responsibilities:
 * - Token generation via useLiveKit hook
 * - LiveKitRoom context provider
 * - Loading/error states
 * - Connection lifecycle management
 */
export function LiveKitProvider({ children, onDisconnect }: LiveKitProviderProps) {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const { token, serverUrl, connect, reset, error } = useLiveKit();
  const hasConnected = useRef(false);

  // Auto-connect on mount with chat history
  useEffect(() => {
    if (hasConnected.current) return;
    hasConnected.current = true;

    // Get existing chat messages and convert to history format for agent context
    const { messages } = useSessionStore.getState();

    // Build chat history with size limits to keep JWT token small
    let chatHistory: HistoryMessage[] = messages
      .filter((m) => m.isFinal !== false && m.message.trim())
      .slice(-MAX_HISTORY_MESSAGES) // Limit message count
      .map((m) => ({
        role: m.isUser ? 'user' : 'assistant',
        // Truncate long messages
        content: m.message.length > MAX_MESSAGE_LENGTH
          ? m.message.slice(0, MAX_MESSAGE_LENGTH) + '…'
          : m.message,
      }));

    // Further trim if total size exceeds limit
    let serialized = JSON.stringify({ chatHistory });
    while (serialized.length > MAX_METADATA_SIZE && chatHistory.length > 1) {
      chatHistory = chatHistory.slice(1);
      serialized = JSON.stringify({ chatHistory });
    }

    // Connect with chat history in metadata (agent will use for context)
    if (chatHistory.length > 0) {
      console.log('[LiveKitProvider] Connecting with chat history:', chatHistory.length, 'messages');
      connect(language, { chatHistory });
    } else {
      connect(language);
    }
  }, [connect, language]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const handleDisconnect = useCallback(() => {
    reset();
    onDisconnect?.();
  }, [reset, onDisconnect]);

  const handleRetry = useCallback(() => {
    hasConnected.current = false;
    connect(language);
  }, [connect, language]);

  // Error state
  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8">
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg text-sm text-center">
          {error}
        </div>
        <button
          onClick={handleRetry}
          className="px-6 py-2 bg-[#6490ff] text-white rounded-lg"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  // Connected - render LiveKitRoom with children
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={false}  // Mic is enabled by AvatarView after Unity loads
      video={false}
      onConnected={() => {
        console.log('[LiveKitProvider] Connected to LiveKit room');
      }}
      onDisconnected={() => {
        handleDisconnect();
        console.log('[LiveKitProvider] Disconnected from LiveKit room');
      }}
    >
      {children}
    </LiveKitRoom>
  );
}
