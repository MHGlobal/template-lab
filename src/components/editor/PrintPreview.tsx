'use client';

import React, { useRef, useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface PrintPreviewProps {
  canvasJson: any;
  canvasWidth: number;
  canvasHeight: number;
  onClose: () => void;
}

export default function PrintPreview({ canvasJson, canvasWidth, canvasHeight, onClose }: PrintPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const fabricRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fabric = await import('fabric');
      fabricRef.current = fabric;
      if (cancelled || !canvasRef.current) return;
      const c = new fabric.Canvas(canvasRef.current, {
        width: canvasWidth, height: canvasHeight,
        selection: false, backgroundColor: '#ffffff',
      });
      if (canvasJson?.objects) {
        await c.loadFromJSON(canvasJson);
        c.renderAll();
      }
      return () => c.dispose();
    })();
    return () => { cancelled = true; };
  }, [canvasJson, canvasWidth, canvasHeight]);

  const handleExportPNG = () => {
    const fabric = fabricRef.current;
    if (!fabric || !canvasRef.current) return;
    const c = new fabric.Canvas(canvasRef.current, { width: canvasWidth, height: canvasHeight, backgroundColor: '#ffffff' });
    if (canvasJson?.objects) {
      c.loadFromJSON(canvasJson).then(() => {
        c.renderAll();
        const link = document.createElement('a');
        link.download = 'preview.png';
        link.href = c.toDataURL({ format: 'png', multiplier: 2 });
        link.click();
        c.dispose();
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl max-w-[90vw] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-sm">Print Preview</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setZoom(p => Math.max(0.25, p - 0.25))} className="p-1.5 hover:bg-gray-100 rounded-lg"><ZoomOut className="w-4 h-4" /></button>
            <span className="text-xs font-bold w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(p => Math.min(3, p + 0.25))} className="p-1.5 hover:bg-gray-100 rounded-lg"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={handleExportPNG} className="p-1.5 hover:bg-gray-100 rounded-lg"><Download className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="p-4 overflow-auto flex items-center justify-center" style={{ minHeight: 200 }}>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              width: canvasWidth * zoom,
              height: canvasHeight * zoom,
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
}
