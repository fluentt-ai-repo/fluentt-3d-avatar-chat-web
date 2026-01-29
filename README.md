# fluentt-3d-avatar-chat-web

React + LiveKit + Unity WebGL 3D avatar chat boilerplate template.

## Features

- Real-time voice communication via LiveKit
- 3D avatar with 52 ARKit blendshape lip-sync
- Text chat + Avatar voice chat modes
- **Markdown rendering** for agent messages (bold, italic, lists, links, code)
- Mobile-optimized (430px max-width)
- i18n ready (ko/en)

## Quick Start

```bash
# 1. Clone this repository
git clone https://github.com/your-org/fluentt-3d-avatar-chat-web.git

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your LiveKit credentials

# 4. Start development server
npm run dev
```

## Prerequisites

- Node.js 18+
- LiveKit Cloud account (or self-hosted server)
- Unity WebGL build with ReactBridge

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_LIVEKIT_URL` | LiveKit server WebSocket URL | Yes |
| `LIVEKIT_API_KEY` | LiveKit API key (server-side) | Yes |
| `LIVEKIT_API_SECRET` | LiveKit API secret (server-side) | Yes |
| `VITE_ROOM_PREFIX` | Room name prefix (default: "avatar") | No |
| `VITE_UNITY_BUILD_NAME` | Unity build name (default: "avatar") | No |

## Unity WebGL Integration

1. Set `VITE_UNITY_BUILD_NAME` in `.env` (e.g., `eric`)
2. Build Unity with matching Product Name
3. Copy Build/ folder to `public/unity/{name}/Build/`

```
public/unity/eric/Build/
├── eric.loader.js
├── eric.framework.js
├── eric.data
└── eric.wasm
```

4. Unity scripts required:
   - `ReactBridge.cs` - Receives messages from React
   - `NoServerDataProcessor.cs` - Processes animation frames

## Project Structure

```
fluentt-3d-avatar-chat-web/
├── .claude/skills/           # AI assistant skills
├── api/token.ts              # Vercel Serverless token endpoint
├── public/unity/{name}/Build/ # Unity WebGL build files
├── src/
│   ├── assets/               # SVG icons
│   ├── components/           # Shared UI components
│   ├── lib/
│   │   ├── hooks/            # useLiveKit, useAnimationData, etc.
│   │   ├── store/            # Zustand stores
│   │   ├── i18n/             # Translations
│   │   └── types/            # TypeScript types
│   └── pages/                # SessionManager, AvatarView, ChatView
├── package.json
├── vite.config.ts            # Vite + token plugin for local dev
└── vercel.json               # Vercel deployment config
```

## Development

```bash
# Local development (uses Vite token plugin)
npm run dev

# With Vercel functions (requires vercel CLI)
vercel dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

### Vercel (Recommended)

1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Manual

1. Build: `npm run build`
2. Deploy `dist/` folder and `api/` functions

## Customization

### Add Routes

Edit `src/App.tsx` to add react-router-dom if needed.

### Add Translations

Edit `src/lib/i18n/ko.json` and `en.json`.

### Style Changes

Edit `src/index.css` for global styles.

### Add Stores

Create new files in `src/lib/store/`.

## Agent Server

This template expects a Python agent server connecting to the same LiveKit room.

The agent should:
- Send 208-byte animation frames via DataChannel
- Send `agent_state_changed` RPC with `new_state` field
- Handle `start_conversation`, `interrupt_agent`, `send_text_input` RPCs
- Publish `lk.transcription` TextStream for STT

See [voice-agents](https://github.com/your-org/voice-agents) for reference.

## License

MIT
