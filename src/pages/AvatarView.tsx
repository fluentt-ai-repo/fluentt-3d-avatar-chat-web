import { useState, useEffect, useRef } from 'react';
import { Unity, useUnityContext } from 'react-unity-webgl';
import { useLocalParticipant, useConnectionState, useRoomContext } from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
import { ChatMessage, AgentState } from '@/lib/types';
import { useAnimationData } from '@/lib/hooks';
import { useTranslation } from '@/lib/i18n';
import { Header } from '@/components/Header';
import IconMic from '@/assets/icon-mic-default.svg?react';
import iconMicMuted from '@/assets/icon-mic-muted.svg';
import IconChat from '@/assets/icon-chat.svg?react';
import avatarBackground from '@/assets/image-avatar-background-4x.png';
import avatarLoadingImage from '@/assets/image-avatar-loading.png';

interface AvatarViewProps {
  lastMessage?: ChatMessage;
  agentState: AgentState | null;
  userVolume: number;
  agentVolume: number;
  onBack: () => void;
  onSwitchToChat: () => void;
  conversationStarted: boolean;
  isAgentReady: boolean;
}

// 상태 칩 컴포넌트 (Pencil: fCyvC - massagebox)
function StatusChip({ state }: { state: AgentState | null }) {
  // Pencil 디자인 기준 상태별 텍스트
  const labels: Record<string, string> = {
    listening: '듣는 중이에요',
    thinking: '생각 중이에요',
    speaking: '궁금한 점을 물어보세요', // Pencil Speaking 화면 참조
  };

  // 상태가 없거나 idle일 때는 기본 안내 문구
  const displayText = state ? labels[state] || '궁금한 점을 물어보세요' : '궁금한 점을 물어보세요';

  return (
    <div
      className="flex items-center justify-center"
      style={{
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '99px',
        background: '#cdeeff',
        backdropFilter: 'blur(17.5px)',
        WebkitBackdropFilter: 'blur(17.5px)',
      }}
    >
      {/* indicator-status-dot (Pencil: S09vc, TPGbL) - 항상 파란색 #01a4f0 */}
      <div
        style={{
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: '#01a4f0',
        }}
      />
      {/* Greeting Text (Pencil: Dp21l, iFP6Z) */}
      <span
        style={{
          fontFamily: 'Noto Sans KR, sans-serif',
          fontSize: '10px',
          fontWeight: 500,
          letterSpacing: '-0.2px',
          lineHeight: 1.4,
          color: '#01a4f0',
        }}
      >
        {displayText}
      </span>
    </div>
  );
}

