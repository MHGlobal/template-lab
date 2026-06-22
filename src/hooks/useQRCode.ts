'use client';

import { useCallback } from 'react';
import * as fabric from 'fabric';
import QRCode from 'qrcode';

export function useQRCode() {
  const generateQRCode = useCallback(async (text: string, canvas: fabric.Canvas, options?: Record<string, any>) => {
    const dataUrl = await QRCode.toDataURL(text, { width: 400, margin: 2, ...options });
    const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' });
    img.set({ left: 100, top: 100, scaleX: 1, scaleY: 1 });
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
  }, []);

  return { generateQRCode };
}
