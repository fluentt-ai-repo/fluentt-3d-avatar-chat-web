import { useState, useCallback } from 'react';
import { generateToken, generateRoomId, getOrCreateParticipantIdentity } from '../livekit';
import { ClientMetadata } from '../types';

/**
 * LiveKit room connection hook
 * Handles token generation and connection state
 */
export function useLiveKit() {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [identity, setIdentity] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');

  const connect = useCallback(async (language: string = 'ko', customMetadata?: Partial<ClientMetadata>) => {
    setIsConnecting(true);
    setError('');

    try {
      const roomPrefix = import.meta.env.VITE_ROOM_PREFIX || 'avatar';
      const room = `${roomPrefix}-${generateRoomId()}`;
      const userId = getOrCreateParticipantIdentity();
      const livekitUrl = import.meta.env.VITE_LIVEKIT_URL || '';

      const metadata: ClientMetadata = {
        language,
        ...customMetadata
      };

      const generatedToken = await generateToken(room, userId, metadata);

      setToken(generatedToken);
      setServerUrl(livekitUrl);
      setRoomName(room);
      setIdentity(userId);

      console.log('[LiveKit] Connected to room:', room);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMsg);
      console.error('[LiveKit] Connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setToken('');
    setServerUrl('');
    setRoomName('');
    setIdentity('');
    setError('');
  }, []);

  return {
    token,
    serverUrl,
    roomName,
    identity,
    isConnecting,
    error,
    connect,
    reset,
  };
}
