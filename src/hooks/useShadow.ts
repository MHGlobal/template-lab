'use client';

import { useCallback } from 'react';
import * as fabric from 'fabric';

export interface ShadowConfig {
  type: 'drop' | 'inner' | 'glow';
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  spread: number;
}

export function useShadow() {
  const applyShadow = useCallback((obj: fabric.FabricObject, config: ShadowConfig) => {
    const shadowOpts: any = {
      color: config.color,
      blur: config.blur,
      offsetX: config.type === 'glow' ? 0 : config.offsetX,
      offsetY: config.type === 'glow' ? 0 : config.offsetY,
      affectStroke: false,
      nonScaling: true,
    };
    obj.set('shadow', new fabric.Shadow(shadowOpts));
    obj.canvas?.renderAll();
  }, []);

  const removeShadow = useCallback((obj: fabric.FabricObject) => {
    obj.set('shadow', null);
    obj.canvas?.renderAll();
  }, []);

  return { applyShadow, removeShadow };
}
