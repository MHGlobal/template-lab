'use client';

import React from 'react';

interface RulersProps {
  width: number;
  height: number;
  zoom: number;
  mousePos: { x: number; y: number } | null;
}

const RulerMark: React.FC<{ value: number; max: number; zoom: number; orientation: 'h' | 'v' }> =
  ({ value, max, zoom, orientation }) => {
    if (value === 0) return null;
    const isMajor = value % 100 === 0;
    const isMid = value % 50 === 0;
    const size = isMajor ? 12 : isMid ? 8 : 4;
    const pos = value * zoom;

    if (orientation === 'h') {
      return (
        <React.Fragment>
          <div style={{ position: 'absolute', left: pos, top: 0, width: 1, height: size, background: '#9CA3AF' }} />
          {isMajor && (
            <div style={{ position: 'absolute', left: pos + 3, top: size, fontSize: 9, color: '#6B7280', userSelect: 'none', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
              {value}
            </div>
          )}
        </React.Fragment>
      );
    }
    return (
      <React.Fragment>
        <div style={{ position: 'absolute', top: pos, left: 0, width: size, height: 1, background: '#9CA3AF' }} />
        {isMajor && (
          <div style={{ position: 'absolute', top: pos + 3, left: size + 2, fontSize: 9, color: '#6B7280', userSelect: 'none', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
            {value}
          </div>
        )}
      </React.Fragment>
    );
  };

export default function Rulers({ width, height, zoom, mousePos }: RulersProps) {
  const step = zoom < 0.5 ? 50 : zoom < 1 ? 20 : 10;
  const marks: number[] = [];
  const maxDim = Math.max(width, height);
  for (let v = 0; v <= maxDim; v += step) marks.push(v);

  return (
    <>
      {/* Horizontal ruler */}
      <div style={{
        position: 'absolute', top: 0, left: 20, right: 0, height: 20,
        background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
        overflow: 'hidden', zIndex: 20,
      }}>
        {marks.filter(v => v <= width).map(v => (
          <RulerMark key={`h-${v}`} value={v} max={width} zoom={zoom} orientation="h" />
        ))}
        {mousePos && (
          <div style={{
            position: 'absolute', left: mousePos.x * zoom, top: 0, width: 1, height: 20,
            background: '#27A300', zIndex: 21, transition: 'left 0.05s',
          }} />
        )}
      </div>

      {/* Vertical ruler */}
      <div style={{
        position: 'absolute', top: 20, left: 0, width: 20, bottom: 0,
        background: '#F9FAFB', borderRight: '1px solid #E5E7EB',
        overflow: 'hidden', zIndex: 20,
      }}>
        {marks.filter(v => v <= height).map(v => (
          <RulerMark key={`v-${v}`} value={v} max={height} zoom={zoom} orientation="v" />
        ))}
        {mousePos && (
          <div style={{
            position: 'absolute', top: mousePos.y * zoom, left: 0, width: 20, height: 1,
            background: '#27A300', zIndex: 21, transition: 'top 0.05s',
          }} />
        )}
      </div>

      {/* Corner square */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 20, height: 20,
        background: '#F3F4F6', borderRight: '1px solid #E5E7EB',
        borderBottom: '1px solid #E5E7EB', zIndex: 22,
      }} />
    </>
  );
}
