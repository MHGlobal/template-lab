'use client';

import { useState, useRef, useCallback } from 'react';
import * as fabric from 'fabric';

export function useEditorZoom(fabricCanvasRef: React.RefObject<fabric.Canvas | null>) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;

  const applyZoom = useCallback((zoom: number) => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const clamped = Math.max(0.1, Math.min(4, zoom));
    const center = canvas.getCenterPoint();
    canvas.zoomToPoint(center, clamped);
    canvas.requestRenderAll();
    setZoomLevel(clamped);
  }, [fabricCanvasRef]);

  const zoomIn = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    applyZoom(zoomLevel * 1.2);
  }, [zoomLevel, applyZoom]);

  const zoomOut = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    applyZoom(zoomLevel / 1.2);
  }, [zoomLevel, applyZoom]);

  const zoomTo = useCallback((value: number) => {
    applyZoom(value / 100);
  }, [applyZoom]);

  const zoomFit = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    const objects = canvas.getObjects().filter(o => (o as any).data?.type !== 'grid');
    if (objects.length === 0) { zoomTo(100); return; }

    const target = active || null;
    const bounds = target
      ? (() => {
          const r = target.getBoundingRect();
          return { minX: r.left, minY: r.top, maxX: r.left + r.width, maxY: r.top + r.height };
        })()
      : objects.reduce((acc, obj) => {
          const c = obj.getBoundingRect();
          return {
            minX: Math.min(acc.minX, c.left),
            minY: Math.min(acc.minY, c.top),
            maxX: Math.max(acc.maxX, c.left + c.width),
            maxY: Math.max(acc.maxY, c.top + c.height),
          };
        }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    const objW = bounds.maxX - bounds.minX;
    const objH = bounds.maxY - bounds.minY;
    if (objW <= 0 || objH <= 0) { zoomTo(100); return; }

    const cw = canvas.width ?? 800;
    const ch = canvas.height ?? 600;
    const pad = 40;
    const scaleX = cw / (objW + pad * 2);
    const scaleY = ch / (objH + pad * 2);
    const scale = Math.min(scaleX, scaleY, 2) * 0.9;
    applyZoom(scale);
    canvas.absolutePan(new fabric.Point(
      -(bounds.minX * scale) + (cw - objW * scale) / 2,
      -(bounds.minY * scale) + (ch - objH * scale) / 2,
    ));
  }, [fabricCanvasRef, applyZoom, zoomTo]);

  const zoomToSelection = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) { zoomFit(); return; }
    const r = active.getBoundingRect();
    const pad = 60;
    const cw = canvas.width ?? 800;
    const ch = canvas.height ?? 600;
    const scaleX = cw / (r.width + pad * 2);
    const scaleY = ch / (r.height + pad * 2);
    const scale = Math.min(scaleX, scaleY, 4) * 0.9;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    applyZoom(scale);
    canvas.absolutePan(new fabric.Point(
      -(cx * scale) + cw / 2,
      -(cy * scale) + ch / 2,
    ));
  }, [fabricCanvasRef, applyZoom, zoomFit]);

  return {
    zoomLevel, setZoomLevel, zoomLevelRef,
    zoomIn, zoomOut, zoomTo, zoomFit, zoomToSelection,
  };
}
