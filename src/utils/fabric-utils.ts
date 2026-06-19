import * as fabric from 'fabric';

export const exportToImage = (canvas: fabric.Canvas, format: 'png' | 'jpeg' = 'png') => {
  return canvas.toDataURL({
    format,
    quality: 0.9,
    multiplier: 2 // Higher resolution
  });
};

export const downloadJson = (data: any, fileName: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.json`;
  link.click();
  URL.revokeObjectURL(url);
};
