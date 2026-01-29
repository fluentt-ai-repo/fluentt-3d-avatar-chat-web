import { create } from 'zustand';

/**
 * Generate a unique session ID
 * Format: session_{timestamp}_{random}
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface SessionIdStore {
  // Session ID for ADK and Session API synchronization
  sessionId: string;

  // Whether ADK session has been created on the server
  // Persists across component remounts to prevent duplicate session creation
  isSessionCreated: boolean;

  // Index of the last message that was batch synced to Session API
  // Used to prevent duplicate batch updates
  lastBatchSyncedIndex: number;

  // Actions
  setSessionCreated: (created: boolean) => void;
  setLastBatchSyncedIndex: (index: number) => void;
  resetSession: () => void;
}

export const useSessionIdStore = create<SessionIdStore>((set) => ({
  // Generate session ID on store creation
  sessionId: generateSessionId(),

  isSessionCreated: false,

  lastBatchSyncedIndex: 0,

  setSessionCreated: (created) => set({ isSessionCreated: created }),

  setLastBatchSyncedIndex: (index) => set({ lastBatchSyncedIndex: index }),

  resetSession: () => set({
    sessionId: generateSessionId(),
    isSessionCreated: false,
    lastBatchSyncedIndex: 0,
  }),
}));
