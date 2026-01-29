import { Track } from 'livekit-client';
import { useEffect, useState } from 'react';

/**
 * Microphone volume detection hook
 * Returns normalized volume (0-1) for UI visualization
 */
export const useTrackVolume = (track?: Track) => {
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    if (!track || !track.mediaStream) {
      return;
    }

    const ctx = new AudioContext();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const source = ctx.createMediaStreamSource(track.mediaStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 32;
    analyser.smoothingTimeConstant = 0;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const a = dataArray[i];
        sum += a * a;
      }
      setVolume(Math.sqrt(sum / dataArray.length) / 255);
    };

    const interval = setInterval(updateVolume, 1000 / 30); // 30 FPS

    return () => {
      source.disconnect();
      clearInterval(interval);
      ctx.close().catch(() => {});
    };
  }, [track, track?.mediaStream]);

  return volume;
};
