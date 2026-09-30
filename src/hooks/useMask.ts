'use client';

import { useCallback } from 'react';
import * as fabric from 'fabric';

export function useMask() {
  const applyMask = useCallback((obj: fabric.FabricObject, shape: 'rect' | 'circle' | 'polygon') => {
    const bbox = obj.getBoundingRect();
    let clipPath: fabric.Object;
    if (shape === 'circle') {
      clipPath = new fabric.Ellipse({
        left: 0, top: 0, rx: bbox.width * obj.scaleX / 2, ry: bbox.height * obj.scaleY / 2,
        originX: 'center', originY: 'center',
      });
    } else {
      clipPath = new fabric.Rect({
        left: 0, top: 0, width: bbox.width * obj.scaleX, height: bbox.height * obj.scaleY,
        rx: shape === 'polygon' ? 0 : 0,
      });
    }
    obj.set('clipPath', clipPath);
    obj.set('dirty', true);
    obj.canvas?.renderAll();
  }, []);

  const removeMask = useCallback((obj: fabric.FabricObject) => {
    obj.set('clipPath', null);
    obj.set('dirty', true);
    obj.canvas?.renderAll();
  }, []);

  return { applyMask, removeMask };
}
