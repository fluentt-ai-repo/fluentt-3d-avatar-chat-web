import { SESSION_API_URL, SESSION_API_KEY, ADK_APP_NAME } from '@/lib/config';
import { ChatMessage } from '@/lib/types';

/**
 * Session API conversation message format
 * role: "user" | "model"
 */
interface ConversationMessage {
  role: 'user' | 'model';
  text: string;
}

interface SessionResponse {
  session_id: string;
  user_id: string;
  app_name: string;
  created_at: string;
  updated_at: string | null;
  events_count: number;
}

interface BatchEventResponse {
  session_id: string;
  events_count: number;
  invocation_ids: string[];
  injected_at: string;
}

class SessionAPIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SessionAPIError';
    this.status = status;
  }
}

/**
 * Session API Client
 *
 * Handles communication with the Session API server for syncing
 * avatar conversations with ADK sessions.
 *
 * API Docs: SESSION_API.md
 */
class SessionAPIClient {
  private baseURL: string;
  private apiKey: string;

  constructor(baseURL?: string, apiKey?: string) {
    this.baseURL = baseURL || SESSION_API_URL;
    this.apiKey = apiKey || SESSION_API_KEY;
  }

  private get headers(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Check if Session API is configured
   */
  isConfigured(): boolean {
    return Boolean(this.baseURL);
  }

  /**
   * Create a new session
   * POST /
   */
  async createSession(userId: string, sessionId: string): Promise<SessionResponse> {
    if (!this.isConfigured()) {
      throw new SessionAPIError('Session API URL not configured', 0);
    }

    console.log('[SessionAPI] Creating session:', { userId, sessionId });

    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        user_id: userId,
        session_id: sessionId,
        app_name: ADK_APP_NAME,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new SessionAPIError(
        `Failed to create session: ${response.status} - ${errorText}`,
        response.status
      );
    }

    const data = await response.json();
    console.log('[SessionAPI] Session created:', data);
    return data;
  }

  /**
   * Inject batch events (POST /{session_id}/events/batch)
   * Automatically creates session if it doesn't exist (404 handling)
   */
  async injectBatchEvents(
    sessionId: string,
    userId: string,
    messages: ChatMessage[]
  ): Promise<BatchEventResponse | null> {
    if (!this.isConfigured()) {
      console.warn('[SessionAPI] Session API URL not configured, skipping batch update');
      return null;
    }

    // Convert ChatMessage[] to ConversationMessage[]
    const conversations = this.toConversationMessages(messages);

    if (conversations.length === 0) {
      console.log('[SessionAPI] No messages to sync');
      return null;
    }

    console.log('[SessionAPI] Injecting batch events:', {
      sessionId,
      userId,
      messageCount: conversations.length,
    });

    try {
      // First attempt
      return await this.postBatch(sessionId, userId, conversations);
    } catch (error) {
      if (error instanceof SessionAPIError && error.status === 404) {
        // Session doesn't exist - create it and retry
        console.log('[SessionAPI] Session not found, creating...');
        await this.createSession(userId, sessionId);
        return await this.postBatch(sessionId, userId, conversations);
      }
      throw error;
    }
  }

  /**
   * Internal: POST to batch endpoint
   */
  private async postBatch(
    sessionId: string,
    userId: string,
    conversations: ConversationMessage[]
  ): Promise<BatchEventResponse> {
    const url = `${this.baseURL}/${sessionId}/events/batch`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        user_id: userId,
        conversations,
        app_name: ADK_APP_NAME,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new SessionAPIError(
        `Failed to inject batch events: ${response.status} - ${errorText}`,
        response.status
      );
    }

    const data = await response.json();
    console.log('[SessionAPI] Batch events injected:', data);
    return data;
  }

  /**
   * Convert ChatMessage[] to ConversationMessage[]
   * - Only includes final messages (isFinal === true)
   * - Only includes non-empty messages
   */
  private toConversationMessages(messages: ChatMessage[]): ConversationMessage[] {
    return messages
      .filter((m) => m.isFinal !== false && m.message.trim())
      .map((m) => ({
        role: m.isUser ? 'user' : 'model',
        text: m.message,
      }));
  }
}

// Singleton instance
export const sessionAPIClient = new SessionAPIClient();
