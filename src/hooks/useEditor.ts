'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { useSnapping } from './useSnapping';
import { useVariables } from './useVariables';
import { useTextPath } from './useTextPath';
import { useQRCode } from './useQRCode';
import { useGradient } from './useGradient';
import type { GradientDef } from './useGradient';
import { useShadow } from './useShadow';
import type { ShadowConfig } from './useShadow';
import { usePenTool } from './usePenTool';
import { useMask } from './useMask';
import { useTable } from './useTable';
import { useAnimation } from './useAnimation';
import type { Keyframe } from './useAnimation';
import { useEditorHistory } from './useEditorHistory';
import { useEditorZoom } from './useEditorZoom';
import { useEditorPan } from './useEditorPan';

export interface EditorOptions {
  width: number;
  height: number;
  maxHistory?: number;
}

export interface ActiveObjectProps {
  id: string | null;
  type: 'rect' | 'circle' | 'triangle' | 'ellipse' | 'line' | 'polygon' | 'i-text' | 'image' | 'group' | null;
  left: number;
  top: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: string;
  text?: string;
  aspectLock?: boolean;
  arrowStyle?: string;
}

export type ToolId = 'select' | 'pan' | 'rect' | 'circle' | 'triangle' | 'ellipse' | 'line' | 'polygon' | 'star' | 'arrow' | 'rounded-rect' | 'heart' | 'speech-bubble' | 'pentagon' | 'dashed-line';

