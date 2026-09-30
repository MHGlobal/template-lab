'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MiniMapProps {
  canvasWidth: number;
  canvasHeight: number;
  getCanvasSnapshot: () => string | null;
  onNavigate: (x: number, y: number) => void;
}

export default function MiniMap({ canvasWidth, canvasHeight, getCanvasSnapshot, onNavigate }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [vpt, setVpt] = useState({ x: 0, y: 0, zoom: 1 });

  const scale = Math.min(120 / canvasWidth, 90 / canvasHeight);
  const mw = canvasWidth * scale;
  const mh = canvasHeight * scale;

  useEffect(() => {
    const img = getCanvasSnapshot();
    if (!img || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const c = new Image();
    c.onload = () => {
      if (!canvasRef.current) return;
      ctx.clearRect(0, 0, mw, mh);
      ctx.drawImage(c, 0, 0, mw, mh);
      ctx.strokeStyle = '#27A300';
      ctx.lineWidth = 2;
      const vw = (canvasWidth / vpt.zoom) * scale;
      const vh = (canvasHeight / vpt.zoom) * scale;
      const vx = (-vpt.x / vpt.zoom) * scale;
      const vy = (-vpt.y / vpt.zoom) * scale;
      ctx.strokeRect(vx, vy, vw, vh);
    };
    c.src = img;
  }, [canvasWidth, canvasHeight, scale, getCanvasSnapshot, vpt, mw, mh]);

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / scale;
    const py = (e.clientY - rect.top) / scale;
    onNavigate(px - canvasWidth / 2, py - canvasHeight / 2);
  };

  return (
    <div className="absolute bottom-4 right-4 z-30 bg-white rounded-xl shadow-lg border p-1.5">
      <canvas
        ref={canvasRef}
        width={mw}
        height={mh}
        onClick={handleClick}
        className="cursor-pointer rounded-lg"
        style={{ width: mw, height: mh }}
      />
    </div>
  );
}
