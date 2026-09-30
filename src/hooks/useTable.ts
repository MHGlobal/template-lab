'use client';

import { useCallback } from 'react';
import * as fabric from 'fabric';

export function useTable() {
  const createTable = useCallback((canvas: fabric.Canvas, rows: number, cols: number) => {
    const cellW = 100, cellH = 40, gap = 2;
    const rects: fabric.Rect[] = [];
    const cellTexts: fabric.IText[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * (cellW + gap), y = r * (cellH + gap);
        const rect = new fabric.Rect({
          left: x, top: y, width: cellW, height: cellH,
          fill: '#FFFFFF', stroke: '#CCCCCC', strokeWidth: 1, strokeUniform: true,
        });
        rects.push(rect);
        const text = new fabric.IText('', {
          left: x + 4, top: y + 4, fontSize: 12, fill: '#333', width: cellW - 8,
        });
        cellTexts.push(text);
      }
    }
    const group = new fabric.Group([...rects, ...cellTexts], {
      left: 100, top: 100,
    });
    (group as any).data = { table: { rows, cols, cellW, cellH } };
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
    return group;
  }, []);

  return { createTable };
}
