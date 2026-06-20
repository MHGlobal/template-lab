'use client';

import React from 'react';

interface SafeZoneConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const safeZoneMap: Record<string, SafeZoneConfig> = {
  '1080x1920': { top: 250, bottom: 250, left: 0, right: 0 },
  '1080x1080': { top: 0, bottom: 0, left: 0, right: 0 },
};

interface SafeZoneOverlayProps {
  width: number;
  height: number;
  zoom: number;
  visible: boolean;
}

export default function SafeZoneOverlay({ width, height, zoom, visible }: SafeZoneOverlayProps) {
  const key = `${width}x${height}`;
  const zone = safeZoneMap[key];
  if (!visible || !zone) return null;

  const overlayStyle = (pos: 'top' | 'bottom') => ({
    position: 'absolute' as const,
    left: 0,
    right: 0,
    [pos]: 0,
    height: (zone[pos] * zoom) + 'px',
    background: 'rgba(255, 0, 0, 0.08)',
    border: '1px dashed rgba(255, 0, 0, 0.3)',
    pointerEvents: 'none' as const,
    zIndex: 10,
  });

  return (
    <>
      <div style={overlayStyle('top')} title={`Safe zone top: ${zone.top}px`} />
      <div style={overlayStyle('bottom')} title={`Safe zone bottom: ${zone.bottom}px`} />
    </>
  );
}
