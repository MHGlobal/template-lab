'use client';

import React, { useState, useRef, useCallback } from 'react';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftWidth?: number;
  minLeft?: number;
  minRight?: number;
}

export default function SplitPane({ left, right, defaultLeftWidth = 300, minLeft = 200, minRight = 200 }: SplitPaneProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const dragging = useRef(false);

  const handleMouseDown = useCallback(() => { dragging.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }, []);
  const handleMouseUp = useCallback(() => { dragging.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const parent = (e.target as HTMLElement).closest('[data-split]') as HTMLElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const newWidth = Math.max(minLeft, Math.min(e.clientX - parentRect.left, parentRect.width - minRight));
    setLeftWidth(newWidth);
  }, [minLeft, minRight]);

  return (
    <div data-split className="flex flex-1 overflow-hidden" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div style={{ width: leftWidth }} className="shrink-0 overflow-hidden">{left}</div>
      <div
        onMouseDown={handleMouseDown}
        className="w-1.5 bg-gray-200 hover:bg-[#27A300] cursor-col-resize shrink-0 transition-colors"
      />
      <div className="flex-1 overflow-hidden">{right}</div>
    </div>
  );
}
