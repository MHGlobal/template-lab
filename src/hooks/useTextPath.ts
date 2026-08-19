'use client';

import { useCallback } from 'react';
import * as fabric from 'fabric';

export function useTextPath() {
  const applyTextPath = useCallback((textObj: fabric.IText, pathObj: fabric.Object) => {
    textObj.set('path', pathObj as any);
    textObj.set('pathSide', 'left');
    textObj.set('pathStartOffset', 0);
    return textObj;
  }, []);

  const removeTextPath = useCallback((textObj: fabric.IText) => {
    textObj.set('path', null);
    textObj.set('pathSide', null);
    textObj.set('pathStartOffset', null);
    return textObj;
  }, []);

  return { applyTextPath, removeTextPath };
}
