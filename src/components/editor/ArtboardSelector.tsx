'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Monitor, ChevronDown } from 'lucide-react';

interface ArtboardPreset {
  name: string;
  width: number;
  height: number;
  category: 'social' | 'print' | 'display';
}

const presets: ArtboardPreset[] = [
  { name: 'Instagram Post', width: 1080, height: 1080, category: 'social' },
  { name: 'Instagram Story', width: 1080, height: 1920, category: 'social' },
  { name: 'Instagram Reel', width: 1080, height: 1920, category: 'social' },
  { name: 'Facebook Cover', width: 820, height: 312, category: 'social' },
  { name: 'LinkedIn Banner', width: 1584, height: 396, category: 'social' },
  { name: 'YouTube Thumbnail', width: 1280, height: 720, category: 'social' },
  { name: 'Twitter Post', width: 1200, height: 675, category: 'social' },
  { name: 'Twitch Banner', width: 1920, height: 480, category: 'social' },
  { name: 'A4', width: 2480, height: 3508, category: 'print' },
  { name: 'A5', width: 1748, height: 2480, category: 'print' },
  { name: 'Etsy Shop', width: 4000, height: 2667, category: 'display' },
];

interface ArtboardSelectorProps {
  currentWidth: number;
  currentHeight: number;
  onResize: (width: number, height: number) => void;
}

const categoryLabels: Record<string, string> = {
  social: 'Redes Sociais',
  print: 'Impressão',
  display: 'Display',
};

export default function ArtboardSelector({ currentWidth, currentHeight, onResize }: ArtboardSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentPreset = presets.find(p => p.width === currentWidth && p.height === currentHeight);
  const categorized = presets.reduce<Record<string, ArtboardPreset[]>>((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors"
      >
        <Monitor className="w-3.5 h-3.5 text-gray-600" />
        <span>{currentPreset?.name || `${currentWidth}x${currentHeight}`}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[200px] max-h-80 overflow-y-auto">
          {Object.entries(categorized).map(([cat, items]) => (
            <div key={cat}>
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50">
                {categoryLabels[cat] || cat}
              </div>
              {items.map(p => {
                const isActive = p.width === currentWidth && p.height === currentHeight;
                return (
                  <button
                    key={p.name}
                    onClick={() => { onResize(p.width, p.height); setOpen(false); }}
                    className={`w-full px-3 py-2 text-xs text-left hover:bg-green-50 flex items-center justify-between transition-colors ${
                      isActive ? 'bg-green-50 text-[#27A300] font-bold' : 'text-gray-700'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] text-gray-400">{p.width}×{p.height}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
