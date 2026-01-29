# Unity WebGL Communication

## Unity Context Setup

```typescript
import { useUnityContext } from 'react-unity-webgl';

const unityContext = useUnityContext({
  loaderUrl: '/unity/Build/app.loader.js',
  dataUrl: '/unity/Build/app.data',
  frameworkUrl: '/unity/Build/app.framework.js',
  codeUrl: '/unity/Build/app.wasm',
});

const { unityProvider, isLoaded, sendMessage } = unityContext;
```

## Animation Data Format

Agent sends 208 bytes via DataChannel:
- 52 floats × 4 bytes = 208 bytes (Little Endian)
- 52 ARKit blendshape values (0.0 - 1.0)

React converts to CSV string for sendMessage:
```typescript
if (latestFrame.length === 208) {
  const frameString = Array.from(latestFrame).join(',');
  sendMessage('ReactBridge', 'OnAnimationData', frameString);
}
```

## Control Signals

| Signal | Handling | Purpose |
|--------|----------|---------|
| `final` | Queue (order preserved) | Agent finished speaking, flush buffer |
| `interrupted` | Immediate (bypass queue) | User interrupted, clear buffer now |

```typescript
// Final signal (via queue)
if (message === 'final') {
  frameQueue.current.push(payload);
}

// Interrupt signal (immediate)
if (message === 'interrupted') {
  frameQueue.current = [];
  setInterruptSignal(Date.now());
}
```

## Agent State Message

```typescript
const message = JSON.stringify({
  action: 'setAgentState',
  state: agentState  // 'listening' | 'thinking' | 'speaking'
});
sendMessage('ReactBridge', 'OnReactMessage', message);
```

## Unity ReactBridge.cs

```csharp
public class ReactBridge : MonoBehaviour
{
    private NoServerDataProcessor _processor;

    public void OnAnimationData(string frameData)
    {
        if (frameData == "final") {
            _processor?.OnFinalSignal();
        }
        else if (frameData == "interrupted") {
            _processor?.OnInterruptSignal();
        }
        else {
            // Parse 208 CSV bytes -> 52 floats
            var values = frameData.Split(',');
            if (values.Length != 208) return;

            var floats = new float[52];
            byte[] bytes = new byte[4];
            for (int i = 0; i < 52; i++) {
                bytes[0] = (byte)int.Parse(values[i * 4 + 0]);
                bytes[1] = (byte)int.Parse(values[i * 4 + 1]);
                bytes[2] = (byte)int.Parse(values[i * 4 + 2]);
                bytes[3] = (byte)int.Parse(values[i * 4 + 3]);
                floats[i] = BitConverter.ToSingle(bytes, 0);
            }
            _processor?.ProcessFrame(floats);
        }
    }

    public void OnReactMessage(string jsonMessage)
    {
        var message = JsonUtility.FromJson<ReactMessage>(jsonMessage);
        // Handle action...
    }
}
```

## Frame Queue (Downsampling)

60fps from Agent → 20fps to Unity (3:1 ratio):

```typescript
// Receive: only queue every 3rd frame
if (totalFramesReceived.current % 3 === 0) {
  frameQueue.current.push(payload);
}

// Dequeue at 60fps interval (16.67ms)
setInterval(() => {
  if (frameQueue.current.length > 0) {
    const frame = frameQueue.current.shift()!;
    setLatestFrame(frame);
  }
}, 16.67);
```
