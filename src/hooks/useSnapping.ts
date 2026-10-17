'use client';

import { useCallback, useRef } from 'react';
import * as fabric from 'fabric';

const SNAP_THRESHOLD = 8;
const RENDER_THROTTLE = 16;

interface SnapResult {
  left?: number;
  top?: number;
  snapped: boolean;
  guides: Array<[number, number, number, number]>;
}

export type SnapMode = 'grid' | 'objects' | 'guides';

export function useSnapping(
  canvasRef: React.RefObject<fabric.Canvas | null>,
  enabledModes: SnapMode[] = ['objects', 'guides'],
  customThreshold?: number,
) {
  const threshold = customThreshold ?? SNAP_THRESHOLD;
  const guideLineRef = useRef<fabric.Line | null>(null);
  const guideLineHRef = useRef<fabric.Line | null>(null);
  const renderPending = useRef(false);
  const lastRender = useRef(0);

  const renderThrottled = useCallback((canvas: fabric.Canvas) => {
    const now = performance.now();
    if (now - lastRender.current < RENDER_THROTTLE) {
      if (!renderPending.current) {
        renderPending.current = true;
        requestAnimationFrame(() => {
          renderPending.current = false;
          lastRender.current = performance.now();
          canvas.renderAll();
        });
      }
      return;
    }
    lastRender.current = now;
    canvas.renderAll();
  }, []);

  const ensureGuideLine = useCallback((coords: [number, number, number, number], isHorizontal: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ref = isHorizontal ? guideLineHRef : guideLineRef;
    if (ref.current) {
      ref.current.set({ x1: coords[0], y1: coords[1], x2: coords[2], y2: coords[3] });
      ref.current.setCoords();
    } else {
      const line = new fabric.Line(coords, {
        stroke: '#27A300',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        opacity: 0.6,
        data: { type: 'snap-guide', temp: true },
      });
      canvas.add(line);
      (canvas as any).moveTo(line, canvas.getObjects().length);
      ref.current = line;
    }
  }, [canvasRef]);

  const clearGuides = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (guideLineRef.current) {
      canvas.remove(guideLineRef.current);
      guideLineRef.current = null;
    }
    if (guideLineHRef.current) {
      canvas.remove(guideLineHRef.current);
      guideLineHRef.current = null;
    }
    canvas.renderAll();
  }, [canvasRef]);

  const snapToGrid = useCallback((value: number, gridSize: number): number => {
    if (!enabledModes.includes('grid')) return value;
    const remainder = value % gridSize;
    if (Math.abs(remainder) < threshold) return value - remainder;
    if (Math.abs(remainder - gridSize) < threshold) return value - remainder + gridSize;
    return value;
  }, [enabledModes, threshold]);

  const snapPosition = useCallback((
    obj: fabric.FabricObject,
    objects: fabric.FabricObject[],
    gridSize: number,
    altKey: boolean,
    isMoving: boolean,
  ): SnapResult => {
    const result: SnapResult = { snapped: false, guides: [] };
    if (altKey || !isMoving) return result;

    const objBounds = obj.getBoundingRect();
    const canvas = canvasRef.current;
    const canvasW = canvas?.width ?? 0;
    const canvasH = canvas?.height ?? 0;

    const snapValue = (value: number, snapPoints: number[]): number | undefined => {
      for (const sp of snapPoints) {
        if (Math.abs(value - sp) < threshold) return sp;
      }
      return undefined;
    };

    const snapPointsLeft: number[] = [0];
    const snapPointsRight: number[] = [canvasW];
    const snapPointsTop: number[] = [0];
    const snapPointsBottom: number[] = [canvasH];
    const snapPointsCenterX: number[] = [canvasW / 2];
    const snapPointsCenterY: number[] = [canvasH / 2];

    if (enabledModes.includes('grid')) {
      const gs = gridSize;
      for (let x = 0; x <= canvasW; x += gs) {
        snapPointsLeft.push(x);
        snapPointsRight.push(x);
        snapPointsCenterX.push(x);
      }
      for (let y = 0; y <= canvasH; y += gs) {
        snapPointsTop.push(y);
        snapPointsBottom.push(y);
        snapPointsCenterY.push(y);
      }
    }

    if (enabledModes.includes('objects') || enabledModes.includes('guides')) {
      for (const other of objects) {
        if (other === obj || (other as any).data?.temp) continue;
        const b = other.getBoundingRect();
        snapPointsLeft.push(b.left);
        snapPointsRight.push(b.left + b.width);
        snapPointsCenterX.push(b.left + b.width / 2);
        snapPointsTop.push(b.top);
        snapPointsBottom.push(b.top + b.height);
        snapPointsCenterY.push(b.top + b.height / 2);
      }
    }

    const cx = objBounds.left + objBounds.width / 2;
    const cy = objBounds.top + objBounds.height / 2;

    const snappedLeft = snapValue(objBounds.left, snapPointsLeft);
    if (snappedLeft !== undefined) {
      result.left = snappedLeft;
      result.snapped = true;
      result.guides.push([snappedLeft, objBounds.top, snappedLeft, objBounds.top + objBounds.height]);
    }

    const snappedRight = snapValue(objBounds.left + objBounds.width, snapPointsRight);
    if (snappedRight !== undefined) {
      const newLeft = snappedRight - objBounds.width;
      if (result.left === undefined || Math.abs(newLeft - objBounds.left) < Math.abs(result.left - objBounds.left)) {
        result.left = newLeft;
        result.snapped = true;
        result.guides.push([snappedRight, objBounds.top, snappedRight, objBounds.top + objBounds.height]);
      }
    }

    const snappedCX = snapValue(cx, snapPointsCenterX);
    if (snappedCX !== undefined) {
      result.left = snappedCX - objBounds.width / 2;
      result.snapped = true;
      result.guides.push([snappedCX, objBounds.top, snappedCX, objBounds.top + objBounds.height]);
    }

    const snappedTop = snapValue(objBounds.top, snapPointsTop);
    if (snappedTop !== undefined) {
      result.top = snappedTop;
      result.snapped = true;
      result.guides.push([objBounds.left, snappedTop, objBounds.left + objBounds.width, snappedTop]);
    }

    const snappedBottom = snapValue(objBounds.top + objBounds.height, snapPointsBottom);
    if (snappedBottom !== undefined) {
      const newTop = snappedBottom - objBounds.height;
      if (result.top === undefined || Math.abs(newTop - objBounds.top) < Math.abs(result.top - objBounds.top)) {
        result.top = newTop;
        result.snapped = true;
        result.guides.push([objBounds.left, snappedBottom, objBounds.left + objBounds.width, snappedBottom]);
      }
    }

    const snappedCY = snapValue(cy, snapPointsCenterY);
    if (snappedCY !== undefined) {
      result.top = snappedCY - objBounds.height / 2;
      result.snapped = true;
      result.guides.push([objBounds.left, snappedCY, objBounds.left + objBounds.width, snappedCY]);
    }

    return result;
  }, [canvasRef, enabledModes, threshold]);

  const setupSnapping = useCallback((gridSize = 20) => {
    const canvas = canvasRef.current;
    if (!canvas) return () => {};

    let altDown = false;

    const keyHandler = (e: KeyboardEvent) => {
      altDown = e.altKey;
    };

    const movingHandler = (opt: any) => {
      const obj = opt.target;
      if (!obj || (obj as any).data?.temp) return;
      const others = canvas.getObjects().filter(o => o !== obj && (o as any).evented !== false && !(o as any).data?.temp);
      const snap = snapPosition(obj, others, gridSize, altDown, true);
      if (snap.left !== undefined) obj.set({ left: snap.left } as any);
      if (snap.top !== undefined) obj.set({ top: snap.top } as any);
      clearGuides();
      for (const guide of snap.guides) {
        const isH = guide[1] === guide[3];
        ensureGuideLine(guide, isH);
      }
      if (snap.guides.length > 0) {
        renderThrottled(canvas);
      }
    };

    const upHandler = () => { clearGuides(); };

    window.addEventListener('keydown', keyHandler);
    window.addEventListener('keyup', keyHandler);
    canvas.on('object:moving', movingHandler as any);
    canvas.on('mouse:up', upHandler as any);
    canvas.on('selection:created', clearGuides as any);
    canvas.on('selection:cleared', clearGuides as any);

    return () => {
      window.removeEventListener('keydown', keyHandler);
      window.removeEventListener('keyup', keyHandler);
      canvas.off('object:moving', movingHandler as any);
      canvas.off('mouse:up', upHandler as any);
      canvas.off('selection:created', clearGuides as any);
      canvas.off('selection:cleared', clearGuides as any);
      clearGuides();
    };
  }, [canvasRef, snapPosition, clearGuides, ensureGuideLine, renderThrottled]);

  return { setupSnapping, clearGuides, snapToGrid };
}
