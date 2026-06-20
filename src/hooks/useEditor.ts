'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import * as fabric from 'fabric';

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
}

export type ToolId = 'select' | 'rect' | 'circle' | 'triangle' | 'ellipse' | 'line' | 'polygon' | 'star' | 'arrow' | 'rounded-rect';

export const useEditor = (canvasRef: React.RefObject<HTMLCanvasElement>, options: EditorOptions) => {
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const [isReady, setIsReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanMode, setIsPanMode] = useState(false);
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [isDrawingMode, setIsDrawingModeState] = useState(false);
  const [activeProps, setActiveProps] = useState<ActiveObjectProps | null>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.FabricObject | null>(null);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const [activeTool, setActiveToolState] = useState<ToolId>('select');
  const activeToolRef = useRef(activeTool);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  const placementAnchor = useRef<{ x: number; y: number } | null>(null);
  const placementPreview = useRef<fabric.FabricObject | null>(null);
  const isPlacingRef = useRef(false);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isInternalUpdate = useRef(false);
  const isGridVisibleRef = useRef(isGridVisible);
  useEffect(() => { isGridVisibleRef.current = isGridVisible; }, [isGridVisible]);

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

  const MAX_HISTORY = options.maxHistory ?? 50;

  const getCanvasState = useCallback(() => {
    if (!fabricCanvasRef.current) return null;
    const json = fabricCanvasRef.current.toJSON();
    json.objects = json.objects.filter((o: any) => o.data?.type !== 'grid');
    return JSON.stringify(json);
  }, []);

  const captureHistory = useCallback(() => {
    const state = getCanvasState();
    if (!state) return;
    const idx = historyIndexRef.current;
    historyRef.current.length = idx + 1;
    historyRef.current[idx + 1] = state;
    historyIndexRef.current = idx + 1;
  }, [getCanvasState]);

  const saveHistory = useCallback(() => {
    const state = getCanvasState();
    if (!state) return;
    const idx = historyIndexRef.current;
    historyRef.current.length = idx + 1;
    historyRef.current[idx + 1] = state;
    historyIndexRef.current = idx + 1;
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, [getCanvasState]);

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
    canvas.renderAll();
  }, [options.width, options.height]);

  // Shape factory
  const createShape = useCallback((tool: ToolId, left: number, top: number, width: number, height: number): fabric.FabricObject | null => {
    const absW = Math.abs(width);
    const absH = Math.abs(height);
    const x = width >= 0 ? left : left + width;
    const y = height >= 0 ? top : top + height;

    const colors: Record<string, string> = {
      rect: '#4F46E5', circle: '#EC4899', triangle: '#F59E0B',
      ellipse: '#8B5CF6', 'rounded-rect': '#06B6D4', arrow: '#10B981', star: '#EF4444',
    };

    switch (tool) {
      case 'rect':
        return new fabric.Rect({ left: x, top: y, width: absW, height: absH, fill: colors.rect, stroke: '#000000', strokeWidth: 0 });
      case 'rounded-rect':
        return new fabric.Rect({ left: x, top: y, width: absW, height: absH, rx: 12, ry: 12, fill: colors['rounded-rect'], stroke: '#000000', strokeWidth: 0 });
      case 'circle':
        return new fabric.Circle({ left: x, top: y, radius: Math.max(absW, absH) / 2, fill: colors.circle, stroke: '#000000', strokeWidth: 0 });
      case 'ellipse':
        return new fabric.Ellipse({ left: x, top: y, rx: absW / 2, ry: absH / 2, fill: colors.ellipse, stroke: '#000000', strokeWidth: 0 });
      case 'triangle':
        return new fabric.Triangle({ left: x, top: y, width: absW, height: absH, fill: colors.triangle, stroke: '#000000', strokeWidth: 0 });
      case 'line':
        return new fabric.Line([0, 0, absW, absH], { left: x, top: y, stroke: '#10B981', strokeWidth: 4, hasBorders: true });
      case 'arrow': {
        const len = Math.sqrt(absW * absW + absH * absH);
        if (len < 10) return null;
        const angle = Math.atan2(height, width);
        const headSize = Math.min(20, len * 0.3);
        const arrow = new fabric.Group([
          new fabric.Line([0, 0, absW, absH], { stroke: colors.arrow, strokeWidth: 4 }),
          new fabric.Triangle({
            left: absW, top: absH, width: headSize, height: headSize * 0.6,
            fill: colors.arrow, angle: 0, originX: 'center', originY: 'center',
          }),
        ], { left: x, top: y });
        const head = arrow.item(1) as fabric.Triangle;
        head.set({ angle: (angle * 180 / Math.PI) + 90 });
        return arrow;
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
        return new fabric.Polygon(points, { left: x, top: y, fill: colors.star, stroke: '#000000', strokeWidth: 0, data: { isStar: true } } as any);
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
        return new fabric.Polygon(pts, { left: x, top: y, fill: '#8B5CF6', stroke: '#000000', strokeWidth: 0 });
      }
      default:
        return null;
    }
  }, []);

  // Set active tool (placement mode)
  const setActiveTool = useCallback((tool: ToolId) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    setActiveToolState(tool);
    if (tool === 'select') {
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.isDrawingMode = false;
      setIsDrawingModeState(false);
    } else {
      canvas.selection = false;
      canvas.discardActiveObject();
      canvas.defaultCursor = 'crosshair';
      canvas.renderAll();
    }
  }, []);

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
      canvas.renderAll();
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
    canvas.renderAll();
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
      canvas.renderAll();
      isPlacingRef.current = false;
      return;
    }
    preview.set({ selectable: true, evented: true, opacity: 1 } as any);
    canvas.add(preview);
    canvas.setActiveObject(preview);
    canvas.renderAll();
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
    canvas.renderAll();
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
    canvas.renderAll();
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
      canvas.renderAll();
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
    canvas.renderAll();
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
    });

    fabricCanvasRef.current = canvas;
    captureHistory();
    canvas.renderAll();
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
    canvas.on('selection:created', updateActiveProps);
    canvas.on('selection:updated', updateActiveProps);
    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
      setActiveProps(null);
    });
    canvas.on('object:moving', updateActiveProps);
    canvas.on('object:scaling', updateActiveProps);
    canvas.on('object:rotating', updateActiveProps);

    // Placement events (use ref to avoid stale closure)
    canvas.on('mouse:down', (opt) => {
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

    return () => {
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

  const addImage = useCallback((url: string) => {
    const isBlob = url.startsWith('blob:');
    const opts = isBlob ? undefined : { crossOrigin: 'anonymous' as const };
    const promise = fabric.Image.fromURL(url, opts);
    if (promise && typeof promise.then === 'function') {
      (promise as Promise<fabric.Image>).then((img: fabric.Image) => {
        img.scaleToWidth(200);
        fabricCanvasRef.current?.add(img);
        fabricCanvasRef.current?.setActiveObject(img);
        saveHistory();
      }).catch((err: any) => {
        console.error('[Editor] Erro ao carregar imagem:', err);
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const fallback = new fabric.Rect({
          left: 100, top: 100, width: 200, height: 200,
          fill: '#E5E7EB', stroke: '#9CA3AF', strokeWidth: 2, rx: 8, ry: 8,
        });
        const icon = new fabric.IText('🖼', {
          left: 175, top: 155, fontSize: 48, selectable: false, evented: false,
        });
        const label = new fabric.IText('Imagem não carregada', {
          left: 120, top: 220, fontSize: 12, fill: '#6B7280',
          fontFamily: 'Inter', selectable: false, evented: false,
        });
        canvas.add(fallback, icon, label);
        const group = new fabric.Group([fallback, icon, label], { left: 100, top: 100 });
        canvas.remove(fallback, icon, label);
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.renderAll();
        saveHistory();
      });
    }
  }, [saveHistory]);

  // Grid
  const toggleGrid = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const gridLines = canvas.getObjects().filter(o => (o as any).data?.type === 'grid');
    if (gridLines.length > 0) {
      gridLines.forEach(obj => canvas.remove(obj));
      canvas.renderAll();
      setIsGridVisible(false);
    } else {
      addGridLines();
      setIsGridVisible(true);
    }
  }, [addGridLines]);

  // Selection & Properties
  const setFill = useCallback((color: string) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj) return;
    isInternalUpdate.current = true;
    obj.set({ fill: color } as any);
    obj.setCoords();
    fabricCanvasRef.current?.renderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setStroke = useCallback((color: string) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj) return;
    isInternalUpdate.current = true;
    obj.set({ stroke: color } as any);
    obj.setCoords();
    fabricCanvasRef.current?.renderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setStrokeWidth = useCallback((width: number) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj) return;
    isInternalUpdate.current = true;
    obj.set({ strokeWidth: width } as any);
    obj.setCoords();
    fabricCanvasRef.current?.renderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setOpacity = useCallback((value: number) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj) return;
    isInternalUpdate.current = true;
    obj.set({ opacity: value } as any);
    obj.setCoords();
    fabricCanvasRef.current?.renderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setPosition = useCallback((left: number, top: number) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj) return;
    isInternalUpdate.current = true;
    obj.set({ left, top } as any);
    obj.setCoords();
    fabricCanvasRef.current?.renderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setSize = useCallback((width: number, height: number) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj) return;
    isInternalUpdate.current = true;
    if (obj instanceof fabric.Line) {
      const center = obj.getCenterPoint();
      const halfW = width / 2;
      obj.set({ x1: center.x - halfW, y1: center.y, x2: center.x + halfW, y2: center.y } as any);
    } else if (obj instanceof fabric.Circle) {
      obj.set({ radius: Math.min(width, height) / 2, scaleX: 1, scaleY: 1 } as any);
    } else if (obj instanceof fabric.Ellipse) {
      obj.set({ rx: width / 2, ry: height / 2, scaleX: 1, scaleY: 1 } as any);
    } else {
      const sx = width / (obj.width ?? 1);
      const sy = height / (obj.height ?? 1);
      obj.set({ scaleX: sx, scaleY: sy } as any);
    }
    obj.setCoords();
    fabricCanvasRef.current?.renderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setFontFamily = useCallback((fontFamily: string) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!(obj instanceof fabric.IText)) return;
    isInternalUpdate.current = true;
    obj.set({ fontFamily } as any);
    obj.setCoords();
    fabricCanvasRef.current?.renderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setFontSize = useCallback((fontSize: number) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!(obj instanceof fabric.IText)) return;
    isInternalUpdate.current = true;
    obj.set({ fontSize } as any);
    obj.setCoords();
    fabricCanvasRef.current?.renderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setFontWeight = useCallback((fontWeight: string) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!(obj instanceof fabric.IText)) return;
    isInternalUpdate.current = true;
    obj.set({ fontWeight } as any);
    obj.setCoords();
    fabricCanvasRef.current?.renderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setTextAlign = useCallback((textAlign: string) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!(obj instanceof fabric.IText)) return;
    isInternalUpdate.current = true;
    obj.set({ textAlign } as any);
    obj.setCoords();
    fabricCanvasRef.current?.renderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  const setTextContent = useCallback((text: string) => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!(obj instanceof fabric.IText)) return;
    isInternalUpdate.current = true;
    obj.set({ text } as any);
    obj.setCoords();
    fabricCanvasRef.current?.renderAll();
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
    fabricCanvasRef.current?.renderAll();
    updateActiveProps();
    isInternalUpdate.current = false;
  }, [updateActiveProps]);

  // Layer management (Fabric.js v6: canvas-level methods, untyped)
  const bringToFront = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (canvas && obj) {
      (canvas as any).bringToFront(obj);
      canvas.renderAll();
    }
  }, []);

  const sendToBack = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (canvas && obj) {
      (canvas as any).sendToBack(obj);
      canvas.renderAll();
    }
  }, []);

  const deleteSelected = useCallback(() => {
    const activeObjects = fabricCanvasRef.current?.getActiveObjects();
    if (activeObjects) {
      fabricCanvasRef.current?.discardActiveObject();
      activeObjects.forEach((obj) => fabricCanvasRef.current?.remove(obj));
      fabricCanvasRef.current?.renderAll();
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
    canvas.renderAll();
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
    canvas.renderAll();
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
    canvas.renderAll();
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
    canvas.renderAll();
    saveHistory();
  }, [saveHistory]);

  // Free drawing toggle
  const toggleFreeDrawing = useCallback((brushColor = '#000000', brushWidth = 5) => {
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
    // Exit pan mode if active
    setIsPanMode(false);
    canvas.selection = false;
    canvas.isDrawingMode = true;
    canvas.defaultCursor = 'crosshair';
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = brushColor;
    canvas.freeDrawingBrush.width = brushWidth;
    setIsDrawingModeState(true);
  }, []);

  // Undo / Redo
  const applyHistoryState = useCallback((state: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !state) return;
    canvas.loadFromJSON(state).then(() => {
      if (!fabricCanvasRef.current) return;
      fabricCanvasRef.current.renderAll();
      if (isGridVisibleRef.current) addGridLines();
      updateActiveProps();
    });
  }, [addGridLines, updateActiveProps]);

  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx > 0) {
      const prevIndex = idx - 1;
      const state = historyRef.current[prevIndex];
      if (!state) return;
      applyHistoryState(state);
      historyIndexRef.current = prevIndex;
    }
  }, [applyHistoryState]);

  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx < historyRef.current.length - 1) {
      const nextIndex = idx + 1;
      const state = historyRef.current[nextIndex];
      if (!state) return;
      applyHistoryState(state);
      historyIndexRef.current = nextIndex;
    }
  }, [applyHistoryState]);

  const loadJson = useCallback((json: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !json) return;
    if (!json.objects || !Array.isArray(json.objects)) {
      console.error('[Editor] JSON inválido para loadFromJSON — falta array objects', json);
      return;
    }
    canvas.loadFromJSON(json).then(() => {
      if (!fabricCanvasRef.current) return;
      captureHistory();
      updateActiveProps();
    });
  }, [captureHistory, updateActiveProps]);

  // Zoom
  const applyZoom = useCallback((zoom: number) => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const clamped = Math.max(0.1, Math.min(4, zoom));
    const center = canvas.getCenterPoint();
    canvas.zoomToPoint(center, clamped);
    canvas.requestRenderAll();
    setZoomLevel(clamped);
  }, []);

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
    const vpt = canvas.viewportTransform;
    if (!vpt) return;
    const objects = canvas.getObjects().filter(o => (o as any).data?.type !== 'grid');
    if (objects.length === 0) {
      zoomTo(100);
      return;
    }
    const bounds = objects.reduce((acc, obj) => {
      const coords = obj.getBoundingRect();
      return {
        minX: Math.min(acc.minX, coords.left),
        minY: Math.min(acc.minY, coords.top),
        maxX: Math.max(acc.maxX, coords.left + coords.width),
        maxY: Math.max(acc.maxY, coords.top + coords.height),
      };
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    const objW = bounds.maxX - bounds.minX;
    const objH = bounds.maxY - bounds.minY;
    if (objW <= 0 || objH <= 0) { zoomTo(100); return; }
    const scaleX = (canvas.width ?? options.width) / objW;
    const scaleY = (canvas.height ?? options.height) / objH;
    const scale = Math.min(scaleX, scaleY, 1) * 0.9;
    applyZoom(scale);
    canvas.absolutePan(new fabric.Point(
      -(bounds.minX * scale) + ((canvas.width ?? options.width) - objW * scale) / 2,
      -(bounds.minY * scale) + ((canvas.height ?? options.height) - objH * scale) / 2,
    ));
  }, [options, applyZoom, zoomTo]);

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
      // Exit drawing mode if active
      if (canvas.isDrawingMode) {
        canvas.isDrawingMode = false;
        setIsDrawingModeState(false);
      }
      setActiveTool('select');
      canvas.selection = false;
      canvas.defaultCursor = 'grab';
      canvas.on('mouse:down', panMouseDown);
      canvas.on('mouse:move', panMouseMove);
      canvas.on('mouse:up', panMouseUp);
      setIsPanMode(true);
    }
  }, [isPanMode, setActiveTool]);

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
  }, []);
  const panMouseUp = useCallback(() => {
    panStart.current = null;
  }, []);

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
                canvas.renderAll();
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
              canvas.renderAll();
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
              canvas!.renderAll();
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    };
  }, [deleteSelected, undo, redo, saveHistory]);

  const nudgeSelected = useCallback((dx: number, dy: number) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObjects();
    if (!active || active.length === 0) return;
    active.forEach(obj => {
      obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy } as any);
      obj.setCoords();
    });
    canvas?.renderAll();
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => saveHistory(), 200);
  }, [saveHistory]);

  // Layer panel support
  const getCanvasObjects = useCallback((): { obj: fabric.FabricObject; index: number }[] => {
    if (!fabricCanvasRef.current) return [];
    return fabricCanvasRef.current.getObjects().map((obj, index) => ({ obj, index }));
  }, []);

  const setLayerVisibility = useCallback((obj: fabric.FabricObject, visible: boolean) => {
    if (!fabricCanvasRef.current) return;
    obj.set({ visible, opacity: visible ? (obj as any)._savedOpacity || 1 : 0 });
    if (!visible) (obj as any)._savedOpacity = obj.opacity;
    fabricCanvasRef.current.renderAll();
  }, []);

  const selectObject = useCallback((obj: fabric.FabricObject) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.setActiveObject(obj);
    canvas.renderAll();
    updateActiveProps();
  }, [updateActiveProps]);

  const setLayerLock = useCallback((obj: fabric.FabricObject, locked: boolean) => {
    if (!fabricCanvasRef.current) return;
    obj.set({ selectable: !locked, evented: !locked, lockMovementX: locked, lockMovementY: locked, lockRotation: locked, lockScalingX: locked, lockScalingY: locked } as any);
    fabricCanvasRef.current.renderAll();
  }, []);

  const reorderLayer = useCallback((obj: fabric.FabricObject, newIndex: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    const currentIndex = objects.indexOf(obj);
    if (currentIndex === -1 || currentIndex === newIndex) return;
    const delta = Math.abs(currentIndex - newIndex);
    for (let i = 0; i < delta; i++) {
      if (newIndex < currentIndex) {
        canvas.sendObjectBackwards(obj);
      } else {
        canvas.bringObjectForward(obj);
      }
    }
    canvas.renderAll();
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
    zoomIn, zoomOut, zoomTo, zoomFit, zoomLevel,
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
    setLayerVisibility, setLayerLock, reorderLayer,
  };
};
