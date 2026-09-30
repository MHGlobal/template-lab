'use client';

import React, { useState, useCallback, useEffect } from 'react';
import * as fabric from 'fabric';

interface CropToolProps {
  canvas: fabric.Canvas | null;
  target: fabric.FabricObject | null;
  onConfirm: (left: number, top: number, width: number, height: number) => void;
  onCancel: () => void;
}

export default function CropTool({ canvas, target, onConfirm, onCancel }: CropToolProps) {
  const [crop, setCrop] = useState({ left: 0, top: 0, width: 100, height: 100 });
  const [dragHandle, setDragHandle] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    const b = target.getBoundingRect();
    setCrop({ left: b.left, top: b.top, width: b.width * (target.scaleX || 1), height: b.height * (target.scaleY || 1) });
  }, [target]);

  const handleMouseDown = useCallback((handle: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setDragHandle(handle);
  }, []);

  useEffect(() => {
    if (!dragHandle || !target) return;
    const onMove = (e: MouseEvent) => {
      setCrop(prev => {
        const c = { ...prev };
        if (dragHandle.includes('e')) c.width = Math.max(20, e.clientX - c.left - 200);
        if (dragHandle.includes('w')) { const d = e.clientX - 200 - c.left; c.left += d; c.width = Math.max(20, c.width - d); }
        if (dragHandle.includes('s')) c.height = Math.max(20, e.clientY - c.top - 0);
        if (dragHandle.includes('n')) { const d = e.clientY - 0 - c.top; c.top += d; c.height = Math.max(20, c.height - d); }
        return c;
      });
    };
    const onUp = () => setDragHandle(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragHandle, target]);

  if (!target) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      <div className="absolute inset-0 bg-black/30 pointer-events-auto" onClick={onCancel} />
      <div className="absolute border-2 border-[#27A300] bg-transparent pointer-events-auto"
        style={{ left: crop.left, top: crop.top, width: crop.width, height: crop.height }}>
        {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map(h => (
          <div key={h} onMouseDown={handleMouseDown(h)}
            className="absolute w-3 h-3 bg-white border-2 border-[#27A300] rounded-full cursor-pointer"
            style={{
              left: h.includes('w') ? -6 : h.includes('e') ? crop.width - 6 : crop.width / 2 - 6,
              top: h.includes('n') ? -6 : h.includes('s') ? crop.height - 6 : crop.height / 2 - 6,
            }}
          />
        ))}
      </div>
      <div className="absolute bottom-4 right-4 flex gap-2 pointer-events-auto z-40">
        <button onClick={onCancel} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold">Cancelar</button>
        <button onClick={() => onConfirm(crop.left, crop.top, crop.width, crop.height)} className="px-3 py-1.5 bg-[#27A300] text-white rounded-lg text-xs font-semibold">Aplicar</button>
      </div>
    </div>
  );
}
