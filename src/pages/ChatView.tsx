import { useState, useRef, useEffect } from 'react';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import ReactMarkdown from 'react-markdown';
import { useSessionStore } from '@/lib/store/session-store';
import { useADK } from '@/lib/hooks';
import { useTranslation } from '@/lib/i18n';
import { Header } from '@/components/Header';
import iconSendMessage from '@/assets/icon-send-message-4x.png';
import iconToAvatar from '@/assets/icon-to-avatar.png';

type ChatMode = 'adk' | 'livekit';

interface ChatViewProps {
  mode: ChatMode;
  onBack: () => void;
  onSwitchToAvatar: () => void;
}

/**
 * ChatView - Text chat interface
 *
 * Supports two modes:
 * - ADK mode: Uses useADK hook to communicate with ADK API
 * - LiveKit mode: Uses LiveKit RPC to communicate with agent
 */
export function ChatView({ mode, onBack, onSwitchToAvatar }: ChatViewProps) {
  const { t } = useTranslation();
  const { messages, addMessage } = useSessionStore();

  // ADK mode hook
  const adk = mode === 'adk' ? useADK() : null;

  // LiveKit mode hooks (only used when mode is 'livekit')
  // Note: These hooks must be called conditionally since LiveKitRoom context
  // may not exist in ADK mode
  const liveKitContext = useLiveKitContext(mode);

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom only when a new message is added (not on updates)
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Refocus input when loading completes
  const isLoading = mode === 'adk' ? adk?.isLoading : false;
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');

    // Keep focus on input after sending
    inputRef.current?.focus();

    if (mode === 'adk' && adk) {
      // ADK mode: Use ADK API
      await adk.sendMessage(text);
    } else if (mode === 'livekit' && liveKitContext) {
      // LiveKit mode: Use RPC
      const { localParticipant, room } = liveKitContext;

      // Add user message to chat
      addMessage({
        id: `user-${Date.now()}`,
        message: text,
        isUser: true,
        timestamp: Date.now(),
        sender: 'You',
        isFinal: true,
      });

      // Send to agent via RPC
      try {
        const remoteParticipants = Array.from(room.remoteParticipants.values());
        const agentParticipant = remoteParticipants.find(p => p.identity.startsWith('agent'));

        if (agentParticipant) {
          await localParticipant.performRpc({
            destinationIdentity: agentParticipant.identity,
            method: 'send_text_input',
            payload: JSON.stringify({ text }),
          });
          console.log('[ChatView] Text sent to agent:', text);
        }
      } catch (error) {
        console.error('[ChatView] Failed to send text:', error);
      }
    }
  };

  // Dynamic button handler: send message if text exists, switch to avatar if empty
  const handleDynamicButton = () => {
    if (inputText.trim()) {
      handleSendMessage();
    } else {
      onSwitchToAvatar();
    }
  };

  return (
    <div className="bg-white relative w-full max-w-[430px] mx-auto h-dvh flex flex-col overflow-hidden">
      {/* Header - Fixed at top with safe-area */}
      <div
        className="fixed top-0 left-0 right-0 w-full max-w-[430px] mx-auto z-[200] bg-white"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <Header onBack={onBack} />
      </div>

      {/* Messages - with margin for fixed header */}
      <div
        className="flex-1 overflow-y-auto px-5 py-2 scrollbar-hide"
        style={{
          marginTop: 'max(44px, calc(44px + env(safe-area-inset-top, 0px)))',
          marginBottom: 'max(80px, calc(80px + env(safe-area-inset-bottom, 0px)))',
        }}
      >
        {/* 인삿말 - cafe-show 스타일 */}
        <div className="text-[23px] leading-[1.4] tracking-[-0.46px] mb-4">
          <p className="mb-0">{t('chat.greeting.line1')}</p>
          <p className="mb-0">
            <span className="font-bold text-[#002D98] whitespace-pre-line">{t('chat.greeting.highlight')}</span>
            {t('chat.greeting.line2')}
          </p>
        </div>

        {/* 예시 질문 안내 */}
        <div className="text-[16px] leading-[1.4] text-[#666666] mb-6">
          <p className="mb-2">다음과 같은 질문을 할 수 있습니다.</p>
          <ul className="list-disc pl-5 mb-3">
            <li className="mb-1">전시회 일정이 어떻게 되나요?</li>
            <li className="mb-1">부스 설치 관련 규정은 무엇인가요?</li>
            <li className="mb-1">참가 서류 제출 기한이 궁금해요.</li>
          </ul>
          <p className="text-black">무엇을 도와드릴까요?</p>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-4 flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
          >
            {msg.isUser ? (
              // User 메시지: 흰색 박스 + 테두리 (cafe-show 스타일)
              <div className="bg-white border-2 border-[#dddddd] rounded-2xl px-4 py-3 max-w-[70%] shadow-sm">
                <p className="text-[15px] leading-[1.5] text-black whitespace-pre-wrap break-words">
                  {msg.message}
                </p>
              </div>
            ) : (
              // Agent 메시지: 배경 없음, 전체 너비 (cafe-show 스타일)
              <div className="w-full">
                <div className="text-[15px] leading-[1.5]" style={{ wordBreak: 'break-word' }}>
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      h1: ({ children }) => <h1 className="text-xl font-bold mb-3">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                      ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#da203d] underline hover:opacity-80"
                        >
                          {children}
                        </a>
                      ),
                      img: ({ src, alt }) => (
                        <img
                          src={src}
                          alt={alt || ''}
                          className="max-w-full h-auto rounded-lg my-2"
                          loading="lazy"
                        />
                      ),
                      code: ({ children }) => (
                        <code className="bg-[#f5f5f5] px-1.5 py-0.5 rounded text-[14px]">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-[#f5f5f5] p-3 rounded-lg overflow-x-auto mb-2 text-[14px]">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {msg.message}
                  </ReactMarkdown>
                  {!msg.isFinal && <span className="opacity-50"> ...</span>}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area - fixed footer */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto px-5 pt-2 bg-white z-50"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}
      >
        {/* Text input with dynamic button */}
        <div className="h-12 flex items-center bg-[#feffff] border border-[#dddddd] rounded-full pl-4 pr-2 gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleDynamicButton()}
            placeholder={isLoading ? '응답 대기 중...' : t('chat.placeholder')}
            className="flex-1 min-w-0 bg-transparent outline-none text-base placeholder:text-[#bcbcbc]"
          />

          {/* Dynamic Button: Send if text exists, Avatar mode if empty */}
          <button
            onClick={handleDynamicButton}
            disabled={isLoading}
            className="w-9 h-9 flex-shrink-0 disabled:opacity-50"
          >
            <img
              src={inputText.trim() ? iconSendMessage : iconToAvatar}
              alt=""
              className="w-full h-full"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom hook to safely access LiveKit context only in LiveKit mode
 */
function useLiveKitContext(mode: ChatMode) {
  // In ADK mode, we don't have LiveKit context
  if (mode === 'adk') {
    return null;
  }

  // In LiveKit mode, use the hooks
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { localParticipant } = useLocalParticipant();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const room = useRoomContext();

  return { localParticipant, room };
}
