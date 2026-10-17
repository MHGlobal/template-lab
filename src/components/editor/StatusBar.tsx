'use client';

import React from 'react';
import { MousePointer2, ZoomIn, Layers, Grid3x3 } from 'lucide-react';

interface StatusBarProps {
  mousePos: { x: number; y: number } | null;
  zoom: number;
  objectCount: number;
  isGridVisible: boolean;
}

export default function StatusBar({ mousePos, zoom, objectCount, isGridVisible }: StatusBarProps) {
  return (
    <footer className="h-7 bg-white border-t flex items-center px-3 gap-4 text-[11px] text-gray-500 shrink-0">
      {mousePos && (
        <span className="flex items-center gap-1">
          <MousePointer2 className="w-3 h-3" />
          {Math.round(mousePos.x)}, {Math.round(mousePos.y)}
        </span>
      )}
      <span className="flex items-center gap-1">
        <ZoomIn className="w-3 h-3" />
        {Math.round(zoom * 100)}%
      </span>
      <span className="flex items-center gap-1">
        <Layers className="w-3 h-3" />
        {objectCount} obj
      </span>
      <span className="flex items-center gap-1">
        <Grid3x3 className={`w-3 h-3 ${isGridVisible ? 'text-[#27A300]' : ''}`} />
        Grid {isGridVisible ? 'ON' : 'OFF'}
      </span>
    </footer>
  );
}
