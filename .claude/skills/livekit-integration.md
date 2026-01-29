# LiveKit Integration

## Token Generation

```typescript
// POST /api/token
{
  room: string;      // Room name (e.g., "avatar-a1b2c3d4")
  identity: string;  // User ID (e.g., "user-xyz123")
  metadata: {        // Optional metadata for agent
    language: string;
    faqs?: { question: string; answer: string }[];
  }
}
```

## RPC Handler Registration (Duplicate Prevention)

```typescript
const rpcHandlerRegistered = useRef(false);

useEffect(() => {
  if (!localParticipant || rpcHandlerRegistered.current) return;

  const handleRpc = async (data: { payload: string }) => {
    const payload = JSON.parse(data.payload);
    // Handle payload...
    return '';  // RPC response
  };

  localParticipant.registerRpcMethod('agent_state_changed', handleRpc);
  rpcHandlerRegistered.current = true;
}, [localParticipant]);
```

## RPC Call with Retry

```typescript
const performRpc = async (method: string, payload: object) => {
  const agentParticipant = Array.from(room.remoteParticipants.values())
    .find(p => p.identity.startsWith('agent'));

  if (!agentParticipant) return;

  const maxRetries = 10;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await localParticipant.performRpc({
        destinationIdentity: agentParticipant.identity,
        method,
        payload: JSON.stringify(payload),
      });
      return;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
};
```

## TextStream Handler (Transcription)

```typescript
room.registerTextStreamHandler('lk.transcription', async (reader, participantIdentity) => {
  const isTranscription = reader.info?.attributes?.['lk.transcribed_track_id'];
  const isFinal = reader.info?.attributes?.['lk.transcription_final'] === 'true';
  const segmentId = reader.info?.attributes?.['lk.segment_id'];

  if (!isTranscription) return;

  let fullText = '';
  for await (const chunk of reader) {
    fullText += chunk;
    // Update UI with streaming text...
  }
});
```

## Audio Context (Browser Policy Bypass)

```typescript
// Required for agent audio playback
useEffect(() => {
  const events = ['click', 'touchstart', 'keydown'];
  const handleInteraction = () => {
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    events.forEach(e => document.removeEventListener(e, handleInteraction));
  };
  events.forEach(e => document.addEventListener(e, handleInteraction));
}, []);
```

## Environment Variables

```env
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
VITE_ROOM_PREFIX=avatar
LIVEKIT_API_KEY=xxx
LIVEKIT_API_SECRET=xxx
```
