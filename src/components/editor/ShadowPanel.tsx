'use client';

import React from 'react';
import type { ShadowConfig } from '@/hooks/useShadow';

const DEFAULT_SHADOW: ShadowConfig = { type: 'drop', offsetX: 2, offsetY: 2, blur: 4, color: '#000000', spread: 0 };

export default function ShadowPanel({
  value, onChange, onRemove,
}: {
  value?: ShadowConfig;
  onChange: (config: ShadowConfig) => void;
  onRemove: () => void;
}) {
  const cfg = value || DEFAULT_SHADOW;
  const dropClass = 'flex-1 p-1.5 text-xs rounded-lg border capitalize ' + (cfg.type === 'drop' ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200');
  const innerClass = 'flex-1 p-1.5 text-xs rounded-lg border capitalize ' + (cfg.type === 'inner' ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200');
  const glowClass = 'flex-1 p-1.5 text-xs rounded-lg border capitalize ' + (cfg.type === 'glow' ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200');
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button onClick={() => onChange({ ...cfg, type: 'drop' })} className={dropClass}>Drop</button>
        <button onClick={() => onChange({ ...cfg, type: 'inner' })} className={innerClass}>Inner</button>
        <button onClick={() => onChange({ ...cfg, type: 'glow' })} className={glowClass}>Glow</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="text-xs text-gray-500 block">X: {cfg.offsetX}</label><input type="range" min={-20} max={20} value={cfg.offsetX} onChange={e => onChange({ ...cfg, offsetX: parseInt(e.target.value) })} className="w-full accent-[#27A300]" /></div>
        <div><label className="text-xs text-gray-500 block">Y: {cfg.offsetY}</label><input type="range" min={-20} max={20} value={cfg.offsetY} onChange={e => onChange({ ...cfg, offsetY: parseInt(e.target.value) })} className="w-full accent-[#27A300]" /></div>
      </div>
      <div><label className="text-xs text-gray-500 block">Blur: {cfg.blur}</label><input type="range" min={0} max={50} value={cfg.blur} onChange={e => onChange({ ...cfg, blur: parseInt(e.target.value) })} className="w-full accent-[#27A300]" /></div>
      <div><label className="text-xs text-gray-500 block">Cor</label><input type="color" value={cfg.color} onChange={e => onChange({ ...cfg, color: e.target.value })} className="w-full h-7 p-0.5 border rounded cursor-pointer" /></div>
      <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remover sombra</button>
    </div>
  );
}
