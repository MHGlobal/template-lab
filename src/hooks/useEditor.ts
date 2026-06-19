'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import * as fabric from 'fabric';

export interface EditorOptions {
  width: number;
  height: number;
}

export interface ActiveObjectProps {
  id: string | null;
  type: 'rect' | 'circle' | 'triangle' | 'line' | 'polygon' | 'i-text' | 'image' | 'group' | null;
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

export const useEditor = (canvasRef: React.RefObject<HTMLCanvasElement>, options: EditorOptions) => {
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanMode, setIsPanMode] = useState(false);
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [isDrawingMode, setIsDrawingModeState] = useState(false);
  const [activeProps, setActiveProps] = useState<ActiveObjectProps | null>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.FabricObject | null>(null);

  const isInternalUpdate = useRef(false);

  const saveHistory = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const canvasJson = JSON.stringify(fabricCanvasRef.current.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, canvasJson];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const captureHistory = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const state = JSON.stringify(fabricCanvasRef.current.toJSON());
    setHistory([state]);
    setHistoryIndex(0);
  }, []);

  const extractObjectProps = useCallback((obj: fabric.FabricObject | null): ActiveObjectProps | null => {
    if (!obj) return null;

    const getType = (): ActiveObjectProps['type'] => {
      if (obj instanceof fabric.Rect) return 'rect';
      if (obj instanceof fabric.Circle) return 'circle';
      if (obj instanceof fabric.Triangle) return 'triangle';
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

    canvas.on('object:modified', () => {
      saveHistory();
      updateActiveProps();
    });
    canvas.on('object:added', () => {
      saveHistory();
      updateActiveProps();
    });
    canvas.on('object:removed', () => {
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

    return () => {
      canvas.dispose();
    };
  }, [canvasRef, options.width, options.height, saveHistory, captureHistory, updateActiveProps]);

  // Shapes
  const addRect = useCallback(() => {
    const rect = new fabric.Rect({
      left: 100, top: 100, fill: '#4F46E5',
      width: 100, height: 100, stroke: '#000000', strokeWidth: 0,
    });
    fabricCanvasRef.current?.add(rect);
    fabricCanvasRef.current?.setActiveObject(rect);
  }, []);

  const addCircle = useCallback(() => {
    const circle = new fabric.Circle({
      left: 150, top: 150, fill: '#EC4899',
      radius: 50, stroke: '#000000', strokeWidth: 0,
    });
    fabricCanvasRef.current?.add(circle);
    fabricCanvasRef.current?.setActiveObject(circle);
  }, []);

  const addTriangle = useCallback(() => {
    const triangle = new fabric.Triangle({
      left: 100, top: 100, fill: '#F59E0B',
      width: 100, height: 100, stroke: '#000000', strokeWidth: 0,
    });
    fabricCanvasRef.current?.add(triangle);
    fabricCanvasRef.current?.setActiveObject(triangle);
  }, []);

  const addLine = useCallback(() => {
    const line = new fabric.Line([50, 100, 250, 100], {
      left: 50, top: 100, stroke: '#10B981',
      strokeWidth: 4, hasBorders: false,
    });
    fabricCanvasRef.current?.add(line);
    fabricCanvasRef.current?.setActiveObject(line);
  }, []);

  const addPolygon = useCallback(() => {
    const poly = new fabric.Polygon([
      { x: 100, y: 50 }, { x: 200, y: 50 },
      { x: 250, y: 150 }, { x: 200, y: 250 },
      { x: 100, y: 250 }, { x: 50, y: 150 },
    ], { fill: '#8B5CF6', stroke: '#000000', strokeWidth: 0, left: 50, top: 50 });
    fabricCanvasRef.current?.add(poly);
    fabricCanvasRef.current?.setActiveObject(poly);
  }, []);

  const addStar = useCallback(() => {
    const points: fabric.XY[] = [];
    const outerR = 60, innerR = 25, spikes = 5;
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI / spikes) * i - Math.PI / 2;
      points.push({ x: 100 + radius * Math.cos(angle), y: 100 + radius * Math.sin(angle) });
    }
    const star = new fabric.Polygon(points, {
      fill: '#EF4444', stroke: '#000000', strokeWidth: 0,
      left: 50, top: 50,
    });
    fabricCanvasRef.current?.add(star);
    fabricCanvasRef.current?.setActiveObject(star);
  }, []);

  const toggleFreeDrawing = useCallback((brushColor = '#000000', brushWidth = 5) => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.isDrawingMode = !fabricCanvasRef.current.isDrawingMode;
    if (fabricCanvasRef.current.isDrawingMode) {
      fabricCanvasRef.current.freeDrawingBrush = new fabric.PencilBrush(fabricCanvasRef.current);
      fabricCanvasRef.current.freeDrawingBrush.color = brushColor;
      fabricCanvasRef.current.freeDrawingBrush.width = brushWidth;
    }
    setIsDrawingModeState(fabricCanvasRef.current.isDrawingMode);
  }, []);

  const addText = useCallback((text = 'Novo Texto') => {
    const iText = new fabric.IText(text, {
      left: 100, top: 100, fontFamily: 'Inter',
      fontSize: 24, fill: '#1F2937',
    });
    fabricCanvasRef.current?.add(iText);
    fabricCanvasRef.current?.setActiveObject(iText);
  }, []);

  const addImage = useCallback((url: string) => {
    (fabric.Image.fromURL as any)(url, (img: any) => {
      img.scaleToWidth(200);
      fabricCanvasRef.current?.add(img);
      fabricCanvasRef.current?.setActiveObject(img);
    }, { crossOrigin: 'anonymous' });
  }, []);

  // Grid
  const toggleGrid = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    setIsGridVisible(prev => {
      const newVal = !prev;
      const canvas = fabricCanvasRef.current!;
      const gridLines = canvas.getObjects().filter(o => (o as any).data?.type === 'grid');
      if (newVal) {
        const size = 20;
        const w = canvas.width ?? options.width;
        const h = canvas.height ?? options.height;
        for (let x = 0; x < w; x += size) {
          const line = new fabric.Line([x, 0, x, h], {
            stroke: '#E5E7EB', strokeWidth: 0.5, selectable: false,
            evented: false, data: { type: 'grid' },
          });
          canvas.add(line);
          (line as any).sendToBack();
        }
        for (let y = 0; y < h; y += size) {
          const line = new fabric.Line([0, y, w, y], {
            stroke: '#E5E7EB', strokeWidth: 0.5, selectable: false,
            evented: false, data: { type: 'grid' },
          });
          canvas.add(line);
          (line as any).sendToBack();
        }
      } else {
        gridLines.forEach(obj => canvas.remove(obj));
      }
      canvas.renderAll();
      return newVal;
    });
  }, [options.width, options.height]);

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

  // Layer management
  const bringToFront = useCallback(() => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (obj) {
      (obj as any).bringToFront();
      fabricCanvasRef.current?.renderAll();
    }
  }, []);

  const sendToBack = useCallback(() => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (obj) {
      (obj as any).sendToBack();
      fabricCanvasRef.current?.renderAll();
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

  // Undo / Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const state = history[prevIndex];
      fabricCanvasRef.current?.loadFromJSON(state, () => {
        fabricCanvasRef.current?.renderAll();
        setHistoryIndex(prevIndex);
        updateActiveProps();
      });
    }
  }, [history, historyIndex, updateActiveProps]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const state = history[nextIndex];
      fabricCanvasRef.current?.loadFromJSON(state, () => {
        fabricCanvasRef.current?.renderAll();
        setHistoryIndex(nextIndex);
        updateActiveProps();
      });
    }
  }, [history, historyIndex, updateActiveProps]);

  const loadJson = useCallback((json: any) => {
    if (!fabricCanvasRef.current || !json) return;
    fabricCanvasRef.current.loadFromJSON(json, () => {
      fabricCanvasRef.current?.renderAll();
      captureHistory();
      updateActiveProps();
    });
  }, [captureHistory, updateActiveProps]);

  // Zoom
  const zoomIn = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const newZoom = Math.min(zoomLevel * 1.2, 4);
    applyZoom(newZoom);
  }, [zoomLevel]);

  const zoomOut = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const newZoom = Math.max(zoomLevel / 1.2, 0.1);
    applyZoom(newZoom);
  }, [zoomLevel]);

  const zoomTo = useCallback((value: number) => {
    applyZoom(value / 100);
  }, []);

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
  }, [zoomLevel, options]);

  const togglePan = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    setIsPanMode(prev => {
      const newVal = !prev;
      fabricCanvasRef.current!.selection = !newVal;
      fabricCanvasRef.current!.defaultCursor = newVal ? 'grab' : 'default';
      if (newVal) {
        fabricCanvasRef.current!.on('mouse:down', panMouseDown);
        fabricCanvasRef.current!.on('mouse:move', panMouseMove);
        fabricCanvasRef.current!.on('mouse:up', panMouseUp);
      } else {
        fabricCanvasRef.current!.off('mouse:down', panMouseDown);
        fabricCanvasRef.current!.off('mouse:move', panMouseMove);
        fabricCanvasRef.current!.off('mouse:up', panMouseUp);
      }
      return newVal;
    });
  }, []);

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
  }, []);
  const panMouseUp = useCallback(() => {
    panStart.current = null;
  }, []);

  const applyZoom = useCallback((zoom: number) => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const clamped = Math.max(0.1, Math.min(4, zoom));
    const center = canvas.getCenterPoint();
    canvas.zoomToPoint(center, clamped);
    canvas.requestRenderAll();
    setZoomLevel(clamped);
  }, []);

  // Export
  const exportToImage = useCallback((format: 'png' | 'jpeg' = 'png') => {
    if (!fabricCanvasRef.current) return null;
    return fabricCanvasRef.current.toDataURL({ format, quality: 1, multiplier: 2 });
  }, []);

  const exportToJson = useCallback(() => {
    return fabricCanvasRef.current?.toJSON();
  }, []);

  return {
    addRect, addCircle, addTriangle, addLine, addPolygon, addStar,
    toggleFreeDrawing, addText, addImage,
    toggleGrid, isGridVisible,
    togglePan, isPanMode,
    zoomIn, zoomOut, zoomTo, zoomFit, zoomLevel,
    setFill, setStroke, setStrokeWidth, setOpacity,
    setPosition, setSize,
    setFontFamily, setFontSize, setFontWeight, setTextAlign, setTextContent,
    applyImageFilter,
    bringToFront, sendToBack, deleteSelected,
    undo, redo, loadJson,
    exportToImage, exportToJson,
    activeProps, selectedObject,
    isDrawingMode,
  };
};
