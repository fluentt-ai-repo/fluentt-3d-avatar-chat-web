import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import ReactMarkdown from 'react-markdown';
import { useSessionStore } from '@/lib/store/session-store';
import { useADK } from '@/lib/hooks';
import { useTranslation } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { FAQChips } from '@/components/FAQChips';
import { LanguageDropdown } from '@/components/LanguageDropdown';
import { ToolPopup } from '@/components/ToolPopup';
import { TagChip } from '@/components/TagChip';
import { FAQ_ITEMS, DEFAULT_LANGUAGE, TOOL_OPTIONS, type FAQItem } from '@/lib/config';
import buttonSend from '@/assets/button-send.png';
import buttonToAvatar from '@/assets/button-to-avatar.png';
import buttonMenu from '@/assets/button-menu.png';
import agentEllipse from '@/assets/agent-ellipse.png';

type ChatMode = 'adk' | 'livekit';

interface ChatViewProps {
  mode: ChatMode;
  onBack: () => void;
  onSwitchToAvatar: () => void;
}

interface ChatContentProps {
  onBack: () => void;
  onSwitchToAvatar: () => void;
  sendMessage: (text: string, toolPrefix?: string) => Promise<void>;
  isLoading: boolean;
}

// Threshold for detecting user scroll up (in pixels)
const SCROLL_THRESHOLD = 50;

// Textarea auto-resize constants
const TEXTAREA_LINE_HEIGHT = 22; // text-[16px] * 1.4 line-height
const TEXTAREA_MAX_ROWS = 6;
const TEXTAREA_MAX_HEIGHT = TEXTAREA_LINE_HEIGHT * TEXTAREA_MAX_ROWS; // 132px

interface Message {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: number;
  sender?: string;
  isFinal?: boolean;
}

/**
 * ChatMessageItem - Memoized message component for render optimization
 */
const ChatMessageItem = memo(function ChatMessageItem({ msg }: { msg: Message }) {
  if (msg.isUser) {
    return (
      <div
        className="bg-[#03c3ff] rounded-[10px] px-4 py-3 max-w-[80%]"
        style={{
          backdropFilter: 'blur(17.5px)',
          WebkitBackdropFilter: 'blur(17.5px)',
        }}
      >
        <p className="text-[15px] leading-[1.4] tracking-[-0.3px] text-white whitespace-pre-wrap break-words">
          {msg.message}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-[15px] leading-[1.6] text-[#333]" style={{ wordBreak: 'break-word' }}>
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            h1: ({ children }) => <h1 className="text-xl font-bold mb-3">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-2">{children}</ol>,
            li: ({ children }) => <li>{children}</li>,
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00A0E9] underline hover:opacity-80"
              >
                {children}
              </a>
            ),
            img: ({ src, alt }) => (
              <img
                src={src}
                alt={alt || ''}
                className="max-w-full h-auto rounded-[10px] my-3"
                loading="lazy"
              />
            ),
            code: ({ children }) => (
              <code className="bg-[#f5f5f5] px-1.5 py-0.5 rounded text-[14px]">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="bg-[#f5f5f5] p-3 rounded-lg overflow-x-auto mb-3 text-[14px]">
                {children}
              </pre>
            ),
          }}
        >
          {msg.message}
        </ReactMarkdown>
        {!msg.isFinal && <span className="opacity-50"> …</span>}
      </div>
    </div>
  );
});

/**
 * ChatContent - Shared UI component for both modes
 */
