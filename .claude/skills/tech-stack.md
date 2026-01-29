# Tech Stack Reference

## Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS v4 |
| State | Zustand 5 |
| Real-time | LiveKit (WebRTC) |
| 3D Avatar | Unity WebGL + react-unity-webgl |
| Deploy | Vercel |

## Directory Structure

```
src/
├── assets/          # SVG icons (Vite static import)
├── components/      # Shared UI components
├── lib/
│   ├── hooks/       # Custom React hooks
│   ├── store/       # Zustand stores
│   ├── i18n/        # Translations (ko.json, en.json)
│   ├── types/       # TypeScript types
│   └── livekit.ts   # Token utilities
├── pages/           # Page components
├── App.tsx          # Root with LiveKitRoom
└── main.tsx         # Entry point
```

## Zustand Store Pattern

```typescript
import { create } from 'zustand';

interface SessionStore {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  messages: [],
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map(m => m.id === id ? { ...m, ...updates } : m)
  })),
}));

// Access outside React (for closures)
const currentMessages = useSessionStore.getState().messages;
```

## z-index Layers (AvatarView)

```
z-90: Buttons (always clickable)
z-70: Footer controls
z-60: Volume gradient overlay
z-50: Gradient fade (Unity → footer)
z-45: Unity canvas
```

## Safe Area Handling

```tsx
<div style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
```

## Text Scaling (Accessibility)

```css
:root { --font-scale: 1; }
[data-font-size="large"] { --font-scale: 1.2; }
[data-font-size="xlarge"] { --font-scale: 1.4; }

.text-scale-16 { font-size: calc(16px * var(--font-scale, 1)); }
```

## Vite Path Alias

```typescript
// vite.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}

// tsconfig.json
"paths": { "@/*": ["./src/*"] }
```

## Vite Token Plugin (Local Dev)

```typescript
// vite.config.ts
function livekitTokenPlugin(): Plugin {
  return {
    name: 'livekit-token-dev',
    configureServer(server) {
      server.middlewares.use('/api/token', async (req, res, next) => {
        // Generate JWT token for local development
      });
    },
  };
}
```

## Mobile Layout

```tsx
<div className="w-full max-w-[480px] mx-auto h-screen max-h-[980px]">
```
