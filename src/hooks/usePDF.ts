'use client';

import { useCallback } from 'react';

export function usePDF() {
  const importPDF = useCallback(async (file: File): Promise<HTMLCanvasElement[]> => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
    const arrayBuf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
    const pages: HTMLCanvasElement[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const p = await pdf.getPage(i);
      const vp = p.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height;
      const ctx = canvas.getContext('2d')!;
      await p.render({ canvas, viewport: vp }).promise;
      pages.push(canvas);
    }
    return pages;
  }, []);

  const exportPDF = useCallback(async (canvasEl: HTMLCanvasElement) => {
    const { default: jsPDF } = await import('jspdf');
    const imgData = canvasEl.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: canvasEl.width > canvasEl.height ? 'l' : 'p', unit: 'px', format: [canvasEl.width, canvasEl.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvasEl.width, canvasEl.height);
    pdf.save('export.pdf');
  }, []);

  return { importPDF, exportPDF };
}
