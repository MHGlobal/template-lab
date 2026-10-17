declare module 'gif.js' {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    repeat?: number;
    background?: string;
    transparent?: string | null;
    workerScript?: string;
  }

  interface AddFrameOptions {
    copy?: boolean;
    delay?: number;
  }

  class GIF {
    constructor(options?: GIFOptions);
    addFrame(element: HTMLCanvasElement | HTMLImageElement | CanvasRenderingContext2D, options?: AddFrameOptions): void;
    on(event: string, callback: (...args: any[]) => void): void;
    render(): void;
    abort(): void;
  }

  export default GIF;
}
