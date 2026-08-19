'use client';

import { useCallback } from 'react';
import * as fabric from 'fabric';

export interface GradientDef {
  type: 'linear' | 'radial';
  angle: number;
  colorStops: { offset: number; color: string }[];
}

export function useGradient() {
  const applyGradient = useCallback((obj: fabric.FabricObject, def: GradientDef) => {
    const canvas = obj.canvas;
    const bbox = obj.getBoundingRect();
    const gradient: any = { type: def.type, coords: {} as any, colorStops: {} };
    if (def.type === 'linear') {
      const rad = (def.angle * Math.PI) / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const x1 = 0.5 - cos * 0.5, y1 = 0.5 - sin * 0.5;
      const x2 = 0.5 + cos * 0.5, y2 = 0.5 + sin * 0.5;
      gradient.coords = { x1, y1, x2, y2 };
    } else {
      gradient.coords = { r1: 0, r2: 0.5, x1: 0.5, y1: 0.5, x2: 0.5, y2: 0.5 };
    }
    def.colorStops.forEach(cs => { gradient.colorStops[cs.offset] = cs.color; });
    obj.set('fill', new fabric.Gradient(gradient));
    obj.set('fillType', 'gradient');
    canvas?.renderAll();
  }, []);

  const removeGradient = useCallback((obj: fabric.FabricObject) => {
    obj.set('fill', '#CCCCCC');
    obj.set('fillType', 'solid');
    obj.canvas?.renderAll();
  }, []);

  return { applyGradient, removeGradient };
}
