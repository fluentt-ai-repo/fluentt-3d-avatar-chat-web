import { useEffect } from 'react';

/**
 * Browser audio policy bypass hook
 * Creates and resumes AudioContext on user interaction
 * Required for agent audio playback to work properly
 *
 * Key: await resume() to ensure audio is fully ready before animation starts
 */
export const useAudioContext = () => {
  useEffect(() => {
    const events = ['click', 'touchstart', 'keydown'];

    const handleInteraction = async () => {
      try {
        const AudioContextClass = window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        const testContext = new AudioContextClass();
        if (testContext.state === 'suspended') {
          await testContext.resume();  // Wait for audio to be fully ready
        }
        testContext.close();  // Cleanup to prevent memory leak
      } catch (error) {
        console.warn('[useAudioContext] Failed to resume audio:', error);
      }
      events.forEach(e => document.removeEventListener(e, handleInteraction, { capture: true }));
    };

    events.forEach(e => document.addEventListener(e, handleInteraction, { once: true, passive: true, capture: true }));

    return () => {
      events.forEach(e => document.removeEventListener(e, handleInteraction, { capture: true }));
    };
  }, []);
};
