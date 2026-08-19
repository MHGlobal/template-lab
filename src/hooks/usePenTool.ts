'use client';

import { useState, useCallback, useRef } from 'react';
import * as fabric from 'fabric';

export interface PenPoint {
  x: number; y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
}

export function usePenTool() {
  const [isDrawing, setIsDrawing] = useState(false);
  const pointsRef = useRef<PenPoint[]>([]);
  const previewPathRef = useRef<fabric.Path | null>(null);

  const startPath = useCallback(() => {
    pointsRef.current = [];
    setIsDrawing(true);
  }, []);

  const addPoint = useCallback((x: number, y: number, canvas: fabric.Canvas, handleOut?: { x: number; y: number }) => {
    const p: PenPoint = { x, y, handleOut };
    if (pointsRef.current.length > 0) {
      const last = pointsRef.current[pointsRef.current.length - 1];
      if (handleOut && last.handleOut) {
        last.handleIn = { x: last.x - (handleOut.x - last.x), y: last.y - (handleOut.y - last.y) };
      }
    }
    pointsRef.current.push(p);
    updatePreview(canvas);
  }, []);

  const updatePreview = useCallback((canvas: fabric.Canvas) => {
    if (previewPathRef.current) { canvas.remove(previewPathRef.current); }
    if (pointsRef.current.length < 2) return;
    const pts = pointsRef.current;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      if (prev.handleOut && curr.handleIn) {
        d += ` C ${prev.handleOut.x} ${prev.handleOut.y}, ${curr.handleIn.x} ${curr.handleIn.y}, ${curr.x} ${curr.y}`;
      } else {
        d += ` L ${curr.x} ${curr.y}`;
      }
    }
    const path = new fabric.Path(d, { fill: '', stroke: '#27A300', strokeWidth: 2, selectable: false, evented: false });
    canvas.add(path);
    previewPathRef.current = path;
    canvas.renderAll();
  }, []);

  const finishPath = useCallback((canvas: fabric.Canvas): fabric.Path | null => {
    if (pointsRef.current.length < 2) { setIsDrawing(false); return null; }
    if (previewPathRef.current) canvas.remove(previewPathRef.current);
    const pts = pointsRef.current;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      if (prev.handleOut && curr.handleIn) {
        d += ` C ${prev.handleOut.x} ${prev.handleOut.y}, ${curr.handleIn.x} ${curr.handleIn.y}, ${curr.x} ${curr.y}`;
      } else {
        d += ` L ${curr.x} ${curr.y}`;
      }
    }
    const path = new fabric.Path(d, { fill: '', stroke: '#333333', strokeWidth: 3, strokeUniform: true });
    canvas.add(path);
    canvas.setActiveObject(path);
    canvas.renderAll();
    setIsDrawing(false);
    pointsRef.current = [];
    previewPathRef.current = null;
    return path;
  }, []);

  return { isDrawing, startPath, addPoint, finishPath };
}
