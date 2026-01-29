import { TokenRequest, TokenResponse, ClientMetadata } from './types';

/**
 * Generate LiveKit access token from token server
 */
export async function generateToken(
  roomName: string,
  identity: string,
  metadata?: ClientMetadata
): Promise<string> {
  const defaultMetadata: ClientMetadata = {
    language: 'ko',
  };

  const request: TokenRequest = {
    room: roomName,
    identity: identity,
    livekitUrl: import.meta.env.VITE_LIVEKIT_URL || '',
    metadata: metadata || defaultMetadata
  };

  const response = await fetch('/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`Token generation failed: ${response.statusText}`);
  }

  const data: TokenResponse = await response.json();
  return data.token;
}

/**
 * Generate unique room ID (8-char UUID)
 */
export function generateRoomId(): string {
  return crypto.randomUUID().substring(0, 8);
}

/**
 * Generate unique user ID
 */
export function generateUserId(): string {
  return `user-${crypto.randomUUID().substring(0, 12)}`;
}

/**
 * Get or create participant identity from localStorage
 */
export function getOrCreateParticipantIdentity(): string {
  const key = 'avatar-participant-identity';
  const saved = localStorage.getItem(key);

  if (saved) {
    return saved;
  }

  const newIdentity = generateUserId();
  localStorage.setItem(key, newIdentity);
  return newIdentity;
}