function ChatContent({ onBack, onSwitchToAvatar, sendMessage, isLoading }: ChatContentProps) {
  const { t } = useTranslation();
  const messages = useSessionStore((state) => state.messages);

  const [inputText, setInputText] = useState('');
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE);
  const [isToolOpen, setIsToolOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState(TOOL_OPTIONS[0]?.id || 'search');
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Determine if chat has started (has messages)
  const hasStartedChat = messages.length > 0;

  // Scroll event handler - detect user scroll up
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check if user is at the bottom (within threshold)
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < SCROLL_THRESHOLD;
    if (!isAtBottom) {
      setIsAutoScrollEnabled(false);
    }
  }, []);

  // Register scroll event listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Auto-scroll to bottom when messages change (including streaming)
  useEffect(() => {
    if (messages.length > 0 && isAutoScrollEnabled) {
      const container = scrollContainerRef.current;
      if (container) {
        // Use scrollTop directly for reliable scrolling during streaming
        // smooth scrollIntoView can be ignored when animation is in progress
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages, isAutoScrollEnabled]);

  // Refocus textarea when loading completes
  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to measure scrollHeight accurately
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Adjust textarea height when inputText changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText, adjustTextareaHeight]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const trimmedText = text.trim();
    setInputText('');
    setIsAutoScrollEnabled(true); // Re-enable auto-scroll when user sends message
    textareaRef.current?.focus();

    // Get prefix from selected tool (for ADK Agent routing)
    const selectedToolOption = TOOL_OPTIONS.find(t => t.id === selectedTool);
    const prefix = selectedToolOption?.prefix || '';

    await sendMessage(trimmedText, prefix);
  }, [sendMessage, selectedTool]);

  const handleFAQSelect = useCallback((item: FAQItem) => {
    handleSendMessage(item.text);
  }, [handleSendMessage]);

  const handleDynamicButton = useCallback(() => {
    if (inputText.trim()) {
      handleSendMessage(inputText);
    } else {
      onSwitchToAvatar();
    }
  }, [inputText, handleSendMessage, onSwitchToAvatar]);

  return (
    <div className="bg-white relative w-full max-w-[430px] mx-auto h-full flex flex-col overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, white 95%, #00a0e9 5%)' }}>
      {/* Header - Absolute positioning within container */}
      <div
        className="absolute top-0 left-0 right-0 w-full max-w-[430px] mx-auto z-[200]"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', backgroundColor: 'color-mix(in srgb, white 95%, #00a0e9 5%)' }}
      >
        <Header
          onBack={onBack}
          onLanguageClick={() => setIsLanguageOpen(!isLanguageOpen)}
        />
        {/* Language Dropdown */}
        <div className="absolute top-full right-5">
          <LanguageDropdown
            isOpen={isLanguageOpen}
            selected={selectedLanguage}
            onSelect={setSelectedLanguage}
            onClose={() => setIsLanguageOpen(false)}
          />
        </div>
      </div>

      {/* Content area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
        style={{
          marginTop: 'max(56px, calc(56px + env(safe-area-inset-top, 0px)))',
          marginBottom: 'max(100px, calc(100px + env(safe-area-inset-bottom, 0px)))',
        }}
      >
        {!hasStartedChat ? (
          /* Greeting Screen */
          <div className="flex flex-col items-center">
            {/* agent-profile: padding [70,0,0,0], gap 10, center */}
            <div className="flex flex-col items-center justify-center gap-[10px] pt-[70px] w-full">
              {/* agent-ellipse: 72x72 */}
              <img src={agentEllipse} alt="" className="w-[72px] h-[72px]" />
            </div>

            {/* Text container (tnYzB: padding [20,20,8,20], gap 8) */}
            <div className="w-full flex flex-col items-center px-5 pt-5 pb-2 gap-2">
              <h1 className="text-[20px] leading-[1.4] tracking-[-0.4px] text-center font-normal text-black">
                <span>{t('chat.greeting.line1')}</span>
                <br />
                <span className="font-bold">{t('chat.greeting.line2')}</span>
                <br />
                <span>{t('chat.greeting.line3')}</span>
              </h1>
            </div>

            {/* FAQ Chips (GY3Yw: padding [20,40], gap 8) */}
            <div className="w-full px-10 py-5">
              <FAQChips items={FAQ_ITEMS} onSelect={handleFAQSelect} />
            </div>
          </div>
        ) : (
          /* Chat Messages */
          <div className="px-5 pt-4 pb-8">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-4 flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <ChatMessageItem msg={msg} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chatbar - Absolute positioning within container */}
      <div
        className="absolute bottom-0 left-0 right-0 max-w-[430px] mx-auto z-50 bg-white rounded-t-[20px] chatbar-shadow"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}
      >
        <div className="flex flex-col gap-2 px-5 pt-[10px]">
          {/* Row 1: Input field (padding: [8, 4]) */}
          <div className="flex items-start px-1 py-2">
            <textarea
              ref={textareaRef}
              name="chat-message"
              autoComplete="off"
              rows={1}
              maxLength={1000}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                // Enter: send, Shift+Enter: new line
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !isLoading) {
                  e.preventDefault();
                  handleDynamicButton();
                }
              }}
              placeholder={isLoading ? '응답 대기 중…' : t('chat.placeholder')}
              className="flex-1 min-w-0 bg-transparent outline-none text-[16px] leading-[1.4] tracking-[-0.3px] placeholder:text-[#8b95a1] resize-none overflow-y-auto textarea-scrollbar"
              style={{ maxHeight: `${TEXTAREA_MAX_HEIGHT}px` }}
            />
          </div>

          {/* Row 2: Chat options (gap: 8, alignItems: center) */}
          <div className="flex items-center gap-2 w-full">
            {/* button-menu: padding 8, cornerRadius 999 */}
            <div className="relative">
              <button
                onClick={() => setIsToolOpen(!isToolOpen)}
                className="flex items-center justify-center rounded-full transition-colors hover:bg-[#e8f0f5]"
                aria-label={t('accessibility.menuButton')}
              >
                <img src={buttonMenu} alt="" className="w-10 h-10" />
              </button>
              {/* Tool Popup */}
              {isToolOpen && (
                <ToolPopup
                  options={TOOL_OPTIONS}
                  selected={selectedTool}
                  onSelect={(id) => setSelectedTool(id)}
                  onClose={() => setIsToolOpen(false)}
                />
              )}
            </div>

            {/* Tag Chip - show only when tool has showAsTag: true */}
            {(() => {
              const selectedToolOption = TOOL_OPTIONS.find(t => t.id === selectedTool);
              if (selectedToolOption?.showAsTag) {
                return (
                  <TagChip
                    label={selectedToolOption.tagLabel || selectedToolOption.name}
                    onRemove={() => setSelectedTool('search')}
                  />
                );
              }
              return null;
            })()}

            {/* Spacer (RPG5r) */}
            <div className="flex-1" />

            {/* button-to-avatar: 50x50, gradient, shadow */}
            <button
              onClick={handleDynamicButton}
              disabled={isLoading}
              className="flex-shrink-0 disabled:opacity-50"
              aria-label={inputText.trim() ? t('accessibility.sendMessage') : t('accessibility.switchToAvatar')}
            >
              {inputText.trim() ? (
                <img src={buttonSend} alt="" className="w-[50px] h-[50px]" />
              ) : (
                <img src={buttonToAvatar} alt="" className="w-[50px] h-[50px]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ADKChatContent - ADK mode specific wrapper
 * Unconditionally calls useADK hook
 */
function ADKChatContent({ onBack, onSwitchToAvatar }: Omit<ChatViewProps, 'mode'>) {
  const adk = useADK();

  const sendMessage = useCallback(async (text: string, toolPrefix?: string) => {
    await adk.sendMessage(text, toolPrefix);
  }, [adk]);

  return (
    <ChatContent
      onBack={onBack}
      onSwitchToAvatar={onSwitchToAvatar}
      sendMessage={sendMessage}
      isLoading={adk.isLoading}
    />
  );
}

/**
 * LiveKitChatContent - LiveKit mode specific wrapper
 * Unconditionally calls LiveKit hooks
 * Note: toolPrefix is ignored in LiveKit mode (ADK-only feature)
 */
function LiveKitChatContent({ onBack, onSwitchToAvatar }: Omit<ChatViewProps, 'mode'>) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const addMessage = useSessionStore((state) => state.addMessage);

  const sendMessage = useCallback(async (text: string, _toolPrefix?: string) => {
    addMessage({
      id: `user-${Date.now()}`,
      message: text,
      isUser: true,
      timestamp: Date.now(),
      sender: 'You',
      isFinal: true,
    });

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
  }, [localParticipant, room, addMessage]);

  return (
    <ChatContent
      onBack={onBack}
      onSwitchToAvatar={onSwitchToAvatar}
      sendMessage={sendMessage}
      isLoading={false}
    />
  );
}

/**
 * ChatView - Text chat interface
 *
 * Supports two modes:
 * - ADK mode: Uses useADK hook to communicate with ADK API
 * - LiveKit mode: Uses LiveKit RPC to communicate with agent
 *
 * Component is split to avoid Rules of Hooks violations
 */
export function ChatView({ mode, onBack, onSwitchToAvatar }: ChatViewProps) {
  // Conditional rendering instead of conditional hook calls
  if (mode === 'livekit') {
    return <LiveKitChatContent onBack={onBack} onSwitchToAvatar={onSwitchToAvatar} />;
  }

  return <ADKChatContent onBack={onBack} onSwitchToAvatar={onSwitchToAvatar} />;
}
