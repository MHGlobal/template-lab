'use client';

import { useCallback, useRef } from 'react';

export function useExport() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const exportGIF = useCallback(async (
    canvas: HTMLCanvasElement,
    frames: number = 10,
    delay: number = 100,
  ): Promise<Blob | null> => {
    const GIF = (await import('gif.js')).default;
    const gif = new GIF({ workers: 2, quality: 10, width: canvas.width, height: canvas.height });
    for (let i = 0; i < frames; i++) {
      gif.addFrame(canvas, { copy: true, delay });
    }
    return new Promise((resolve) => {
      gif.on('finished', (blob: Blob) => resolve(blob));
      gif.render();
    });
  }, []);

  const startRecording = useCallback((canvas: HTMLCanvasElement, fps: number = 30) => {
    chunksRef.current = [];
    const stream = canvas.captureStream(fps);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.start();
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(new Blob([], { type: 'video/webm' }));
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        chunksRef.current = [];
        resolve(blob);
      };
      recorder.stop();
    });
  }, []);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const exportVideo = useCallback(async (
    canvas: HTMLCanvasElement,
    fps: number = 30,
    durationMs: number = 2000,
  ) => {
    startRecording(canvas, fps);
    await new Promise((r) => setTimeout(r, durationMs));
    const blob = await stopRecording();
    downloadBlob(blob, 'export.webm');
  }, [startRecording, stopRecording, downloadBlob]);

  return { exportGIF, startRecording, stopRecording, downloadBlob, exportVideo };
}
