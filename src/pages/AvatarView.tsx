import { useState, useEffect, useRef } from 'react';
import { Unity, useUnityContext } from 'react-unity-webgl';
import { useLocalParticipant, useConnectionState, useRoomContext } from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
import { ChatMessage, AgentState } from '@/lib/types';
import { useAnimationData } from '@/lib/hooks';
import { useTranslation } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import iconMic from '@/assets/icon-mic-default.svg';
import iconMicMuted from '@/assets/icon-mic-muted.svg';
import iconChat from '@/assets/icon-chat-4x.png';

let firstUnityFrameTime: number | null = null;
let unitySentCount = 0;

interface AvatarViewProps {
  lastMessage?: ChatMessage;
  agentState: AgentState | null;
  userVolume: number;
  onBack: () => void;
  onSwitchToChat: () => void;
  isAgentReady: boolean;
}

export function AvatarView({
  lastMessage,
  agentState,
  userVolume,
  onBack,
  onSwitchToChat,
  isAgentReady,
}: AvatarViewProps) {
  const { t } = useTranslation();

  // Loading state: show loading until both Unity and Agent are ready
  const isLoading = !isAgentReady;

  // Unity context - load when this component mounts
  const buildName = import.meta.env.VITE_UNITY_BUILD_NAME || 'avatar';
  const { unityProvider, isLoaded, loadingProgression, sendMessage } = useUnityContext({
    loaderUrl: `/unity/${buildName}/Build/${buildName}.loader.js`,
    dataUrl: `/unity/${buildName}/Build/${buildName}.data`,
    frameworkUrl: `/unity/${buildName}/Build/${buildName}.framework.js`,
    codeUrl: `/unity/${buildName}/Build/${buildName}.wasm`,
  });
  const { latestFrame, interruptSignal } = useAnimationData();
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  const room = useRoomContext();

  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const hasUserInteracted = useRef(false);

  // Microphone state tracking
  useEffect(() => {
    if (!localParticipant) return;

    const setupTrackListeners = (micTrack: ReturnType<typeof localParticipant.getTrackPublication>) => {
      if (!micTrack) return null;

      const updateMicState = () => {
        setIsMicEnabled(!micTrack.isMuted);
      };

      updateMicState();
      micTrack.on('muted', updateMicState);
      micTrack.on('unmuted', updateMicState);

      return () => {
        micTrack.off('muted', updateMicState);
        micTrack.off('unmuted', updateMicState);
      };
    };

    let cleanup = setupTrackListeners(localParticipant.getTrackPublication(Track.Source.Microphone));

    const handleTrackPublished = async () => {
      const micTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
      if (micTrack) {
        cleanup?.();
        cleanup = setupTrackListeners(micTrack);
      }
    };

    localParticipant.on('localTrackPublished', handleTrackPublished);

    return () => {
      cleanup?.();
      localParticipant.off('localTrackPublished', handleTrackPublished);
    };
  }, [localParticipant]);

  // Auto-enable microphone when Unity is loaded, connected, AND agent is ready
  useEffect(() => {
    if (localParticipant && isLoaded && connectionState === ConnectionState.Connected && isAgentReady) {
      const timer = setTimeout(() => {
        if (!hasUserInteracted.current) {
          localParticipant.setMicrophoneEnabled(true);
          setIsMicEnabled(true);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [localParticipant, isLoaded, connectionState, isAgentReady]);

  const toggleMic = async () => {
    if (localParticipant) {
      hasUserInteracted.current = true;
      const newState = !isMicEnabled;
      await localParticipant.setMicrophoneEnabled(newState);
      setIsMicEnabled(newState);
    }
  };

  const handleInterruptAgent = async () => {
    if (!localParticipant || !room) return;

    if (isLoaded) {
      sendMessage('ReactBridge', 'OnAnimationData', 'interrupted');
    }

    const remoteParticipants = Array.from(room.remoteParticipants.values());
    const agentParticipant = remoteParticipants.find(p => p.identity.startsWith('agent'));

    if (agentParticipant) {
      await localParticipant.performRpc({
        destinationIdentity: agentParticipant.identity,
        method: 'interrupt_agent',
        payload: '',
      });
    }
  };

  // Send interrupt signal to Unity
  useEffect(() => {
    if (interruptSignal > 0 && isLoaded) {
      sendMessage('ReactBridge', 'OnAnimationData', 'interrupted');
    }
  }, [interruptSignal, isLoaded, sendMessage]);

  // Send agent state to Unity
  useEffect(() => {
    if (isLoaded && agentState) {
      const message = JSON.stringify({ action: 'setAgentState', state: agentState });
      sendMessage('ReactBridge', 'OnReactMessage', message);
    }
  }, [isLoaded, agentState, sendMessage]);

  // Send animation frames to Unity
  useEffect(() => {
    if (isLoaded && latestFrame) {
      const now = performance.now();

      if (firstUnityFrameTime === null) {
        firstUnityFrameTime = now;
        console.log('[AvatarView -> Unity] First frame sent');
      }

      unitySentCount++;

      let frameString: string;
      if (latestFrame.length === 208) {
        frameString = Array.from(latestFrame).join(',');
      } else {
        frameString = new TextDecoder().decode(latestFrame);
      }

      sendMessage('ReactBridge', 'OnAnimationData', frameString);

      if (unitySentCount % 20 === 0) {
        const elapsed = now - (firstUnityFrameTime || now);
        const avgInterval = elapsed / unitySentCount;
        console.log(`[AvatarView -> Unity] Sent ${unitySentCount} frames, ~${(1000 / avgInterval).toFixed(1)} FPS`);
      }
    }
  }, [isLoaded, latestFrame, sendMessage]);

  // Show loading overlay until both Unity is loaded AND agent is ready
  const showLoadingOverlay = !isLoaded || isLoading;

  return (
    <div className="bg-white relative w-full h-full overflow-hidden">
      {/* Loading overlay - Unity must render in background for loading to progress */}
      {showLoadingOverlay && (
        <div className="absolute inset-0 z-[100] bg-white flex flex-col">
          {/* Header - Fixed at top with safe-area */}
          <div
            className="fixed top-0 left-0 right-0 w-full max-w-[480px] mx-auto z-[200] bg-white"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <Header onBack={onBack} />
          </div>
          {/* Spacer for fixed header */}
          <div style={{ height: 'calc(56px + env(safe-area-inset-top, 0px))' }} />
          <div className="flex-1 flex items-center justify-center">
            <LoadingOverlay progress={isLoaded ? 1 : loadingProgression} />
          </div>
        </div>
      )}

      <div className="flex flex-col h-full">
        {/* Header - Fixed at top with safe-area */}
        <div
          className="fixed top-0 left-0 right-0 w-full max-w-[480px] mx-auto z-[200] bg-white"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <Header onBack={onBack} />
        </div>
        {/* Spacer for fixed header */}
        <div className="shrink-0" style={{ height: 'calc(56px + env(safe-area-inset-top, 0px))' }} />

        {/* Message display area */}
        <div
          className="shrink-0 px-5 flex flex-col justify-end overflow-hidden"
          style={{ height: 'calc(20px * var(--font-scale, 1) * 1.4 * 3 + 32px)' }}
        >
          {isLoaded && lastMessage && (
            <p className="text-[20px] leading-[1.4] tracking-[-0.46px] text-black text-center">
              {lastMessage.message}
            </p>
          )}
        </div>

        {/* Unity container - must always render for loading to work */}
        <div className="flex-1 relative min-h-[300px]">
          <div className="absolute inset-0 flex justify-center items-end" style={{ zIndex: 45 }}>
            <div style={{ width: 'min(360px, 100vw)', height: '100%' }}>
              <Unity unityProvider={unityProvider} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
        </div>

        {/* Footer - Conversation UI */}
        <div className="shrink-0 relative z-[70]">
          {/* Gradient overlay */}
          <div className="w-full h-[100px] bg-gradient-to-b from-transparent to-white -mt-[100px] pointer-events-none" />

          {/* Volume indicator */}
          {isMicEnabled && (
            <div
              className="absolute left-0 right-0 bottom-0 pointer-events-none"
              style={{
                height: '150px',
                zIndex: 60,
                background: 'linear-gradient(to top, rgba(0, 45, 152, 0.5), transparent)',
                opacity: userVolume > 0.02 ? Math.min((userVolume - 0.02) * 3, 1) : 0,
                transition: 'opacity 0.2s ease-in-out',
              }}
            />
          )}

          {/* Footer background layer - z-55, covered by volume */}
          <div className="absolute inset-0 z-[55]">
            <div className="w-full h-[100px] bg-gradient-to-b from-transparent to-white -mt-[100px] pointer-events-none" />
            <div
              className="bg-white h-[70px] w-full"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            />
          </div>

          {/* Buttons/text layer - z-90, above volume */}
          <div
            className="relative z-[90] flex items-center justify-between px-8 py-4"
            style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* Chat mode button */}
            <button
              onClick={onSwitchToChat}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center"
              style={{ border: '1.5px solid rgba(0, 45, 152, 0.2)' }}
            >
              <img src={iconChat} alt="" className="w-6 h-6" />
            </button>

            {/* Agent state */}
            <div className="flex-1 text-center">
              <p className="text-[16px] text-[#666666] font-medium">
                {agentState === 'listening' && t('avatar.listening')}
                {agentState === 'thinking' && t('avatar.thinking')}
                {agentState === 'speaking' && t('avatar.speaking')}
              </p>
            </div>

            {/* Mic toggle */}
            <button
              onClick={toggleMic}
              onDoubleClick={handleInterruptAgent}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center"
              style={{ border: '1.5px solid rgba(0, 45, 152, 0.2)' }}
            >
              <img
                src={isMicEnabled ? iconMic : iconMicMuted}
                alt=""
                className="w-6 h-6"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
