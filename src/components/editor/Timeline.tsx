'use client';

import React from 'react';
import type { Keyframe } from '@/hooks/useAnimation';

type KeyframeMap = Map<string, Keyframe[]>;

export default function Timeline({
  isPlaying, isPaused, speed, keyframes,
  onPlay, onPause, onStop, onSetSpeed,
}: {
  isPlaying: boolean;
  isPaused: boolean;
  speed: number;
  keyframes: KeyframeMap;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSetSpeed: (s: number) => void;
}) {
  const totalFrames = Array.from(keyframes.values()).reduce((a, k) => a + k.length, 0);
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs">
      <button onClick={onPlay} disabled={isPlaying && !isPaused} className="p-1.5 text-gray-600 hover:text-[#27A300] disabled:text-gray-300 transition-colors">&#9654;</button>
      <button onClick={onPause} disabled={!isPlaying || isPaused} className="p-1.5 text-gray-600 hover:text-[#27A300] disabled:text-gray-300 transition-colors">&#9646;&#9646;</button>
      <button onClick={onStop} className="p-1.5 text-gray-600 hover:text-red-500 transition-colors">&#9632;</button>
      <span className="text-gray-300 mx-1">|</span>
      {[0.5, 1, 2].map(s => {
        const btnClass = 'px-2 py-0.5 rounded ' + (s === speed ? 'bg-[#27A300]/10 text-[#27A300] font-semibold' : 'text-gray-500 hover:bg-gray-200');
        return <button key={s} onClick={() => onSetSpeed(s)} className={btnClass}>{s}x</button>;
      })}
      <span className="text-gray-400 ml-auto">{Array.from(keyframes.entries()).length} obj, {totalFrames} keyframes</span>
    </div>
  );
}
