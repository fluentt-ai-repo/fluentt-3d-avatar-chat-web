import { useState, useCallback, useEffect } from 'react';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { isADKMode, ADK_USER_ID } from '@/lib/config';
import { LiveKitProvider } from '@/lib/providers/LiveKitProvider';
import { LiveKitSessionHandler, useLiveKitSession } from '@/lib/providers/LiveKitSessionHandler';
import { ChatView } from '@/pages/ChatView';
import { AvatarView } from '@/pages/AvatarView';
import { useSessionStore } from '@/lib/store/session-store';
import { useSessionIdStore } from '@/lib/store/session-id-store';
import { sessionAPIClient } from '@/lib/api/session-api';

type ScreenType = 'chat' | 'avatar';

/**
 * App - Main application component
 *
 * Handles screen switching (chat ↔ avatar) and mode-based routing:
 * - ADK mode: ChatView uses ADK API, AvatarView uses LiveKit
 * - LiveKit mode: Both views use LiveKit
 */
export function App() {
  const [screen, setScreen] = useState<ScreenType>('chat');
  const [conversationStarted, setConversationStarted] = useState(false);
  const [isAgentReady, setIsAgentReady] = useState(false);

  /**
   * Switch to chat screen
   * In ADK mode: Sync avatar conversation to ADK session via Session API batch update
   */
  const handleSwitchToChat = useCallback(async () => {
    // Only sync in ADK mode
    if (isADKMode) {
      try {
        // Get messages and session state
        const { messages } = useSessionStore.getState();
        const { sessionId, lastBatchSyncedIndex, setLastBatchSyncedIndex } =
          useSessionIdStore.getState();

        // Get new messages since last sync
        const newMessages = messages.slice(lastBatchSyncedIndex);

        if (newMessages.length > 0) {
          console.log('[App] Syncing avatar conversation to ADK session:', {
            sessionId,
            newMessageCount: newMessages.length,
            lastBatchSyncedIndex,
          });

          // Batch update to Session API
          await sessionAPIClient.injectBatchEvents(sessionId, ADK_USER_ID, newMessages);

          // Update sync index
          setLastBatchSyncedIndex(messages.length);
          console.log('[App] Batch sync completed');
        }
      } catch (error) {
        // Log error but don't block screen transition
        console.error('[App] Batch sync failed:', error);
      }
    }

    setScreen('chat');
  }, []);

  const handleSwitchToAvatar = useCallback(() => {
    setConversationStarted(false);  // Reset conversation state
    setIsAgentReady(false);         // Reset agent ready state
    setScreen('avatar');
  }, []);
  const handleBack = useCallback(() => {
    // For now, just switch to chat. Can be extended for navigation.
    handleSwitchToChat();
  }, [handleSwitchToChat]);

  // ═══════════════════════════════════════════════════════════════════
  // ADK Mode
  // ═══════════════════════════════════════════════════════════════════
  if (isADKMode) {
    // Chat screen: No LiveKit needed
    if (screen === 'chat') {
      return (
        <div className="w-full max-w-[480px] mx-auto h-dvh max-h-[980px] bg-white overflow-hidden relative">
          <ChatView
            mode="adk"
            onBack={handleBack}
            onSwitchToAvatar={handleSwitchToAvatar}
          />
        </div>
      );
    }

    // Avatar screen: LiveKit needed with audio enabled
    return (
      <div className="w-full max-w-[480px] mx-auto h-dvh max-h-[980px] bg-white overflow-hidden relative">
        <LiveKitProvider onDisconnect={handleSwitchToChat}>
          <LiveKitSessionHandler enableAudio={true}>
            <AvatarViewWithSession
              onBack={handleBack}
              onSwitchToChat={handleSwitchToChat}
              conversationStarted={conversationStarted}
              onConversationStart={() => setConversationStarted(true)}
              isAgentReady={isAgentReady}
              onAgentReady={() => setIsAgentReady(true)}
            />
          </LiveKitSessionHandler>
        </LiveKitProvider>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // LiveKit Mode (Default)
  // Audio playback only in avatar screen
  // ═══════════════════════════════════════════════════════════════════
  const enableAudioPlayback = screen === 'avatar';

  return (
    <div className="w-full max-w-[480px] mx-auto h-dvh max-h-[980px] bg-white overflow-hidden relative">
      <LiveKitProvider onDisconnect={handleBack}>
        <LiveKitSessionHandler enableAudio={enableAudioPlayback}>
          {screen === 'chat' ? (
            <ChatView
              mode="livekit"
              onBack={handleBack}
              onSwitchToAvatar={handleSwitchToAvatar}
            />
          ) : (
            <AvatarViewWithSession
              onBack={handleBack}
              onSwitchToChat={handleSwitchToChat}
              conversationStarted={conversationStarted}
              onConversationStart={() => setConversationStarted(true)}
              isAgentReady={isAgentReady}
              onAgentReady={() => setIsAgentReady(true)}
            />
          )}
        </LiveKitSessionHandler>
      </LiveKitProvider>
    </div>
  );
}

/**
 * AvatarViewWithSession - Wrapper that injects LiveKitSession context into AvatarView
 */
function AvatarViewWithSession({
  onBack,
  onSwitchToChat,
  conversationStarted,
  onConversationStart,
  isAgentReady,
  onAgentReady,
}: {
  onBack: () => void;
  onSwitchToChat: () => void;
  conversationStarted: boolean;
  onConversationStart: () => void;
  isAgentReady: boolean;
  onAgentReady: () => void;
}) {
  const { agentState, avatarMessage, userVolume } = useLiveKitSession();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  // Auto-start conversation when agent becomes ready (listening state)
  useEffect(() => {
    if (agentState === 'listening' && !conversationStarted) {
      // Mark agent as ready (ends loading screen)
      onAgentReady();
      // Transition to conversation UI
      onConversationStart();
      console.log('[AvatarViewWithSession] Agent ready, auto-starting conversation');

      // Send start_conversation RPC
      const startConversation = async () => {
        if (!localParticipant || !room) return;

        try {
          const remoteParticipants = Array.from(room.remoteParticipants.values());
          const agentParticipant = remoteParticipants.find(p =>
            p.identity.startsWith('agent')
          );

          if (agentParticipant) {
            console.log('[AvatarViewWithSession] Sending start_conversation RPC...');
            await localParticipant.performRpc({
              destinationIdentity: agentParticipant.identity,
              method: 'start_conversation',
              payload: '',
            });
            console.log('[AvatarViewWithSession] start_conversation RPC sent');
          } else {
            console.warn('[AvatarViewWithSession] No agent participant found for RPC');
          }
        } catch (error) {
          console.error('[AvatarViewWithSession] Failed to start conversation:', error);
        }
      };

      startConversation();
    }
  }, [agentState, conversationStarted, localParticipant, room, onAgentReady, onConversationStart]);

  return (
    <AvatarView
      lastMessage={avatarMessage}
      agentState={agentState}
      userVolume={userVolume}
      onBack={onBack}
      onSwitchToChat={onSwitchToChat}
      isAgentReady={isAgentReady}
    />
  );
}
