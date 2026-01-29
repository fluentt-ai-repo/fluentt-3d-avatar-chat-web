# CLAUDE.md

Claude Code guide for fluentt-3d-avatar-chat-web boilerplate.

## Project Overview

React + LiveKit + Unity WebGL 3D avatar chat template with **dual-mode support**:
- **LiveKit mode**: Full LiveKit integration for both chat and avatar
- **ADK mode**: ADK API for chat, LiveKit for avatar only

### Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Real-time | LiveKit (WebRTC) |
| Chat API | ADK (Agent Development Kit) - optional |
| 3D Avatar | Unity WebGL + react-unity-webgl |
| Markdown | react-markdown (Agent 메시지 렌더링) |
| Deploy | Vercel |

## Architecture

### Dual-Mode Data Flow

```
// LiveKit Mode (VITE_CHAT_MODE=livekit)
App.tsx (screen state)
  └─ LiveKitProvider (connection)
       └─ LiveKitSessionHandler (RPC/Transcription handlers)
            ├─ ChatView (mode="livekit", uses RPC)
            └─ AvatarView (Unity WebGL)

// ADK Mode (VITE_CHAT_MODE=adk)
App.tsx (screen state)
  ├─ screen === 'chat'
  │    └─ ChatView (mode="adk", uses useADK hook)
  │
  └─ screen === 'avatar'
       └─ LiveKitProvider (connection)
            └─ LiveKitSessionHandler (handlers)
                 └─ AvatarView (Unity WebGL)
```

### Component Roles

| Component | Role |
|-----------|------|
| `LiveKitProvider` | LiveKit connection lifecycle (token, connect, disconnect) |
| `LiveKitSessionHandler` | RPC/Transcription handlers + audio playback |
| `App.tsx` | Screen switching (chat ↔ avatar) + mode routing |
| `ChatView` | Text chat UI (supports both ADK and LiveKit modes) + Markdown rendering |
| `AvatarView` | Unity WebGL integration + mic control |

### Markdown Rendering (ChatView)

Agent 메시지는 `react-markdown`으로 렌더링됩니다 (`isUser: false` 기준 자동 적용).

**지원 문법:**

| 문법 | 예시 | 스타일 |
|------|------|--------|
| Bold | `**텍스트**` | `font-bold` |
| Italic | `*텍스트*` | `italic` |
| Heading | `# H1`, `## H2`, `### H3` | 크기별 볼드 |
| List | `- 항목` / `1. 항목` | disc/decimal + 들여쓰기 |
| Link | `[링크](url)` | 파란색 밑줄, 새 탭 열기 |
| Code | `` `코드` `` | 회색 배경 인라인 |
| Code Block | ` ```코드``` ` | 회색 박스 블록 |

User 메시지는 plain text로 렌더링됩니다.

## Key Files

| File | Role |
|------|------|
| `src/lib/config.ts` | Environment variable helpers (mode detection) |
| `src/lib/providers/LiveKitProvider.tsx` | LiveKit connection wrapper |
| `src/lib/providers/LiveKitSessionHandler.tsx` | RPC/Transcription handlers |
| `src/lib/hooks/useLiveKit.ts` | LiveKit token generation |
| `src/lib/hooks/useADK.ts` | ADK API communication |
| `src/lib/hooks/useAnimationData.ts` | Animation frame processing (60→20fps) |
| `src/pages/ChatView.tsx` | Text chat UI (dual-mode) |
| `src/pages/AvatarView.tsx` | Unity integration + mic toggle |
| `api/token.ts` | Vercel Serverless token generation |

## RPC Methods

| Method | Direction | Purpose |
|--------|-----------|---------|
| `agent_state_changed` | Agent→React | State updates (listening/thinking/speaking) |
| `start_conversation` | React→Agent | Begin conversation |
| `interrupt_agent` | React→Agent | Stop speaking |
| `send_text_input` | React→Agent | Send text message |

## Animation Data Format

- **Agent sends**: 208 bytes = 52 floats (ARKit blendshapes)
- **React converts**: Uint8Array → CSV string
- **Unity receives**: CSV → byte[4] → float (Little Endian)
- **Control signals**: `"final"` (queue), `"interrupted"` (immediate)

## Stores

| Store | Purpose | File |
|-------|---------|------|
| `useSessionStore` | Chat messages (shared by ADK/LiveKit) | `src/lib/store/session-store.ts` |
| `useLanguageStore` | i18n language | `src/lib/store/language-store.ts` |

## Development

```bash
npm run dev     # Local dev with Vite token plugin
vercel dev      # Local dev with Vercel functions
npm run build   # Production build
```

## Environment Variables

```env
# Chat Mode Configuration
VITE_CHAT_MODE=livekit      # 'livekit' (default) or 'adk'

# ADK Configuration (only for VITE_CHAT_MODE=adk)
VITE_ADK_URL=http://localhost:9101

# LiveKit Configuration
VITE_LIVEKIT_URL=wss://xxx.livekit.cloud
VITE_ROOM_PREFIX=avatar

# Unity WebGL Build
VITE_UNITY_BUILD_NAME=eric

# Server-side (for token generation)
LIVEKIT_API_KEY=xxx
LIVEKIT_API_SECRET=xxx
```

Unity build path: `public/unity/{VITE_UNITY_BUILD_NAME}/Build/`

## Skills

See `.claude/skills/` for detailed documentation:
- `livekit-integration.md` - LiveKit patterns
- `unity-communication.md` - Unity WebGL patterns
- `tech-stack.md` - Project conventions

## Extending

### Add New Pages

1. Create component in `src/pages/`
2. Add screen type to `App.tsx`
3. Handle mode-specific logic if needed

### Add New Stores

1. Create in `src/lib/store/`
2. Export from store file
3. Use with `useXxxStore()` hook

### Add New Hooks

1. Create in `src/lib/hooks/`
2. Export from `src/lib/hooks/index.ts`

### Add New Providers

1. Create in `src/lib/providers/`
2. Export from `src/lib/providers/index.ts`

### Add Translations

Edit `src/lib/i18n/ko.json` and `en.json`.

## Common Tasks

### Connect to LiveKit (via Provider)

```tsx
// Wrap your component with LiveKitProvider
<LiveKitProvider>
  <LiveKitSessionHandler>
    <YourComponent />
  </LiveKitSessionHandler>
</LiveKitProvider>
```

### Send Message (ADK Mode)

```typescript
const { sendMessage, isLoading } = useADK();
await sendMessage('Hello');
```

### Send RPC to Agent (LiveKit Mode)

```typescript
await localParticipant.performRpc({
  destinationIdentity: agentParticipant.identity,
  method: 'send_text_input',
  payload: JSON.stringify({ text: 'Hello' }),
});
```

### Access Session Context

```typescript
// Inside LiveKitSessionHandler
const { agentState, avatarMessage, userVolume } = useLiveKitSession();
```

### Send to Unity

```typescript
// Animation frame
sendMessage('ReactBridge', 'OnAnimationData', frameString);

// State message
sendMessage('ReactBridge', 'OnReactMessage', JSON.stringify({
  action: 'setAgentState',
  state: 'speaking'
}));
```
