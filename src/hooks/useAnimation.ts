'use client';

import { useState, useCallback, useRef } from 'react';

export interface Keyframe {
  time: number;
  props: Partial<{ left: number; top: number; opacity: number; scaleX: number; scaleY: number; angle: number }>;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export function useAnimation() {
  const [animations, setAnimations] = useState<Map<string, Keyframe[]>>(new Map());
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number>(0);

  const setKeyframes = useCallback((objId: string, keyframes: Keyframe[]) => {
    setAnimations(prev => { const m = new Map(prev); m.set(objId, keyframes); return m; });
  }, []);

  const removeKeyframes = useCallback((objId: string) => {
    setAnimations(prev => { const m = new Map(prev); m.delete(objId); return m; });
  }, []);

  const play = useCallback((durationMs: number, tick: (progress: number) => void) => {
    if (isPlaying) return;
    setIsPlaying(true);
    const start = performance.now();
    const dur = durationMs / speed;
    const loop = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / dur, 1);
      tick(p);
      if (p < 1) { rafRef.current = requestAnimationFrame(loop); }
      else { setIsPlaying(false); }
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [isPlaying, speed]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
  }, []);

  return { animations, isPlaying, speed, setSpeed, setKeyframes, removeKeyframes, play, stop };
}
