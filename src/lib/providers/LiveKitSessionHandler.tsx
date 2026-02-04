import { useEffect, useRef, useState, createContext, useContext, ReactNode, useCallback } from 'react';
import { useLocalParticipant, useRoomContext, useTracks, AudioTrack, TrackReference } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useAudioContext, useTrackVolume } from '@/lib/hooks';
import { ChatMessage, AgentState } from '@/lib/types';
import { useSessionStore } from '@/lib/store/session-store';

interface LiveKitSessionContextValue {
  agentState: AgentState | null;
  avatarMessage: ChatMessage | undefined;
  userVolume: number;
  agentVolume: number;
}

const LiveKitSessionContext = createContext<LiveKitSessionContextValue | null>(null);

export function useLiveKitSession() {
  const context = useContext(LiveKitSessionContext);
  if (!context) {
    throw new Error('useLiveKitSession must be used within LiveKitSessionHandler');
  }
  return context;
}

interface LiveKitSessionHandlerProps {
  children: ReactNode;
  enableAudio?: boolean; // Enable agent audio playback (default: false for chat, true for avatar)
}

/**
 * LiveKitSessionHandler - Manages LiveKit session state and handlers
 *
 * Responsibilities:
 * - RPC handler registration (agent_state_changed)
 * - Transcription stream handling (lk.transcription)
 * - Agent audio track playback
 * - User microphone volume tracking
 * - Provides context for agent state and messages
 */
export function LiveKitSessionHandler({ children, enableAudio = false }: LiveKitSessionHandlerProps) {
  const [avatarMessage, setAvatarMessage] = useState<ChatMessage | undefined>(undefined);
  const [agentState, setAgentState] = useState<AgentState | null>(null);

  const { addMessage, updateMessage } = useSessionStore();

  const rpcHandlerRegistered = useRef(false);
  const transcriptionHandlerRegistered = useRef(false);

  // Store refs to avoid stale closures in registered handlers
  const addMessageRef = useRef(addMessage);
  const updateMessageRef = useRef(updateMessage);
  addMessageRef.current = addMessage;
  updateMessageRef.current = updateMessage;

  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  // Browser audio policy bypass
  useAudioContext();

  // Subscribe to agent audio tracks
  const audioTracks = useTracks([
    { source: Track.Source.Microphone, withPlaceholder: false },
  ], { onlySubscribed: true });

  // User microphone volume for UI visualization
  const userMicTrack = localParticipant.getTrackPublication(Track.Source.Microphone)?.track;
  const userVolume = useTrackVolume(userMicTrack);

  // Agent audio volume for green gradient animation
  const agentTracks = audioTracks.filter(
    (track) => track.participant.identity.startsWith('agent') && track.publication
  );
  const agentAudioTrack = agentTracks[0]?.publication?.track;
  const agentVolume = useTrackVolume(agentAudioTrack);

  // Memoized RPC handler
  const handleRpc = useCallback(async (data: { payload: string; callerIdentity: string }) => {
    try {
      const payload = JSON.parse(data.payload);
      const newState = payload.new_state as AgentState;
      setAgentState(newState);
      console.log('[LiveKitSessionHandler] Agent state changed:', newState);
    } catch (e) {
      console.error('[LiveKitSessionHandler] Failed to parse RPC payload:', e);
    }
    return '';
  }, []);

  // Register RPC handler for agent state changes
  useEffect(() => {
    if (!localParticipant || rpcHandlerRegistered.current) return;

    localParticipant.registerRpcMethod('agent_state_changed', handleRpc);
    rpcHandlerRegistered.current = true;
    console.log('[LiveKitSessionHandler] RPC handler registered');
  }, [localParticipant, handleRpc]);

  // Register TextStream handler for transcription
  useEffect(() => {
    if (!room || transcriptionHandlerRegistered.current) return;

    const handleTranscription = async (
      reader: AsyncIterable<string> & { info?: { attributes?: Record<string, string>; id?: string; timestamp?: number } },
      participantIdentity: string | { identity: string }
    ) => {
      try {
        const participantId = typeof participantIdentity === 'string'
          ? participantIdentity
          : participantIdentity?.identity;

        const isTranscription = reader.info?.attributes?.['lk.transcribed_track_id'];
        const isFinal = reader.info?.attributes?.['lk.transcription_final'] === 'true';
        const segmentId = reader.info?.attributes?.['lk.segment_id'];
        const streamId = reader.info?.id;

        const isUserTranscription = participantId === localParticipant.identity;

        if (!isTranscription) return;

        const messageId = segmentId || streamId || `msg_${Date.now()}`;

        let fullText = '';
        let messageAdded = false;

        for await (const chunk of reader) {
          fullText += chunk;

          const updatedMessage: ChatMessage = {
            id: messageId,
            message: fullText + (isFinal ? '' : ' ...'),
            isUser: isUserTranscription,
            timestamp: reader.info?.timestamp || Date.now(),
            sender: isUserTranscription ? 'You' : 'Agent',
            isFinal: isFinal,
          };

          if (!isUserTranscription) {
            setAvatarMessage(updatedMessage);
          }

          const currentMessages = useSessionStore.getState().messages;
          const existingMessage = currentMessages.find(m => m.id === messageId);

          if (existingMessage) {
            updateMessageRef.current(messageId, updatedMessage);
          } else if (!messageAdded) {
            addMessageRef.current(updatedMessage);
            messageAdded = true;
          } else {
            updateMessageRef.current(messageId, updatedMessage);
          }
        }

        const finalMessage: ChatMessage = {
          id: messageId,
          message: fullText,
          isUser: isUserTranscription,
          timestamp: reader.info?.timestamp || Date.now(),
          sender: isUserTranscription ? 'You' : 'Agent',
          isFinal: true,
        };

        if (!isUserTranscription) {
          setAvatarMessage(finalMessage);
        }

        updateMessageRef.current(messageId, finalMessage);
      } catch (error) {
        console.error('[LiveKitSessionHandler] Transcription error:', error);
      }
    };

    room.registerTextStreamHandler('lk.transcription', handleTranscription);
    transcriptionHandlerRegistered.current = true;
    console.log('[LiveKitSessionHandler] Transcription handler registered');
  }, [room, localParticipant]);

  const contextValue: LiveKitSessionContextValue = {
    agentState,
    avatarMessage,
    userVolume,
    agentVolume,
  };

  return (
    <LiveKitSessionContext.Provider value={contextValue}>
      {/* Agent audio playback - only when enableAudio is true (AvatarView) */}
      {enableAudio && audioTracks
        .filter((track) => track.participant.identity.startsWith('agent') && track.publication)
        .map((track) => (
          <AudioTrack key={track.participant.sid} trackRef={track as TrackReference} />
        ))}

      {children}
    </LiveKitSessionContext.Provider>
  );
}