export function AvatarView({
  lastMessage,
  agentState,
  userVolume,
  agentVolume,
  onBack,
  onSwitchToChat,
  conversationStarted,
  isAgentReady,
}: AvatarViewProps) {
  const { t } = useTranslation();

  const buildName = import.meta.env.VITE_UNITY_BUILD_NAME || 'avatar';
  const { unityProvider, isLoaded, sendMessage } = useUnityContext({
    loaderUrl: `/unity/${buildName}/Build/${buildName}.loader.js`,
    dataUrl: `/unity/${buildName}/Build/${buildName}.data`,
    frameworkUrl: `/unity/${buildName}/Build/${buildName}.framework.js`,
    codeUrl: `/unity/${buildName}/Build/${buildName}.wasm`,
    webglContextAttributes: {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    },
  });
  const { latestFrame, interruptSignal } = useAnimationData();
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  const room = useRoomContext();

  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const hasUserInteracted = useRef(false);
  const hasStartedConversation = useRef(false);
  const firstUnityFrameTimeRef = useRef<number | null>(null);
  const unitySentCountRef = useRef(0);

  useEffect(() => {
    return () => {
      firstUnityFrameTimeRef.current = null;
      unitySentCountRef.current = 0;
    };
  }, []);

  // iOS Safari workaround: Send background color to Unity
  // Safari doesn't properly support WebGL alpha transparency
  useEffect(() => {
    if (!isLoaded) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return;

    // Get computed background color from body
    const bgColor = getComputedStyle(document.body).backgroundColor;

    // Convert rgb(r, g, b) to hex #rrggbb
    const rgbToHex = (rgb: string): string => {
      const match = rgb.match(/\d+/g);
      if (!match || match.length < 3) return '#000000';
      const [r, g, b] = match.map(Number);
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    };

    const hexColor = rgbToHex(bgColor);
    console.log('[AvatarView] iOS Safari detected, sending background color to Unity:', hexColor);

    sendMessage('ReactBridge', 'OnReactMessage', JSON.stringify({
      action: 'setBackgroundColor',
      backgroundColor: hexColor,
    }));
  }, [isLoaded, sendMessage]);

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

  useEffect(() => {
    if (localParticipant && isLoaded && connectionState === ConnectionState.Connected && conversationStarted) {
      const timer = setTimeout(() => {
        if (!hasUserInteracted.current) {
          localParticipant.setMicrophoneEnabled(true);
          setIsMicEnabled(true);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [localParticipant, isLoaded, connectionState, conversationStarted]);

  // Unity 로딩 완료 + Agent 준비 완료 = 로딩 오버레이 해제 = 아바타 화면 표시
  // 이 시점에 start_conversation RPC 전송
  useEffect(() => {
    if (isLoaded && isAgentReady && !hasStartedConversation.current) {
      hasStartedConversation.current = true;

      // 아바타가 화면에 보인 후 1.5초 대기
      const timer = setTimeout(async () => {
        if (!localParticipant || !room) return;

        try {
          const remoteParticipants = Array.from(room.remoteParticipants.values());
          const agentParticipant = remoteParticipants.find(p => p.identity.startsWith('agent'));

          if (agentParticipant) {
            await localParticipant.performRpc({
              destinationIdentity: agentParticipant.identity,
              method: 'start_conversation',
              payload: '',
            });
            console.log('[AvatarView] start_conversation RPC sent (after loading complete)');
          }
        } catch (error) {
          console.error('[AvatarView] Failed to send start_conversation RPC:', error);
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isLoaded, isAgentReady, localParticipant, room]);

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

  useEffect(() => {
    if (interruptSignal > 0 && isLoaded) {
      sendMessage('ReactBridge', 'OnAnimationData', 'interrupted');
    }
  }, [interruptSignal, isLoaded, sendMessage]);

  useEffect(() => {
    if (isLoaded && agentState) {
      const message = JSON.stringify({ action: 'setAgentState', state: agentState });
      sendMessage('ReactBridge', 'OnReactMessage', message);
    }
  }, [isLoaded, agentState, sendMessage]);

  useEffect(() => {
    if (isLoaded && latestFrame) {
      const now = performance.now();

      if (firstUnityFrameTimeRef.current === null) {
        firstUnityFrameTimeRef.current = now;
        console.log('[AvatarView -> Unity] First frame sent');
      }

      unitySentCountRef.current++;

      let frameString: string;
      if (latestFrame.length === 208) {
        frameString = Array.from(latestFrame).join(',');
      } else {
        frameString = new TextDecoder().decode(latestFrame);
      }

      sendMessage('ReactBridge', 'OnAnimationData', frameString);

      if (unitySentCountRef.current % 20 === 0) {
        const elapsed = now - (firstUnityFrameTimeRef.current || now);
        const avgInterval = elapsed / unitySentCountRef.current;
        console.log(`[AvatarView -> Unity] Sent ${unitySentCountRef.current} frames, ~${(1000 / avgInterval).toFixed(1)} FPS`);
      }
    }
  }, [isLoaded, latestFrame, sendMessage]);

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundImage: `url(${avatarBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Loading overlay - Unity 로딩 + Agent 준비 완료까지 표시 */}
      {(!isLoaded || !isAgentReady) && (
        <div className="absolute inset-0 z-[100] overflow-hidden bg-[#a8d8ea]">
          {/* 배경 이미지 */}
          <img
            src={avatarLoadingImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* header (Pencil: dznzD) - 기존 Header 컴포넌트 사용 */}
          <div
            className="absolute top-0 left-0 right-0 w-full max-w-[480px] mx-auto z-[200]"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <Header onBack={onBack} />
          </div>

          {/* container (Pencil: hc0uU) - 텍스트 영역 */}
          <div
            className="absolute left-0 right-0 flex flex-col items-center"
            style={{
              top: 134,
              padding: '20px 20px 8px 20px',
              gap: 8,
            }}
          >
            {/* FAQ Title - AI 캐릭터를 불러오고 있어요! */}
            <h1
              style={{
                fontFamily: 'Noto Sans KR, sans-serif',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: -0.4,
                lineHeight: 1.4,
                color: '#000000',
                textAlign: 'center',
                width: '100%',
              }}
            >
              AI 캐릭터를 불러오고 있어요!
            </h1>
            {/* FAQ Title - 서브 텍스트 */}
            <p
              style={{
                fontFamily: 'Noto Sans KR, sans-serif',
                fontSize: 14,
                fontWeight: 'normal',
                letterSpacing: -0.28,
                lineHeight: 1.4,
                color: '#000000',
                opacity: 0.5,
                textAlign: 'center',
                width: '100%',
              }}
            >
              내 목소리를 듣고 자연스럽게 대답하는 캐릭터와
              <br />
              편리하게 대화할 수 있습니다
            </p>
          </div>

          {/* container-greeting-bubble (Pencil: n4MDf) */}
          <div
            className="absolute flex flex-col items-center"
            style={{ top: 278, left: '50%', transform: 'translateX(-50%)' }}
          >
            {/* massagebox (Pencil: 5khCJ) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '8px 12px',
                borderRadius: 999,
                background: '#ffffff',
                backdropFilter: 'blur(17.5px)',
                WebkitBackdropFilter: 'blur(17.5px)',
              }}
            >
              {/* Greeting Text (Pencil: 5y1vq) */}
              <span
                style={{
                  fontFamily: 'Noto Sans KR, sans-serif',
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: -0.28,
                  lineHeight: 1.4,
                  color: '#01a4f0',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                궁금한것 무엇이든 물어보세요
              </span>
            </div>
            {/* 말풍선 꼬리 (Pencil: AJxHK - Vector 3258) */}
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid #ffffff',
              }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col h-full">
        {/* Agent speaking gradient - 상단 녹색 (Pencil: effect-gradient-green) */}
        {/* 볼륨에 따라 동적으로 높이와 투명도 변경 */}
        {/* 항상 렌더링 + opacity로 제어하여 부드러운 fade-out 구현 */}
        <div
          className="absolute left-0 right-0 top-0 pointer-events-none z-[40]"
          style={{
            height: agentState === 'speaking' ? `${15 + agentVolume * 25}%` : '15%',
            background: 'linear-gradient(to bottom, #71f0a7, transparent)',
            opacity: agentState === 'speaking' ? 0.3 + agentVolume * 0.7 : 0,
            transition: 'height 0.2s ease-out, opacity 0.3s ease-out', // fade-out은 0.3s로 약간 길게
          }}
        />

        {/* Header - 투명 배경 (Pencil: aY7E1) */}
        <div
          className="absolute top-0 left-0 right-0 w-full max-w-[480px] mx-auto z-[200]"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <Header onBack={onBack} />
        </div>
        <div className="shrink-0" style={{ height: 'calc(56px + env(safe-area-inset-top, 0px))' }} />

        {/* Unity container */}
        <div className="flex-1 relative min-h-[300px]">
          <div className="absolute inset-0 flex justify-center items-end" style={{ zIndex: 45 }}>
            <div style={{ width: 'min(360px, 100vw)', height: '100%' }}>
              <Unity unityProvider={unityProvider} devicePixelRatio={window.devicePixelRatio} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
        </div>

        {/* User speaking gradient - 하단 파란색 (Pencil: effect-gradient-blue) */}
        {/* 바텀 패널 위쪽 영역만 커버, 투명도만 조절 */}
        {isMicEnabled && (
          <div
            className="absolute left-0 right-0 pointer-events-none z-[60]"
            style={{
              top: '40%',
              bottom: 'calc(150px + env(safe-area-inset-bottom, 0px))', // 바텀 패널 높이만큼 위에서 멈춤
              background: 'linear-gradient(to top, rgba(0, 145, 212, 0.8), transparent 70%)',
              opacity: userVolume > 0.1 ? Math.min((userVolume - 0.1) * 3, 1) : 0,
              transition: 'opacity 0.2s ease-out',
            }}
          />
        )}

        {/* Footer - section-bottom-panel (Pencil: PJFTo) */}
        {/* 높이 고정: 상태칩(22) + 메시지(62) + 버튼(50) + gap(20) + padding(40) = 194px */}
        <div
            className="shrink-0 relative z-[70] flex flex-col items-center"
            style={{
              height: 'calc(194px + env(safe-area-inset-bottom, 0px))',
              padding: '16px 20px 24px 20px',
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(35px)',
              WebkitBackdropFilter: 'blur(35px)',
              borderRadius: '20px 20px 0 0',
              boxShadow: '0 -8.75px 8.75px rgba(3, 195, 255, 0.2)',
              gap: '10px',
            }}
          >
            {/* container-status-message (Pencil: Rwhg3) */}
            <div
              className="relative z-[71] flex flex-col items-center"
              style={{
                gap: '8px',
                width: '100%',
              }}
            >
              {/* 상태 칩 (Pencil: fCyvC) */}
              <StatusChip state={agentState} />

              {/* 메시지 텍스트 영역 - 3줄 고정 높이, 초과 시 위쪽 잘림 */}
              <div
                className="overflow-hidden flex flex-col justify-end"
                style={{
                  height: '62px', // 3줄 높이 (16px × 1.3 × 3 ≈ 62px)
                  width: '100%',
                }}
              >
                {lastMessage && (
                  <p
                    style={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: '16px',
                      fontWeight: 'normal',
                      letterSpacing: '-0.16px',
                      lineHeight: 1.3,
                      textAlign: 'center',
                      color: '#000000',
                      width: '100%',
                    }}
                  >
                    {lastMessage.message}
                  </p>
                )}
              </div>
            </div>

            {/* container-action-buttons (Pencil: S041B) */}
            <div
              className="relative z-[71] flex items-center justify-between"
              style={{
                width: '320px',
              }}
            >
              {/* 좌측: 마이크 버튼 (Pencil: h4eN4) */}
              <button
                onClick={toggleMic}
                onDoubleClick={handleInterruptAgent}
                className="flex items-center justify-center"
                style={isMicEnabled ? {
                  height: '50px',
                  gap: '4px',
                  padding: '0 20px',
                  borderRadius: '999px',
                  background: 'linear-gradient(137.78deg, #03c3ff 0%, #03c177 100%)',
                  boxShadow: '0 4px 15px rgba(3, 195, 255, 0.5)',
                  border: '1.5px solid transparent',
                } : {
                  height: '50px',
                  gap: '4px',
                  padding: '0 20px',
                  borderRadius: '999px',
                  background: '#f8cad2',
                  border: '0.5px solid rgba(218, 32, 61, 0.15)',
                }}
                aria-label={isMicEnabled ? t('accessibility.muteMic') : t('accessibility.unmuteMic')}
                aria-pressed={isMicEnabled}
              >
                {isMicEnabled ? (
                  <IconMic className="w-[17px] h-[23px]" style={{ color: '#ffffff' }} />
                ) : (
                  <img src={iconMicMuted} alt="" className="w-[17px] h-[23px]" />
                )}
                <span
                  style={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '-0.14px',
                    lineHeight: 1.3,
                    color: isMicEnabled ? '#ffffff' : '#da203d',
                    textAlign: 'center',
                  }}
                >
                  음소거
                </span>
              </button>

              {/* 우측: 채팅 버튼 (Pencil: fR1NA) */}
              <button
                onClick={onSwitchToChat}
                className="flex items-center justify-center"
                style={{
                  height: '50px',
                  gap: '4px',
                  padding: '0 20px',
                  borderRadius: '999px',
                  background: '#ffffff',
                  border: '0.5px solid rgba(1, 45, 152, 0.15)',
                }}
                aria-label={t('accessibility.switchToChat')}
              >
                <IconChat className="w-6 h-6" />
                <span
                  style={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '-0.14px',
                    lineHeight: 1.3,
                    color: '#03c3e2',
                    textAlign: 'center',
                  }}
                >
                  채팅
                </span>
              </button>
            </div>
          </div>
      </div>
    </div>
  );
}
