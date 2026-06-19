'use client';

import React, { useEffect, useRef, useState } from 'react';

interface FabricCanvasProps {
  width: number;
  height: number;
  initialJson?: any;
  onCanvasReady?: (canvas: any) => void;
}

export const FabricCanvas: React.FC<FabricCanvasProps> = ({
  width,
  height,
  initialJson,
  onCanvasReady
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Dynamically import fabric only on client side
    const initFabric = async () => {
      const fabric = await import('fabric');
      
      const fabricCanvas = new fabric.Canvas(canvasRef.current!, {
        width,
        height,
        backgroundColor: '#ffffff',
      });

      if (initialJson) {
        fabricCanvas.loadFromJSON(initialJson, () => {
          fabricCanvas.renderAll();
        });
      }

      setCanvas(fabricCanvas);
      if (onCanvasReady) onCanvasReady(fabricCanvas);

      return fabricCanvas;
    };

    let fabricInstance: any;
    initFabric().then(instance => {
      fabricInstance = instance;
    });

    return () => {
      if (fabricInstance) fabricInstance.dispose();
    };
  }, [width, height]);

  useEffect(() => {
    if (canvas && initialJson) {
      canvas.loadFromJSON(initialJson, () => {
        canvas.renderAll();
      });
    }
  }, [initialJson, canvas]);

  return (
    <div className="border shadow-lg bg-white overflow-hidden rounded-md">
      <canvas ref={canvasRef} />
    </div>
  );
};
