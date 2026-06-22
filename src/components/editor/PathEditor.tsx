'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';

export default function PathEditor({
  path, canvas,
  onFinish,
}: {
  path: fabric.Path | null;
  canvas: fabric.Canvas | null;
  onFinish: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const handlesRef = useRef<fabric.Circle[]>([]);
  const linesRef = useRef<fabric.Line[]>([]);

  const clearOverlay = useCallback(() => {
    if (!canvas) return;
    handlesRef.current.forEach(h => canvas.remove(h));
    linesRef.current.forEach(l => canvas.remove(l));
    handlesRef.current = [];
    linesRef.current = [];
    canvas.renderAll();
  }, [canvas]);

  const buildHandles = useCallback(() => {
    if (!canvas || !path) return;
    clearOverlay();
    const pathData = path.path;
    if (!pathData) return;
    const points: { x: number; y: number }[] = [];
    const handles: { x1: number; y1: number; x2: number; y2: number }[] = [];
    pathData.forEach((cmd: any) => {
      if (cmd[0] === 'M') { points.push({ x: cmd[1], y: cmd[2] }); }
      else if (cmd[0] === 'L') { points.push({ x: cmd[1], y: cmd[2] }); }
      else if (cmd[0] === 'C') {
        points.push({ x: cmd[5], y: cmd[6] });
        handles.push({ x1: cmd[1], y1: cmd[2], x2: cmd[3], y2: cmd[4] });
      }
    });
    points.forEach((pt, i) => {
      const circ = new fabric.Circle({
        left: pt.x - 4, top: pt.y - 4, radius: 4,
        fill: 'white', stroke: '#27A300', strokeWidth: 2,
        selectable: true, evented: true,
      });
      canvas.add(circ);
      handlesRef.current.push(circ);
      if (i < handles.length) {
        const h = handles[i];
        const line1 = new fabric.Line([pt.x, pt.y, h.x1, h.y1], { stroke: '#27A300', strokeWidth: 1, strokeDashArray: [3, 3], selectable: false, evented: false });
        const line2 = new fabric.Line([pt.x, pt.y, h.x2, h.y2], { stroke: '#27A300', strokeWidth: 1, strokeDashArray: [3, 3], selectable: false, evented: false });
        canvas.add(line1, line2);
        linesRef.current.push(line1, line2);
      }
    });
    canvas.renderAll();
  }, [canvas, path, clearOverlay]);

  useEffect(() => {
    buildHandles();
    return () => clearOverlay();
  }, [buildHandles, clearOverlay]);

  return (
    <div ref={overlayRef} className="absolute top-2 right-2 z-50 flex gap-1">
      <button onClick={onFinish} className="px-3 py-1.5 bg-[#27A300] text-white text-xs rounded-lg hover:bg-[#1F8A00] transition-colors">
        Concluir Edi\u00E7\u00E3o
      </button>
      <button onClick={clearOverlay} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 transition-colors">
        Limpar Handles
      </button>
    </div>
  );
}
