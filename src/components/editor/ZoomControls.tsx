'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Minus, Plus, Maximize, Hand, Expand, MousePointer2 } from 'lucide-react';

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomTo: (value: number) => void;
  onZoomFit: () => void;
  onZoomToSelection: () => void;
  onTogglePan: () => void;
  isPanMode: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

export default function ZoomControls({
  zoomLevel, onZoomIn, onZoomOut, onZoomTo, onZoomFit, onZoomToSelection,
  onTogglePan, isPanMode, canvasWidth, canvasHeight,
}: ZoomControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const presets = [25, 50, 75, 100, 150, 200, 400];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const percent = Math.round(zoomLevel * 100);

  return (
    <footer className="h-9 bg-white border-t border-gray-200 flex items-center justify-between px-4 text-xs text-gray-500 shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-medium text-gray-600">{canvasWidth} &times; {canvasHeight} px</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onZoomFit}
          title="Ajustar ao ecrã"
          className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
        >
          <Expand className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onZoomToSelection}
          title="Zoom à seleção"
          className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
        >
          <MousePointer2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onTogglePan}
          title="Modo pan (H)"
          className={`p-1.5 rounded transition-colors ${
            isPanMode ? 'bg-green-100 text-[#27A300]' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
          }`}
        >
          <Hand className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <button
          onClick={onZoomOut}
          title="Zoom out"
          className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-2.5 py-1 rounded text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors min-w-[50px] text-center tabular-nums"
          >
            {percent}%
          </button>
          {isOpen && (
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[72px] z-50">
              {presets.map(p => (
                <button
                  key={p}
                  onClick={() => { onZoomTo(p); setIsOpen(false); }}
                  className={`block w-full text-left px-3 py-1 text-xs hover:bg-green-50 transition-colors ${
                    percent === p ? 'bg-green-50 text-[#27A300] font-bold' : 'text-gray-700'
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onZoomIn}
          title="Zoom in"
          className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
}
