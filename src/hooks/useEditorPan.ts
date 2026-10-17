'use client';

import { useState, useRef, useCallback } from 'react';
import * as fabric from 'fabric';

export function useEditorPan(
  fabricCanvasRef: React.RefObject<fabric.Canvas | null>,
  setActiveToolState: (tool: string) => void,
  setIsDrawingModeState: (val: boolean) => void,
) {
  const [isPanMode, setIsPanMode] = useState(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);

  const panMouseDown = useCallback((opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
    const me = opt.e as MouseEvent;
    panStart.current = { x: me.clientX, y: me.clientY };
  }, []);

  const panMouseMove = useCallback((opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
    if (!panStart.current || !fabricCanvasRef.current) return;
    const vpt = fabricCanvasRef.current.viewportTransform;
    if (!vpt) return;
    const me = opt.e as MouseEvent;
    const dx = me.clientX - panStart.current.x;
    const dy = me.clientY - panStart.current.y;
    panStart.current = { x: me.clientX, y: me.clientY };
    vpt[4] += dx;
    vpt[5] += dy;
    fabricCanvasRef.current.requestRenderAll();
  }, [fabricCanvasRef]);

  const panMouseUp = useCallback(() => {
    panStart.current = null;
  }, []);

  const togglePan = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (isPanMode) {
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.off('mouse:down', panMouseDown);
      canvas.off('mouse:move', panMouseMove);
      canvas.off('mouse:up', panMouseUp);
      setIsPanMode(false);
      setActiveToolState('select');
    } else {
      if (canvas.isDrawingMode) {
        canvas.isDrawingMode = false;
        setIsDrawingModeState(false);
      }
      canvas.selection = false;
      canvas.defaultCursor = 'grab';
      canvas.on('mouse:down', panMouseDown);
      canvas.on('mouse:move', panMouseMove);
      canvas.on('mouse:up', panMouseUp);
      setIsPanMode(true);
      setActiveToolState('pan');
    }
  }, [isPanMode, fabricCanvasRef, panMouseDown, panMouseMove, panMouseUp, setActiveToolState, setIsDrawingModeState]);

  return { isPanMode, setIsPanMode, panStart, togglePan,
    panMouseDown, panMouseMove, panMouseUp,
  };
}
