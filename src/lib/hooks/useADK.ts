import { useState, useCallback } from 'react';
import { ADK_URL, ADK_APP_NAME, ADK_USER_ID } from '@/lib/config';
import { useSessionStore } from '@/lib/store/session-store';
import { useSessionIdStore } from '@/lib/store/session-id-store';
import { ChatMessage } from '@/lib/types';

interface UseADKReturn {
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  sessionId: string;
}

/**
 * useADK - Hook for ADK (Agent Development Kit) API communication
 *
 * ADK API Format:
 * - Endpoint: /run_sse (streaming) or /run (sync)
 * - Request: { appName, userId, sessionId, newMessage: { role: "user", parts: [{ text }] } }
 * - Response (SSE): data: { content: { role: "model", parts: [{ text }] }, partial: boolean }
 *
 * Session Management:
 * - sessionId is shared via useSessionIdStore (for ADK + Session API synchronization)
 * - Same sessionId maintains conversation context across messages
 */
export function useADK(): UseADKReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addMessage, updateMessage } = useSessionStore();

  // Use shared session ID from store (for ADK + Session API synchronization)
  // isSessionCreated persists across component remounts
  const { sessionId, isSessionCreated, setSessionCreated } = useSessionIdStore();

  /**
   * Create ADK session (required before first message)
   * POST /apps/{appName}/users/{userId}/sessions/{sessionId}
   */
  const createSession = useCallback(async () => {
    // Check store state (persists across remounts)
    if (isSessionCreated) return true;

    const sessionUrl = `${ADK_URL}/apps/${ADK_APP_NAME}/users/${ADK_USER_ID}/sessions/${sessionId}`;
    console.log('[useADK] Creating session:', sessionUrl);

    try {
      const response = await fetch(sessionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Session creation failed: ${response.status}`);
      }

      setSessionCreated(true);
      console.log('[useADK] Session created successfully');
      return true;
    } catch (e) {
      console.error('[useADK] Session creation error:', e);
      return false;
    }
  }, [sessionId, isSessionCreated, setSessionCreated]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);

    // Add user message to store
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      message: text,
      isUser: true,
      timestamp: Date.now(),
      sender: 'You',
      isFinal: true,
    };
    addMessage(userMessage);

    // Create agent message placeholder
    const agentMessageId = `agent_${Date.now()}`;
    const agentMessage: ChatMessage = {
      id: agentMessageId,
      message: '',
      isUser: false,
      timestamp: Date.now(),
      sender: 'Agent',
      isFinal: false,
    };
    addMessage(agentMessage);

    try {
      // Ensure session exists before sending message
      const sessionReady = await createSession();
      if (!sessionReady) {
        throw new Error('Failed to create session');
      }

      // ADK API request format
      const requestBody = {
        appName: ADK_APP_NAME,
        userId: ADK_USER_ID,
        sessionId: sessionId,
        newMessage: {
          role: 'user',
          parts: [{ text }],
        },
        streaming: true, // Enable token-level streaming for real-time response
      };

      console.log('[useADK] Sending request:', {
        url: `${ADK_URL}/run_sse`,
        sessionId: sessionId,
        text,
      });

      const response = await fetch(`${ADK_URL}/run_sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle SSE streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // ADK SSE response format: { content: { role, parts }, partial }
              if (data.content?.parts?.[0]?.text) {
                // partial: true → delta (accumulate), partial: false → full text
                if (data.partial) {
                  fullText += data.content.parts[0].text;  // Accumulate deltas
                } else {
                  fullText = data.content.parts[0].text;   // Final full text
                }

                updateMessage(agentMessageId, {
                  message: fullText,
                  isFinal: !data.partial,
                });
              }
            } catch (parseError) {
              // JSON parse error - log for debugging
              console.warn('[useADK] Parse error:', line, parseError);
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.slice(6));
          if (data.content?.parts?.[0]?.text) {
            fullText = data.content.parts[0].text;
          }
        } catch {
          // Ignore incomplete data
        }
      }

      // Ensure final state
      updateMessage(agentMessageId, {
        message: fullText || 'No response',
        isFinal: true,
      });

      console.log('[useADK] Response complete:', fullText.slice(0, 100) + '...');

    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      setError(errorMsg);
      console.error('[useADK] Error:', e);

      // Update agent message with error
      updateMessage(agentMessageId, {
        message: `Error: ${errorMsg}`,
        isFinal: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, addMessage, updateMessage, createSession]);

  return { sendMessage, isLoading, error, sessionId: sessionId };
}
