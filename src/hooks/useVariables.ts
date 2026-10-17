'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import * as fabric from 'fabric';

export interface Variable {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'number' | 'date';
}

const VARIABLE_REGEX = /\{\{(\w+)\}\}/g;

export function useVariables(getCanvas: () => fabric.Canvas | null) {
  const [variables, setVariables] = useState<Variable[]>([]);
  const saveRef = useRef<Map<string, string>>(new Map());

  const scanVariables = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const keys = new Set<string>();
    canvas.getObjects().forEach(obj => {
      if (obj instanceof fabric.IText) {
        let m: RegExpExecArray | null;
        const text = obj.text || '';
        VARIABLE_REGEX.lastIndex = 0;
        while ((m = VARIABLE_REGEX.exec(text)) !== null) {
          keys.add(m[1]);
        }
      }
    });
    setVariables(prev => {
      const existing = new Map(prev.map(v => [v.key, v]));
      return Array.from(keys).map(key => existing.get(key) || { key, label: key.replace(/_/g, ' '), value: '', type: 'text' as const });
    });
  }, [getCanvas]);

  const previewVariables = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    canvas.getObjects().forEach(obj => {
      if (obj instanceof fabric.IText) {
        saveRef.current.set((obj as any).data?.id || (obj as any).objectId || '', obj.text || '');
        let text = obj.text || '';
        variables.forEach(v => { text = text.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), v.value || v.key); });
        obj.set('text', text);
      }
    });
    canvas.renderAll();
  }, [getCanvas, variables]);

  const applyVariables = useCallback(() => {
    previewVariables();
    saveRef.current.clear();
    scanVariables();
  }, [previewVariables, scanVariables]);

  const restoreVariables = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    canvas.getObjects().forEach(obj => {
      if (obj instanceof fabric.IText) {
        const saved = saveRef.current.get((obj as any).data?.id || (obj as any).objectId || '');
        if (saved) obj.set('text', saved);
      }
    });
    canvas.renderAll();
    scanVariables();
  }, [getCanvas, scanVariables]);

  const updateVariable = useCallback((key: string, value: string) => {
    setVariables(prev => prev.map(v => v.key === key ? { ...v, value } : v));
  }, []);

  return { variables, scanVariables, updateVariable, previewVariables, applyVariables, restoreVariables };
}
