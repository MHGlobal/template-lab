'use client';

import { useCallback, useRef } from 'react';
import * as fabric from 'fabric';

interface HistoryOptions {
  maxHistory?: number;
}

interface HistoryCallbacks {
  addGridLines: () => void;
  updateActiveProps: () => void;
  isGridVisibleRef: React.RefObject<boolean>;
}

export function useEditorHistory(
  fabricCanvasRef: React.RefObject<fabric.Canvas | null>,
  options: HistoryOptions,
  callbacks: HistoryCallbacks,
) {
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isUndoingRedoRef = useRef(false);
  const MAX_HISTORY = options.maxHistory ?? 200;

  const getCanvasState = useCallback(() => {
    if (!fabricCanvasRef.current) return null;
    const json = fabricCanvasRef.current.toJSON();
    json.objects = json.objects.filter((o: any) => o.data?.type !== 'grid' && o.data?.temp !== true);
    return JSON.stringify(json);
  }, [fabricCanvasRef]);

  const saveHistory = useCallback(() => {
    if (isUndoingRedoRef.current) return;
    const state = getCanvasState();
    if (!state) return;
    undoStackRef.current.push(state);
    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, [getCanvasState]);

  const applyHistoryState = useCallback((state: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !state) return;
    canvas.loadFromJSON(state).then(() => {
      if (!fabricCanvasRef.current) return;
      fabricCanvasRef.current.requestRenderAll();
      if (callbacks.isGridVisibleRef.current) callbacks.addGridLines();
      callbacks.updateActiveProps();
    });
  }, [fabricCanvasRef, callbacks.addGridLines, callbacks.updateActiveProps, callbacks.isGridVisibleRef]);

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length < 2) return;
    isUndoingRedoRef.current = true;
    const currentState = getCanvasState();
    if (currentState) redoStackRef.current.push(currentState);
    const prevState = stack.pop()!;
    if (stack.length > 0) {
      const targetState = stack[stack.length - 1];
      applyHistoryState(targetState);
    }
    isUndoingRedoRef.current = false;
  }, [applyHistoryState, getCanvasState]);

  const redo = useCallback(() => {
    const redoStack = redoStackRef.current;
    if (redoStack.length === 0) return;
    isUndoingRedoRef.current = true;
    const currentState = getCanvasState();
    if (currentState) undoStackRef.current.push(currentState);
    const nextState = redoStack.pop()!;
    applyHistoryState(nextState);
    isUndoingRedoRef.current = false;
  }, [applyHistoryState, getCanvasState]);

  const loadJson = useCallback((json: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !json) return;
    if (!json.objects || !Array.isArray(json.objects)) {
      console.error('[Editor] JSON invÃ¡lido para loadFromJSON â€” falta array objects', json);
      return;
    }
    canvas.loadFromJSON(json).then(() => {
      if (!fabricCanvasRef.current) return;
      fabricCanvasRef.current.getObjects().forEach(obj => {
        (obj as any).data = (obj as any).data || {};
      });
      fabricCanvasRef.current.requestRenderAll();
      saveHistory();
      callbacks.updateActiveProps();
    });
  }, [fabricCanvasRef, saveHistory, callbacks.updateActiveProps]);

  return { saveHistory, undo, redo, loadJson, getCanvasState, undoStackRef, redoStackRef, isUndoingRedoRef };
}