export const useEditor = (canvasRef: React.RefObject<HTMLCanvasElement>, options: EditorOptions) => {
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const { setupSnapping } = useSnapping(fabricCanvasRef);
  const [isReady, setIsReady] = useState(false);
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [isDrawingMode, setIsDrawingModeState] = useState(false);
  const [activeProps, setActiveProps] = useState<ActiveObjectProps | null>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.FabricObject | null>(null);
  const [hoveredObject, setHoveredObject] = useState<fabric.FabricObject | null>(null);
  const [activeTool, setActiveToolState] = useState<ToolId>('select');
  const activeToolRef = useRef(activeTool);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  const placementAnchor = useRef<{ x: number; y: number } | null>(null);
  const placementPreview = useRef<fabric.FabricObject | null>(null);
  const isPlacingRef = useRef(false);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedOpacityMap = useRef(new WeakMap<fabric.FabricObject, number>());

  const isInternalUpdate = useRef(false);
  const isGridVisibleRef = useRef(isGridVisible);
  useEffect(() => { isGridVisibleRef.current = isGridVisible; }, [isGridVisible]);

  // Sub-hooks
  const { saveHistory, undo, redo, loadJson } = useEditorHistory(fabricCanvasRef, options, {
    addGridLines: () => addGridLines(),
    updateActiveProps: () => updateActiveProps(),
    isGridVisibleRef,
  });
  const { zoomLevel, setZoomLevel, zoomLevelRef, zoomIn, zoomOut, zoomTo, zoomFit, zoomToSelection } = useEditorZoom(fabricCanvasRef);
  const { isPanMode, setIsPanMode, panStart, togglePan, panMouseDown, panMouseMove, panMouseUp } = useEditorPan(
    fabricCanvasRef,
    (tool: string) => setActiveToolState(tool as ToolId),
    setIsDrawingModeState,
  );

  const extractObjectProps = useCallback((obj: fabric.FabricObject | null): ActiveObjectProps | null => {
    if (!obj) return null;

    const getType = (): ActiveObjectProps['type'] => {
      if (obj instanceof fabric.Rect) return 'rect';
      if (obj instanceof fabric.Circle) return 'circle';
      if (obj instanceof fabric.Triangle) return 'triangle';
      if (obj instanceof fabric.Ellipse) return 'ellipse';
      if (obj instanceof fabric.Line) return 'line';
      if (obj instanceof fabric.Polygon) return 'polygon';
      if (obj instanceof fabric.IText || obj instanceof fabric.Textbox) return 'i-text';
      if (obj instanceof fabric.Image) return 'image';
      if (obj instanceof fabric.Group) return 'group';
      return null;
    };

    const base: ActiveObjectProps = {
      id: (obj as any).data?.id ?? null,
      type: getType(),
      left: Math.round(obj.left ?? 0),
      top: Math.round(obj.top ?? 0),
      width: Math.round((obj.width ?? 0) * (obj.scaleX ?? 1)),
      height: Math.round((obj.height ?? 0) * (obj.scaleY ?? 1)),
      fill: obj.fill as string || '#000000',
      stroke: obj.stroke as string || '#000000',
      strokeWidth: obj.strokeWidth ?? 0,
      opacity: obj.opacity ?? 1,
      scaleX: obj.scaleX ?? 1,
      scaleY: obj.scaleY ?? 1,
      angle: obj.angle ?? 0,
      aspectLock: !!(obj as any).data?.aspectLock,
      arrowStyle: (obj as any).data?.arrowStyle,
    };

    if (obj instanceof fabric.IText || obj instanceof fabric.Textbox) {
      base.text = obj.text || '';
      base.fontFamily = obj.fontFamily || 'Arial';
      base.fontSize = obj.fontSize || 24;
      base.fontWeight = obj.fontWeight || 'normal';
      base.textAlign = obj.textAlign || 'left';
    }

    return base;
  }, []);

  const updateActiveProps = useCallback(() => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    setSelectedObject(obj ?? null);
    setActiveProps(extractObjectProps(obj ?? null));
  }, [extractObjectProps]);

  const addGridLines = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const size = 20;
    const w = canvas.width ?? options.width;
    const h = canvas.height ?? options.height;
    const newLines: fabric.Line[] = [];
    for (let x = 0; x < w; x += size) {
      const line = new fabric.Line([x, 0, x, h], {
        stroke: '#E5E7EB', strokeWidth: 0.5, selectable: false,
        evented: false, data: { type: 'grid' },
      });
      newLines.push(line);
      canvas.add(line);
    }
    for (let y = 0; y < h; y += size) {
      const line = new fabric.Line([0, y, w, y], {
        stroke: '#E5E7EB', strokeWidth: 0.5, selectable: false,
        evented: false, data: { type: 'grid' },
      });
      newLines.push(line);
      canvas.add(line);
    }
    for (const line of newLines) canvas.moveObjectTo(line, 0);
    canvas.requestRenderAll();
  }, [options.width, options.height]);

  const createArrow = useCallback((
    l: number, t: number, w: number, h: number,
    style: string, extraData?: Record<string, any>
  ): fabric.Group | null => {
    const absW = Math.abs(w); const absH = Math.abs(h);
    const len = Math.sqrt(absW * absW + absH * absH);
    if (len < 10) return null;
    const angle = Math.atan2(h, w);
    const headSize = Math.min(20, len * 0.3);
    const lineColor = '#10B981';
    const isDashed = style === 'dashed';
    const line = new fabric.Line([0, 0, absW, absH], {
      stroke: lineColor, strokeWidth: 4,
      strokeDashArray: isDashed ? [8, 4] : undefined,
      strokeUniform: true,
    });
    const children: fabric.FabricObject[] = [line];
    if (style !== 'chevron') {
      const head = new fabric.Triangle({
        left: absW, top: absH, width: headSize, height: headSize * 0.6,
        fill: lineColor, originX: 'center', originY: 'center',
      });
      head.set({ angle: (angle * 180 / Math.PI) + 90 });
      children.push(head);
    } else {
      const hs2 = headSize * 0.5;
      const chevPts = [
        { x: absW - hs2, y: absH - hs2 },
        { x: absW, y: absH },
        { x: absW - hs2, y: absH + hs2 },
      ];
      children.push(new fabric.Polygon(chevPts, { fill: lineColor }));
    }
    if (style === 'double') {
      const startHead = new fabric.Triangle({
        left: 0, top: 0, width: headSize, height: headSize * 0.6,
        fill: lineColor, originX: 'center', originY: 'center',
      });
      startHead.set({ angle: (angle * 180 / Math.PI) - 90 });
      children.push(startHead);
    }
    const group = new fabric.Group(children, { left: l, top: t });
    (group as any).data = { ...((group as any).data || {}), arrowStyle: style, ...extraData };
    return group;
  }, []);

  // Shape factory
  const createShape = useCallback((tool: ToolId, left: number, top: number, width: number, height: number): fabric.FabricObject | null => {
    const absW = Math.abs(width);
    const absH = Math.abs(height);
    const x = width >= 0 ? left : left + width;
    const y = height >= 0 ? top : top + height;

    const colors: Record<string, string> = {
      rect: '#4F46E5', circle: '#EC4899', triangle: '#F59E0B',
      ellipse: '#8B5CF6', 'rounded-rect': '#06B6D4', arrow: '#10B981', star: '#EF4444',
      heart: '#EF4444', 'speech-bubble': '#8B5CF6', pentagon: '#F59E0B', 'dashed-line': '#10B981',
    };

    switch (tool) {
      case 'rect':
        return new fabric.Rect({ left: x, top: y, width: absW, height: absH, fill: colors.rect, stroke: '#000000', strokeWidth: 0, strokeUniform: true });
      case 'rounded-rect':
        return new fabric.Rect({ left: x, top: y, width: absW, height: absH, rx: 12, ry: 12, fill: colors['rounded-rect'], stroke: '#000000', strokeWidth: 0, strokeUniform: true });
      case 'circle':
        return new fabric.Circle({ left: x, top: y, radius: Math.max(absW, absH) / 2, fill: colors.circle, stroke: '#000000', strokeWidth: 0, strokeUniform: true });
      case 'ellipse':
        return new fabric.Ellipse({ left: x, top: y, rx: absW / 2, ry: absH / 2, fill: colors.ellipse, stroke: '#000000', strokeWidth: 0, strokeUniform: true });
      case 'triangle':
        return new fabric.Triangle({ left: x, top: y, width: absW, height: absH, fill: colors.triangle, stroke: '#000000', strokeWidth: 0, strokeUniform: true });
      case 'line':
        return new fabric.Line([0, 0, absW, absH], { left: x, top: y, stroke: '#10B981', strokeWidth: 4, hasBorders: true, strokeUniform: true });
      case 'arrow': {
        return createArrow(x, y, absW, absH, (options as any)?.arrowStyle || 'simple');
      }
      case 'star': {
        const points: fabric.XY[] = [];
        const r = Math.max(absW, absH) / 2;
        const cx = r;
        const cy = r;
        const spikes = 5;
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? r : r * 0.4;
          const a = (Math.PI / spikes) * i - Math.PI / 2;
          points.push({ x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) });
        }
        return new fabric.Polygon(points, { left: x, top: y, fill: colors.star, stroke: '#000000', strokeWidth: 0, data: { isStar: true }, strokeUniform: true } as any);
      }
      case 'polygon': {
        const r = Math.max(absW, absH) / 2;
        const cx = r;
        const cy = r;
        const sides = 6;
        const pts: fabric.XY[] = [];
        for (let i = 0; i < sides; i++) {
          const a = (Math.PI * 2 / sides) * i - Math.PI / 2;
          pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
        }
        return new fabric.Polygon(pts, { left: x, top: y, fill: '#8B5CF6', stroke: '#000000', strokeWidth: 0, strokeUniform: true });
      }
      case 'heart': {
        const r = Math.max(absW, absH) / 2;
        const cx = r; const cy = r;
        const heartPts: fabric.XY[] = [];
        for (let i = 0; i < 40; i++) {
          const t = (Math.PI / 40) * i;
          const hx = cx + 16 * Math.pow(Math.sin(t), 3) * (r / 16);
          const hy = cy - (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * (r / 16);
          heartPts.push({ x: hx, y: hy });
        }
        return new fabric.Polygon(heartPts, { left: x, top: y, fill: colors.heart, stroke: '#000000', strokeWidth: 0, strokeUniform: true });
      }
      case 'speech-bubble': {
        const bw = absW; const bh = absH;
        const triSize = 15;
        const sbPts = [
          { x: 0, y: 0 }, { x: bw, y: 0 },
          { x: bw, y: bh - triSize },
          { x: bw * 0.6 + triSize, y: bh - triSize },
          { x: bw * 0.6, y: bh },
          { x: bw * 0.6 - triSize, y: bh - triSize },
          { x: 0, y: bh - triSize },
        ];
        return new fabric.Polygon(sbPts, { left: x, top: y, fill: colors['speech-bubble'], stroke: '#000000', strokeWidth: 0, strokeUniform: true });
      }
      case 'pentagon': {
        const pr = Math.max(absW, absH) / 2;
        const pcx = pr; const pcy = pr;
        const pentaPts: fabric.XY[] = [];
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
          pentaPts.push({ x: pcx + pr * Math.cos(a), y: pcy + pr * Math.sin(a) });
        }
        return new fabric.Polygon(pentaPts, { left: x, top: y, fill: colors.pentagon, stroke: '#000000', strokeWidth: 0, strokeUniform: true });
      }
      case 'dashed-line':
        return new fabric.Line([0, 0, absW, absH], {
          left: x, top: y, stroke: colors['dashed-line'], strokeWidth: 4,
          strokeDashArray: [8, 4], strokeUniform: true,
        });
      default:
        return null;
    }
  }, [createArrow]);

  // Set active tool (placement mode)
  const setActiveTool = useCallback((tool: ToolId) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (isPanMode && tool !== 'pan') {
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.off('mouse:down', panMouseDown);
      canvas.off('mouse:move', panMouseMove);
      canvas.off('mouse:up', panMouseUp);
      setIsPanMode(false);
    }
    setActiveToolState(tool);
    if (tool === 'select') {
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.isDrawingMode = false;
      setIsDrawingModeState(false);
    } else if (tool === 'pan') {
      if (!isPanMode) {
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
      }
    } else {
      canvas.selection = false;
      canvas.discardActiveObject();
      canvas.defaultCursor = 'crosshair';
      canvas.requestRenderAll();
    }
  }, [isPanMode]);

  // Placement mouse handlers
  const placementMouseDown = useCallback((opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
    const canvas = fabricCanvasRef.current;
    const tool = activeToolRef.current;
    if (!canvas || tool === 'select' || tool === 'arrow') return;
    const ptr = canvas.getPointer(opt.e);
    placementAnchor.current = { x: ptr.x, y: ptr.y };
    const preview = createShape(tool, ptr.x, ptr.y, 0, 0);
    if (preview) {
      preview.set({ selectable: false, evented: false, opacity: 0.6 } as any);
      placementPreview.current = preview;
      canvas.add(preview);
      canvas.requestRenderAll();
    }
  }, [createShape]);

  const placementMouseMove = useCallback((opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
    const canvas = fabricCanvasRef.current;
    const anchor = placementAnchor.current;
    const preview = placementPreview.current;
    if (!canvas || !anchor || !preview || activeToolRef.current === 'select') return;
    const ptr = canvas.getPointer(opt.e);
    const w = ptr.x - anchor.x;
    const h = ptr.y - anchor.y;
    const absW = Math.abs(w);
    const absH = Math.abs(h);
    const x = w >= 0 ? anchor.x : ptr.x;
    const y = h >= 0 ? anchor.y : ptr.y;

    if (preview instanceof fabric.Rect || preview instanceof fabric.Triangle) {
      preview.set({ left: x, top: y, width: absW, height: absH } as any);
    } else if (preview instanceof fabric.Circle) {
      preview.set({ left: x, top: y, radius: Math.max(absW, absH) / 2 } as any);
    } else if (preview instanceof fabric.Ellipse) {
      preview.set({ left: x, top: y, rx: absW / 2, ry: absH / 2 } as any);
    } else if (preview instanceof fabric.Line) {
      preview.set({ x1: 0, y1: 0, x2: absW, y2: absH, left: x, top: y } as any);
    } else if (preview instanceof fabric.Polygon) {
      const r = Math.max(absW, absH) / 2;
      const cx = r;
      const cy = r;
      const isStar = (preview as any).data?.isStar;
      if (isStar) {
        const spikes = 5;
        const pts: fabric.XY[] = [];
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? r : r * 0.4;
          const a = (Math.PI / spikes) * i - Math.PI / 2;
          pts.push({ x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) });
        }
        preview.set({ left: x, top: y, points: pts } as any);
      } else {
        const sides = 6;
        const pts: fabric.XY[] = [];
        for (let i = 0; i < sides; i++) {
          const a = (Math.PI * 2 / sides) * i - Math.PI / 2;
          pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
        }
        preview.set({ left: x, top: y, points: pts } as any);
      }
    }
    preview.setCoords();
    canvas.requestRenderAll();
  }, []);

  const placementMouseUp = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const anchor = placementAnchor.current;
    const preview = placementPreview.current;
    if (!canvas || !anchor || !preview) return;
    placementAnchor.current = null;
    placementPreview.current = null;
    isPlacingRef.current = true;
    canvas.remove(preview);
    const w = (preview.width ?? 0) * (preview.scaleX ?? 1);
    const h = (preview.height ?? 0) * (preview.scaleY ?? 1);
    if (w < 5 && h < 5) {
      canvas.requestRenderAll();
      isPlacingRef.current = false;
      return;
    }
    preview.set({ selectable: true, evented: true, opacity: 1 } as any);
    canvas.add(preview);
    canvas.setActiveObject(preview);
    canvas.requestRenderAll();
    saveHistory();
    setActiveTool('select');
    isPlacingRef.current = false;
  }, [saveHistory, setActiveTool]);

  // Arrow placement (needs special handling - line + head)
  const arrowMouseDown = useCallback((opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || activeToolRef.current !== 'arrow') return;
    const ptr = canvas.getPointer(opt.e);
    placementAnchor.current = { x: ptr.x, y: ptr.y };
    const previewLine = new fabric.Line([0, 0, 0, 0], {
      stroke: '#10B981', strokeWidth: 4, selectable: false, evented: false, opacity: 0.6,
    });
    previewLine.set({ left: ptr.x, top: ptr.y });
    placementPreview.current = previewLine;
    canvas.add(previewLine);
    canvas.requestRenderAll();
  }, []);

  const arrowMouseMove = useCallback((opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
    const canvas = fabricCanvasRef.current;
    const anchor = placementAnchor.current;
    const preview = placementPreview.current;
    if (!canvas || !anchor || !preview || activeToolRef.current !== 'arrow') return;
    const ptr = canvas.getPointer(opt.e);
    const w = ptr.x - anchor.x;
    const h = ptr.y - anchor.y;
    const absW = Math.abs(w);
    const absH = Math.abs(h);
    const x = w >= 0 ? anchor.x : ptr.x;
    const y = h >= 0 ? anchor.y : ptr.y;
    preview.set({ x1: 0, y1: 0, x2: absW, y2: absH, left: x, top: y } as any);
    preview.setCoords();
    canvas.requestRenderAll();
  }, []);

  const arrowMouseUp = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const anchor = placementAnchor.current;
    const preview = placementPreview.current;
    if (!canvas || !anchor || !preview || activeToolRef.current !== 'arrow') return;
    placementAnchor.current = null;
    placementPreview.current = null;
    canvas.remove(preview);
    const w = (preview as fabric.Line).x2 - (preview as fabric.Line).x1;
    const h = (preview as fabric.Line).y2 - (preview as fabric.Line).y1;
    if (Math.abs(w) < 5 && Math.abs(h) < 5) {
      canvas.requestRenderAll();
      return;
    }
    const len = Math.sqrt(w * w + h * h);
    const angle = Math.atan2(h, w);
    const headSize = Math.min(20, len * 0.3);
    const arrow = new fabric.Group([
      new fabric.Line([0, 0, Math.abs(w), Math.abs(h)], { stroke: '#10B981', strokeWidth: 4 }),
      new fabric.Triangle({
        left: Math.abs(w), top: Math.abs(h),
        width: headSize, height: headSize * 0.6,
        fill: '#10B981', originX: 'center', originY: 'center',
      }),
    ], {
      left: preview.left, top: preview.top,
    });
    const head = arrow.item(1) as fabric.Triangle;
    head.set({ angle: (angle * 180 / Math.PI) + 90 });
    canvas.add(arrow);
    canvas.setActiveObject(arrow);
    canvas.requestRenderAll();
    saveHistory();
    setActiveTool('select');
  }, [saveHistory, setActiveTool]);

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: options.width,
      height: options.height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      stopContextMenu: true,
      fireRightClick: true,
      renderOnAddRemove: false,
    });
    canvas.altSelectionKey = 'shiftKey';

    fabricCanvasRef.current = canvas;
    saveHistory();
    canvas.requestRenderAll();
    setIsReady(true);

    canvas.on('object:modified', () => {
      saveHistory();
      updateActiveProps();
    });
    canvas.on('object:removed', () => {
      if (isPlacingRef.current) return;
      saveHistory();
      updateActiveProps();
    });
    let rafId: ReturnType<typeof requestAnimationFrame> | null = null;
    const debouncedUpdateProps = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        updateActiveProps();
        rafId = null;
      });
    };
    canvas.on('selection:created', updateActiveProps);
    canvas.on('selection:updated', updateActiveProps);
    canvas.on('selection:cleared', () => {
      if (rafId) cancelAnimationFrame(rafId);
      setSelectedObject(null);
      setActiveProps(null);
    });
    canvas.on('object:moving', debouncedUpdateProps);
    canvas.on('object:scaling', debouncedUpdateProps);
    canvas.on('object:rotating', debouncedUpdateProps);

    // Placement events (use ref to avoid stale closure)
    canvas.on('mouse:down', (opt) => {
      if (activeToolRef.current === 'select' && opt.e.altKey && opt.target) {
        const active = canvas.getActiveObject();
        if (active) {
          active.clone().then((clone: fabric.Object) => {
            clone.set({ left: (clone.left ?? 0) + 20, top: (clone.top ?? 0) + 20 });
            canvas.add(clone);
            canvas.setActiveObject(clone);
            canvas.requestRenderAll();
            saveHistory();
          });
          return;
        }
      }
      if (activeToolRef.current === 'arrow') arrowMouseDown(opt);
      else placementMouseDown(opt);
    });
    canvas.on('mouse:move', (opt) => {
      if (activeToolRef.current === 'arrow') arrowMouseMove(opt);
      else placementMouseMove(opt);
    });
    canvas.on('mouse:up', () => {
      if (activeToolRef.current === 'arrow') arrowMouseUp();
      else placementMouseUp();
    });

    // Hover highlights
    canvas.on('mouse:over', (opt) => {
      if (opt.target && !('isEditing' in opt.target && (opt.target as any).isEditing)) setHoveredObject(opt.target);
    });
    canvas.on('mouse:out', () => setHoveredObject(null));

    // Zoom with mouse wheel / trackpad pinch
    canvas.on('mouse:wheel', (opt) => {
      const e = opt.e as WheelEvent;
      e.preventDefault();
      e.stopPropagation();
      const currentZoom = zoomLevelRef.current;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(10, Math.max(0.1, currentZoom * delta));
      canvas.zoomToPoint({ x: e.offsetX, y: e.offsetY } as any, newZoom);
      setZoomLevel(newZoom);
    });

    const cleanupSnapping = setupSnapping();
    return () => {
      cleanupSnapping();
      canvas.dispose();
      setIsReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, options.width, options.height]);

  // Text (click-to-place)
  const addText = useCallback((text = 'Novo Texto') => {
    const iText = new fabric.IText(text, {
      left: 100, top: 100, fontFamily: 'Inter',
      fontSize: 24, fill: '#1F2937',
    });
    fabricCanvasRef.current?.add(iText);
    fabricCanvasRef.current?.setActiveObject(iText);
    saveHistory();
  }, [saveHistory]);

  const useAsPattern = useCallback((obj: fabric.FabricObject) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !(obj instanceof fabric.Image)) return;
    const imgEl = obj.getElement();
    const pattern = new fabric.Pattern({ source: imgEl, repeat: 'repeat' });
    const rect = new fabric.Rect({
      left: obj.left, top: obj.top, width: obj.width! * obj.scaleX!,
      height: obj.height! * obj.scaleY!, fill: pattern,
    });
    canvas.remove(obj);
    canvas.add(rect);
    canvas.setActiveObject(rect);
    saveHistory();
  }, [saveHistory]);

  const addImage = useCallback((url: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const cw = canvas.width ?? 800;
    const ch = canvas.height ?? 600;
    const centerX = (cw - 200) / 2;
    const centerY = (ch - 200) / 2;

    const addImg = (img: fabric.Image) => {
      const maxDim = Math.min(cw, ch) * 0.6;
      if (img.width && img.width > maxDim) img.scaleToWidth(maxDim);
      if (img.height && img.height > maxDim) img.scaleToHeight(maxDim);
      img.set({ left: centerX, top: centerY });
      img.setCoords();
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
      saveHistory();
    };

    if (url.match(/\.svg(\?|$)/i)) {
      fabric.loadSVGFromString(url).then((results: any) => {
        const group = fabric.util.groupSVGElements(results.objects, results.options);
        group.set({ left: centerX, top: centerY, scaleX: 1, scaleY: 1 });
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.requestRenderAll();
        saveHistory();
      }).catch(() => {
        fabric.Image.fromURL(url, { crossOrigin: 'anonymous' }).then(addImg).catch(() => {});
      });
      return;
    }

    const opts = url.startsWith('blob:') ? undefined : { crossOrigin: 'anonymous' as const };
    fabric.Image.fromURL(url, opts).then(addImg).catch(() => {});
  }, [saveHistory]);

  const addImages = useCallback((urls: string[]) => {
    urls.forEach((url, i) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const opts = url.startsWith('blob:') ? undefined : { crossOrigin: 'anonymous' as const };
      const promise = fabric.Image.fromURL(url, opts);
      if (promise && typeof promise.then === 'function') {
        (promise as Promise<fabric.Image>).then((img: fabric.Image) => {
          img.set({ left: 100 + i * 30, top: 100 + i * 30 });
          img.scaleToWidth(200);
          canvas.add(img);
          canvas.requestRenderAll();
          saveHistory();
        }).catch(() => {});
      }
    });
  }, [saveHistory]);

  // Aspect ratio lock
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const handler = (e: { target?: fabric.FabricObject }) => {
      const obj = e.target;
      if (!obj || !(obj as any).data?.aspectLock) return;
      const origW = obj.width ?? 1;
      const origH = obj.height ?? 1;
      const ratio = origW / origH;
      const newScaleX = obj.scaleX ?? 1;
      const newScaleY = obj.scaleY ?? 1;
      const newW = origW * newScaleX;
      const newH = origH * newScaleY;
      if (Math.abs(newW / newH - ratio) > 0.001) {
        const avgScale = Math.sqrt(newScaleX * newScaleY);
        obj.set({ scaleX: avgScale, scaleY: avgScale } as any);
        obj.setCoords();
      }
    };
    canvas.on('object:scaling', handler);
    return () => { canvas.off('object:scaling', handler); };
  }, []);

  const toggleAspectLock = useCallback((obj: fabric.FabricObject) => {
    const current = !!(obj as any).data?.aspectLock;
    (obj as any).data = { ...(obj as any).data, aspectLock: !current };
    updateActiveProps();
  }, [updateActiveProps]);

  // Grid
  const toggleGrid = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const gridLines = canvas.getObjects().filter(o => (o as any).data?.type === 'grid');
    if (gridLines.length > 0) {
      gridLines.forEach(obj => canvas.remove(obj));
      canvas.requestRenderAll();
      setIsGridVisible(false);
    } else {
      addGridLines();
      setIsGridVisible(true);
    }
  }, [addGridLines]);

  const [gridSnap, setGridSnap] = useState(false);
  const gridSnapRef = useRef(gridSnap);
  gridSnapRef.current = gridSnap;

  const toggleGridSnap = useCallback(() => {
    setGridSnap(p => !p);
  }, []);

  // Selection & Properties
  const setFill = useCallback((color: string) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj) return;
    isInternalUpdate.current = true;
    obj.set({ fill: color } as any);
    obj.setCoords();
    fabricCanvasRef.current?.requestRenderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setStroke = useCallback((color: string) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj) return;
    isInternalUpdate.current = true;
    obj.set({ stroke: color } as any);
    obj.setCoords();
    fabricCanvasRef.current?.requestRenderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setStrokeWidth = useCallback((width: number) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj) return;
    isInternalUpdate.current = true;
    obj.set({ strokeWidth: width } as any);
    obj.setCoords();
    fabricCanvasRef.current?.requestRenderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setOpacity = useCallback((value: number) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj) return;
    isInternalUpdate.current = true;
    obj.set({ opacity: value } as any);
    obj.setCoords();
    fabricCanvasRef.current?.requestRenderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const snapToPixel = useCallback((value: number) => {
    return zoomLevel >= 1 ? Math.round(value) : Math.round(value * 2) / 2;
  }, [zoomLevel]);

  const setPosition = useCallback((left: number, top: number) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj) return;
    isInternalUpdate.current = true;
    obj.set({ left: snapToPixel(left), top: snapToPixel(top) } as any);
    obj.setCoords();
    fabricCanvasRef.current?.requestRenderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps, snapToPixel]);

  const setSize = useCallback((width: number, height: number) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj) return;
    isInternalUpdate.current = true;
    const w = Math.round(width);
    const h = Math.round(height);
    const center = obj.getCenterPoint();
    if (obj instanceof fabric.Line) {
      const halfW = w / 2;
      obj.set({ x1: center.x - halfW, y1: center.y, x2: center.x + halfW, y2: center.y } as any);
    } else if (obj instanceof fabric.Circle) {
      obj.set({ radius: Math.min(w, h) / 2, scaleX: 1, scaleY: 1 } as any);
    } else if (obj instanceof fabric.Ellipse) {
      obj.set({ rx: w / 2, ry: h / 2, scaleX: 1, scaleY: 1 } as any);
    } else {
      const sx = w / (obj.width ?? 1);
      const sy = h / (obj.height ?? 1);
      obj.set({ scaleX: sx, scaleY: sy } as any);
    }
    obj.setCoords();
    if (obj.angle) {
      obj.setPositionByOrigin(center, 'center', 'center');
    }
    fabricCanvasRef.current?.requestRenderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setFontFamily = useCallback((fontFamily: string) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!(obj instanceof fabric.IText)) return;
    isInternalUpdate.current = true;
    obj.set({ fontFamily } as any);
    obj.setCoords();
    fabricCanvasRef.current?.requestRenderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setFontSize = useCallback((fontSize: number) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!(obj instanceof fabric.IText)) return;
    isInternalUpdate.current = true;
    obj.set({ fontSize } as any);
    obj.setCoords();
    fabricCanvasRef.current?.requestRenderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setFontWeight = useCallback((fontWeight: string) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!(obj instanceof fabric.IText)) return;
    isInternalUpdate.current = true;
    obj.set({ fontWeight } as any);
    obj.setCoords();
    fabricCanvasRef.current?.requestRenderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setTextAlign = useCallback((textAlign: string) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!(obj instanceof fabric.IText)) return;
    isInternalUpdate.current = true;
    obj.set({ textAlign } as any);
    obj.setCoords();
    fabricCanvasRef.current?.requestRenderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setTextContent = useCallback((text: string) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!(obj instanceof fabric.IText)) return;
    isInternalUpdate.current = true;
    obj.set({ text } as any);
    obj.setCoords();
    fabricCanvasRef.current?.requestRenderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  // Image filters
  const applyImageFilter = useCallback((filterType: string) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!(obj instanceof fabric.Image)) return;
    isInternalUpdate.current = true;
    const filters: fabric.filters.BaseFilter[] = [];
    switch (filterType) {
      case 'brightness':
        filters.push(new fabric.filters.Brightness({ brightness: 0.2 }) as unknown as fabric.filters.BaseFilter);
        break;
      case 'contrast':
        filters.push(new fabric.filters.Contrast({ contrast: 0.3 }) as unknown as fabric.filters.BaseFilter);
        break;
      case 'sepia':
        filters.push(new fabric.filters.Sepia() as unknown as fabric.filters.BaseFilter);
        break;
      case 'grayscale':
        filters.push(new fabric.filters.Grayscale() as unknown as fabric.filters.BaseFilter);
        break;
      case 'blur':
        filters.push(new fabric.filters.Blur({ blur: 0.3 }) as unknown as fabric.filters.BaseFilter);
        break;
    }
    obj.filters = filters;
    obj.applyFilters();
    fabricCanvasRef.current?.requestRenderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  // Layer management (Fabric.js v6: canvas-level methods, untyped)
  const bringToFront = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (canvas && obj) {
      (canvas as any).bringToFront(obj);
      canvas.requestRenderAll();
    }
  }, []);

  const sendToBack = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (canvas && obj) {
      (canvas as any).sendToBack(obj);
      canvas.requestRenderAll();
    }
  }, []);

  const deleteSelected = useCallback(() => {
    const activeObjects = fabricCanvasRef.current?.getActiveObjects();
    if (activeObjects) {
      fabricCanvasRef.current?.discardActiveObject();
      activeObjects.forEach((obj) => fabricCanvasRef.current?.remove(obj));
      fabricCanvasRef.current?.requestRenderAll();
    }
  }, []);

  // Group / Ungroup
  const groupSelection = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObjects();
    if (!canvas || !active || active.length < 2) return;
    const group = new fabric.Group(active, {});
    canvas.discardActiveObject();
    active.forEach(o => canvas.remove(o));
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    saveHistory();
  }, [saveHistory]);

  const ungroupSelection = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !(active instanceof fabric.Group)) return;
    const items = active.getObjects();
    canvas.discardActiveObject();
    canvas.remove(active);
    items.forEach((item: fabric.FabricObject) => {
      canvas.add(item);
    });
    canvas.requestRenderAll();
    saveHistory();
  }, [saveHistory]);

  // Align tools
  const alignSelected = useCallback((align: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObjects();
    if (!canvas || !active || active.length < 2) return;
    const bounds = active.reduce((acc, obj) => {
      const r = obj.getBoundingRect();
      return {
        minX: Math.min(acc.minX, r.left),
        maxX: Math.max(acc.maxX, r.left + r.width),
        minY: Math.min(acc.minY, r.top),
        maxY: Math.max(acc.maxY, r.top + r.height),
      };
    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    const centerX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
    const centerY = bounds.minY + (bounds.maxY - bounds.minY) / 2;

    active.forEach((obj) => {
      const r = obj.getBoundingRect();
      switch (align) {
        case 'left':
          obj.set({ left: obj.left! - r.left + bounds.minX } as any);
          break;
        case 'center':
          obj.set({ left: obj.left! - r.left + centerX - r.width / 2 } as any);
          break;
        case 'right':
          obj.set({ left: obj.left! - r.left + bounds.maxX - r.width } as any);
          break;
        case 'top':
          obj.set({ top: obj.top! - r.top + bounds.minY } as any);
          break;
        case 'middle':
          obj.set({ top: obj.top! - r.top + centerY - r.height / 2 } as any);
          break;
        case 'bottom':
          obj.set({ top: obj.top! - r.top + bounds.maxY - r.height } as any);
          break;
      }
      obj.setCoords();
    });
    canvas.requestRenderAll();
    saveHistory();
  }, [saveHistory]);

  const distributeSelected = useCallback((dir: 'horizontal' | 'vertical') => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObjects();
    if (!canvas || !active || active.length < 3) return;
    const sorted = [...active].sort((a, b) => {
      const ra = a.getBoundingRect();
      const rb = b.getBoundingRect();
      return dir === 'horizontal' ? ra.left - rb.left : ra.top - rb.top;
    });
    const first = sorted[0].getBoundingRect();
    const last = sorted[sorted.length - 1].getBoundingRect();
    const totalSize = sorted.reduce((sum, o) => {
      const r = o.getBoundingRect();
      return sum + (dir === 'horizontal' ? r.width : r.height);
    }, 0);
    const gap = (dir === 'horizontal' ? (last.left + last.width - first.left) : (last.top + last.height - first.top)) - totalSize;
    const step = gap / (sorted.length - 1);
    let pos = dir === 'horizontal' ? first.left : first.top;
    sorted.forEach((obj) => {
      const r = obj.getBoundingRect();
      const offset = pos - (dir === 'horizontal' ? r.left : r.top);
      if (dir === 'horizontal') {
        obj.set({ left: obj.left! + offset } as any);
      } else {
        obj.set({ top: obj.top! + offset } as any);
      }
      obj.setCoords();
      pos += (dir === 'horizontal' ? r.width : r.height) + step;
    });
    canvas.requestRenderAll();
    saveHistory();
  }, [saveHistory]);

  // Free drawing toggle
  const toggleBold = useCallback(() => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj || !(obj instanceof fabric.IText)) return;
    const isBold = obj.fontWeight === 'bold';
    obj.set('fontWeight', isBold ? 'normal' : 'bold');
    fabricCanvasRef.current?.requestRenderAll();
  }, []);

  const toggleItalic = useCallback(() => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj || !(obj instanceof fabric.IText)) return;
    const isItalic = obj.fontStyle === 'italic';
    obj.set('fontStyle', isItalic ? 'normal' : 'italic');
    fabricCanvasRef.current?.requestRenderAll();
  }, []);

  const toggleUnderline = useCallback(() => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj || !(obj instanceof fabric.IText)) return;
    const isUnderline = obj.underline;
    obj.set('underline', !isUnderline);
    fabricCanvasRef.current?.requestRenderAll();
  }, []);

  const toggleBulletList = useCallback(() => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj || !(obj instanceof fabric.IText)) return;
    let text = obj.text || '';
    const lines = text.split('\n');
    const hasBullets = lines.every(l => l.startsWith('- '));
    text = hasBullets ? lines.map(l => l.slice(2)).join('\n') : lines.map(l => '- ' + l).join('\n');
    obj.set('text', text);
    fabricCanvasRef.current?.requestRenderAll();
  }, []);

  const toggleNumberedList = useCallback(() => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj || !(obj instanceof fabric.IText)) return;
    let text = obj.text || '';
    const lines = text.split('\n');
    const hasNumbers = lines.every((l, i) => l.startsWith((i + 1) + '. '));
    text = hasNumbers ? lines.map(l => l.replace(/^\d+\.\s*/, '')).join('\n') : lines.map((l, i) => (i + 1) + '. ' + l).join('\n');
    obj.set('text', text);
    fabricCanvasRef.current?.requestRenderAll();
  }, []);
  const brushSettingsRef = useRef({ color: '#000000', width: 5 });

  const toggleFreeDrawing = useCallback((brushColor?: string, brushWidth?: number) => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const wasDrawing = canvas.isDrawingMode;
    if (wasDrawing) {
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      setIsDrawingModeState(false);
      return;
    }
    if (brushColor !== undefined) brushSettingsRef.current.color = brushColor;
    if (brushWidth !== undefined) brushSettingsRef.current.width = brushWidth;
    setIsPanMode(false);
    canvas.selection = false;
    canvas.isDrawingMode = true;
    canvas.defaultCursor = 'crosshair';
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = brushSettingsRef.current.color;
    canvas.freeDrawingBrush.width = brushSettingsRef.current.width;
    setIsDrawingModeState(true);
  }, []);

  const setBrushColor = useCallback((color: string) => {
    brushSettingsRef.current.color = color;
    if (fabricCanvasRef.current?.freeDrawingBrush) {
      fabricCanvasRef.current.freeDrawingBrush.color = color;
    }
  }, []);

  const setBrushWidth = useCallback((width: number) => {
    brushSettingsRef.current.width = width;
    if (fabricCanvasRef.current?.freeDrawingBrush) {
      fabricCanvasRef.current.freeDrawingBrush.width = width;
    }
  }, []);

  const resizeCanvas = useCallback((width: number, height: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.setWidth(width);
    canvas.setHeight(height);
    const existingGrid = canvas.getObjects().filter(o => (o as any).data?.type === 'grid');
    if (existingGrid.length > 0) {
      existingGrid.forEach(o => canvas.remove(o));
      options.width = width;
      options.height = height;
      addGridLines();
    }
    canvas.requestRenderAll();
  }, [addGridLines]);

  const setCanvasBg = useCallback((color: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.backgroundColor = color;
    canvas.requestRenderAll();
    saveHistory();
  }, [saveHistory]);

  const uploadCanvasBg = useCallback((file: File) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const url = URL.createObjectURL(file);
    fabric.Image.fromURL(url).then((img) => {
      canvas.backgroundImage = img;
      img.scaleX = canvas.width! / img.width!;
      img.scaleY = canvas.height! / img.height!;
      canvas.requestRenderAll();
      saveHistory();
    });
  }, [saveHistory]);

  // Keyboard shortcuts
  const clipboardRef = useRef<string | null>(null);
  const activeToolRef_forShortcuts = activeToolRef;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const activeObj = canvas.getActiveObject();

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          deleteSelected();
          break;
        case 'z':
        case 'Z':
          if (ctrl) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
          break;
        case 'y':
        case 'Y':
          if (ctrl) { e.preventDefault(); redo(); }
          break;
        case 'c':
        case 'C':
          if (ctrl && activeObj) {
            e.preventDefault();
            clipboardRef.current = JSON.stringify(activeObj.toObject());
          }
          break;
        case 'v':
        case 'V':
          if (ctrl && clipboardRef.current) {
            e.preventDefault();
            try {
              const objData = JSON.parse(clipboardRef.current);
              (fabric as any).util.enlivenObjects([objData], (objects: fabric.FabricObject[]) => {
                objects.forEach(obj => {
                  obj.set({ left: (obj.left ?? 0) + 20, top: (obj.top ?? 0) + 20 });
                  canvas.add(obj);
                  canvas.setActiveObject(obj);
                });
                canvas.requestRenderAll();
                saveHistory();
              });
            } catch {}
          }
          break;
        case 'a':
        case 'A':
          if (ctrl) {
            e.preventDefault();
            const selectable = canvas.getObjects().filter(o => (o as any).evented !== false && (o as any).selectable !== false);
            if (selectable.length > 0) {
              canvas.discardActiveObject();
              const sel = new fabric.ActiveSelection(selectable, { canvas });
              canvas.setActiveObject(sel);
              canvas.requestRenderAll();
            }
          }
          break;
        case 'd':
        case 'D':
          if (ctrl && activeObj) {
            e.preventDefault();
            activeObj.clone().then((clone: fabric.Object) => {
              clone.set({ left: (clone.left ?? 0) + 20, top: (clone.top ?? 0) + 20 });
              canvas!.add(clone);
              canvas!.setActiveObject(clone);
              canvas!.requestRenderAll();
              saveHistory();
            });
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          nudgeSelected(0, e.shiftKey ? -10 : -1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          nudgeSelected(0, e.shiftKey ? 10 : 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nudgeSelected(e.shiftKey ? -10 : -1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          nudgeSelected(e.shiftKey ? 10 : 1, 0);
          break;
        case 'v':
        case 'V':
          if (!ctrl) { e.preventDefault(); setActiveTool('select'); }
          break;
        case 'r':
        case 'R':
          if (!ctrl) { e.preventDefault(); setActiveTool('rect'); }
          break;
        case 'c':
        case 'C':
          if (!ctrl) { e.preventDefault(); setActiveTool('circle'); }
          break;
        case 't':
        case 'T':
          if (!ctrl) { e.preventDefault(); addText(); }
          break;
        case 'l':
        case 'L':
          if (!ctrl) { e.preventDefault(); setActiveTool('line'); }
          break;
        case 'p':
        case 'P':
          if (!ctrl) { e.preventDefault(); setActiveTool('polygon'); }
          break;
        case 'g':
        case 'G':
          if (!ctrl) { e.preventDefault(); toggleGrid(); }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    };
  }, [deleteSelected, undo, redo, saveHistory, setActiveTool, addText, toggleGrid]);

  const nudgeSelected = useCallback((dx: number, dy: number) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObjects();
    if (!active || active.length === 0) return;
    active.forEach(obj => {
      obj.set({ left: snapToPixel((obj.left ?? 0) + dx), top: snapToPixel((obj.top ?? 0) + dy) } as any);
      obj.setCoords();
    });
    canvas?.requestRenderAll();
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => saveHistory(), 200);
  }, [saveHistory, snapToPixel]);

  // Layer panel support
  const getCanvasObjects = useCallback((): { obj: fabric.FabricObject; index: number }[] => {
    if (!fabricCanvasRef.current) return [];
    return fabricCanvasRef.current.getObjects().map((obj, index) => ({ obj, index }));
  }, []);

  const setLayerVisibility = useCallback((obj: fabric.FabricObject, visible: boolean) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (visible) {
      const saved = savedOpacityMap.current.get(obj) ?? 1;
      obj.set({ visible: true, opacity: saved, evented: true, selectable: true } as any);
    } else {
      savedOpacityMap.current.set(obj, obj.opacity ?? 1);
      obj.set({ visible: false, opacity: 0, evented: false, selectable: false } as any);
    }
    obj.setCoords();
    canvas.requestRenderAll();
    updateActiveProps();
  }, [updateActiveProps]);

  const selectObject = useCallback((obj: fabric.FabricObject) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
    updateActiveProps();
  }, [updateActiveProps]);

  const setLayerLock = useCallback((obj: fabric.FabricObject, locked: boolean) => {
    if (!fabricCanvasRef.current) return;
    obj.set({ selectable: !locked, evented: !locked, lockMovementX: locked, lockMovementY: locked, lockRotation: locked, lockScalingX: locked, lockScalingY: locked } as any);
    fabricCanvasRef.current.requestRenderAll();
  }, []);

  const { applyGradient, removeGradient } = useGradient();
  const { applyShadow, removeShadow } = useShadow();
  const { applyMask, removeMask } = useMask();
  const { isDrawing: isPenDrawing, startPath, addPoint, finishPath } = usePenTool();
  const { createTable } = useTable();
  const { animations, isPlaying, speed, setSpeed, setKeyframes, removeKeyframes, play, stop: stopAnimation } = useAnimation();
  const setArrowStyle = useCallback((style: string) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj || !(obj instanceof fabric.Group)) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.remove(obj);
    const b = obj.getBoundingRect();
    const newArrow = createArrow(b.left, b.top, b.width, b.height, style, { arrowStyle: style });
    if (newArrow) {
      canvas.add(newArrow);
      canvas.setActiveObject(newArrow);
      canvas.requestRenderAll();
      saveHistory();
    }
  }, [createArrow, saveHistory]);

  const reorderLayer = useCallback((obj: fabric.FabricObject, newIndex: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    const currentIndex = objects.indexOf(obj);
    if (currentIndex === -1 || currentIndex === newIndex) return;
    const clampedIndex = Math.max(0, Math.min(newIndex, objects.length - 1));
    canvas.moveObjectTo(obj, clampedIndex);
    canvas.requestRenderAll();
    saveHistory();
  }, [saveHistory]);

  // Export
  const exportToImage = useCallback((format: 'png' | 'jpeg' = 'png') => {
    if (!fabricCanvasRef.current) return null;
    return fabricCanvasRef.current.toDataURL({ format, quality: 1, multiplier: 2 });
  }, []);

  const exportToJson = useCallback(() => {
    return fabricCanvasRef.current?.toJSON();
  }, []);

  return {
    isReady,
    activeTool, setActiveTool,
    toggleFreeDrawing, addText, addImage,
    toggleGrid, isGridVisible,
    togglePan, isPanMode,
    zoomIn, zoomOut, zoomTo, zoomFit, zoomToSelection, zoomLevel,
    setFill, setStroke, setStrokeWidth, setOpacity,
    setPosition, setSize,
    setFontFamily, setFontSize, setFontWeight, setTextAlign, setTextContent,
    applyImageFilter,
    bringToFront, sendToBack, deleteSelected,
    groupSelection, ungroupSelection,
    alignSelected, distributeSelected,
    undo, redo, loadJson,
    exportToImage, exportToJson,
    activeProps, selectedObject,
    isDrawingMode, getCanvasObjects, selectObject,
    setBrushColor, setBrushWidth,
    setLayerVisibility, setLayerLock, reorderLayer,
    resizeCanvas, setCanvasBg, uploadCanvasBg, toggleAspectLock, setArrowStyle,
    getFabricCanvas: () => fabricCanvasRef.current,
    hoveredObject,
    toggleBold, toggleItalic, toggleUnderline, toggleBulletList, toggleNumberedList,
    applyGradient, removeGradient,
    applyShadow, removeShadow,
    applyMask, removeMask,
    isPenDrawing, startPath, addPoint, finishPath,
    createTable,
    animations, isPlaying, speed, setSpeed, setKeyframes, removeKeyframes, play, stopAnimation,
    useAsPattern,
    addImages, toggleGridSnap, gridSnap,
  };
};
