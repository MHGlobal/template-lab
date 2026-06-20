# Plano de Implementação — Sprint A (Fase 1)

> 4 itens: ArtboardSelector, Mais formas, Fundo canvas, Safe zone
> Base: `editor` branch
> Estimativa: ~5-6h

---

## Ordem de implementação

| # | Item | Arquivos | Risco |
|---|------|----------|-------|
| 1 | 1.20 ArtboardSelector | `ArtboardSelector.tsx` (novo), `Editor.tsx`, `useEditor.ts` | Baixo |
| 2 | 1.10 Mais formas | `useEditor.ts`, `Toolbar.tsx` | Baixo |
| 3 | 1.21 Fundo canvas | `useEditor.ts`, `PropertyPanel.tsx` | Médio |
| 4 | 1.23 Safe zone | `SafeZoneOverlay.tsx` (novo), `Editor.tsx` | Baixo |

---

## A.1 — ArtboardSelector

**Branch**: `feat/f1-20-artboard`

### 1. Interface + Presets
Criar `src/components/editor/ArtboardSelector.tsx`:

```typescript
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Monitor, ChevronDown } from 'lucide-react';

interface ArtboardPreset {
  name: string;
  width: number;
  height: number;
  category: 'social' | 'print' | 'display';
}

const presets: ArtboardPreset[] = [
  { name: 'Instagram Post', width: 1080, height: 1080, category: 'social' },
  { name: 'Instagram Story', width: 1080, height: 1920, category: 'social' },
  { name: 'Instagram Reel', width: 1080, height: 1920, category: 'social' },
  { name: 'Facebook Cover', width: 820, height: 312, category: 'social' },
  { name: 'LinkedIn Banner', width: 1584, height: 396, category: 'social' },
  { name: 'YouTube Thumbnail', width: 1280, height: 720, category: 'social' },
  { name: 'Twitter Post', width: 1200, height: 675, category: 'social' },
  { name: 'Twitch Banner', width: 1920, height: 480, category: 'social' },
  { name: 'A4', width: 2480, height: 3508, category: 'print' },
  { name: 'A5', width: 1748, height: 2480, category: 'print' },
  { name: 'Etsy Shop', width: 4000, height: 2667, category: 'display' },
];

interface ArtboardSelectorProps {
  currentWidth: number;
  currentHeight: number;
  onResize: (width: number, height: number) => void;
}
```

### 2. Lógica
- Encontrar preset atual: `presets.find(p => p.width === w && p.height === h)` ou exibir tamanho custom
- Dropdown com categorias (social, print, display)
- Ao selecionar, chamar `onResize(width, height)`

### 3. Editor.tsx
- Importar `ArtboardSelector`
- Renderizar no header entre nome e botões de ação
- Passar `width, height` do state do editor (ou options)
- `onResize` chama `canvas.setWidth(w); canvas.setHeight(h)` via ref

### 4. useEditor.ts
- Adicionar `resizeCanvas(width, height)` que chama `canvas.setWidth/setHeight`
- Atualizar `options.width/height` e re-renderizar grid

### Validação
- [ ] Dropdown mostra presets agrupados por categoria
- [ ] Selecionar "Instagram Story" → canvas 1080x1920
- [ ] Selecionar "A4" → canvas 2480x3508
- [ ] Objetos no canvas mantidos após resize

---

## A.2 — Mais formas

**Branch**: `feat/f1-10-more-shapes`

### 1. Extender createShape em useEditor.ts

Adicionar ao switch em `createShape`:

```typescript
case 'heart': {
  const r = Math.max(absW, absH) / 2;
  const cx = r; const cy = r;
  const heartPoints = [];
  for (let i = 0; i < 20; i++) {
    const t = (Math.PI / 20) * i;
    const x = cx + 16 * Math.pow(Math.sin(t), 3) * (r / 16);
    const y = cy - (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * (r / 16);
    heartPoints.push({ x, y });
  }
  return new fabric.Polygon(heartPoints, { left: x, top: y, fill: '#EF4444', strokeUniform: true });
}
case 'speech-bubble': {
  // Rect + triângulo na base
  const bw = absW; const bh = absH;
  const triSize = 15;
  const pts = [
    { x: 0, y: 0 }, { x: bw, y: 0 },
    { x: bw, y: bh - triSize },
    { x: bw * 0.6 + triSize, y: bh - triSize },
    { x: bw * 0.6, y: bh },
    { x: bw * 0.6 - triSize, y: bh - triSize },
    { x: 0, y: bh - triSize },
  ];
  return new fabric.Polygon(pts, { left: x, top: y, fill: '#8B5CF6', stroke: '#000000', strokeWidth: 0, strokeUniform: true });
}
case 'pentagon': {
  const r = Math.max(absW, absH) / 2;
  const cx = r; const cy = r;
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return new fabric.Polygon(pts, { left: x, top: y, fill: '#F59E0B', strokeUniform: true });
}
case 'dashed-line':
  return new fabric.Line([0, 0, absW, absH], {
    left: x, top: y, stroke: '#10B981', strokeWidth: 4,
    strokeDashArray: [8, 4], strokeUniform: true,
  });
```

### 2. Toolbar.tsx
- Adicionar botão "..." que alterna um grid expandido
- Expandido: heart, speech-bubble, pentagon, dashed-line
- Atualizar `ToolId` type em `useEditor.ts`:

```typescript
export type ToolId = 'select' | 'rect' | 'circle' | 'triangle' | 'ellipse'
  | 'line' | 'polygon' | 'star' | 'arrow' | 'rounded-rect'
  | 'heart' | 'speech-bubble' | 'pentagon' | 'dashed-line';
```

### 3. Cores
- heart: `#EF4444` (red)
- speech-bubble: `#8B5CF6` (purple)
- pentagon: `#F59E0B` (amber)
- dashed-line: `#10B981` (green) com `strokeDashArray: [8, 4]`

### Validação
- [ ] Botão "..." expande toolbar
- [ ] Heart recognizável
- [ ] Speech bubble recognizável
- [ ] Pentagon recognizável
- [ ] Dashed line recognizável
- [ ] `npm run build` passa

---

## A.3 — Fundo canvas personalizável

**Branch**: `feat/f1-21-background`

### 1. PropertyPanel.tsx — "Fundo" quando nada selecionado

Modificar o bloco `if (!activeProps)` (linha 38-55):

```typescript
if (!activeProps) {
  return (
    <aside className="...">
      <div className="p-4 border-b ...">
        <h2>Propriedades</h2>
      </div>
      <div className="px-4 pt-4">
        <Section title="Fundo do Canvas" icon={PaintBucket}>
          <label className="text-[11px] font-semibold text-gray-500 block mb-1">Cor de fundo</label>
          <ColorField value={canvasBg} onChange={onSetCanvasBg} />
          <button onClick={onUploadBgImage} className="w-full mt-2 p-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">
            Upload imagem de fundo
          </button>
        </Section>
      </div>
    </aside>
  );
}
```

### 2. Editor.tsx
- Passar `canvasBg` e `onSetCanvasBg`, `onUploadBgImage` para PropertyPanel
- Extrair do useEditor

### 3. useEditor.ts
- Adicionar `setCanvasBg(color: string)`:
```typescript
const setCanvasBg = useCallback((color: string) => {
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;
  canvas.setBackgroundColor(color, () => canvas.renderAll());
  saveHistory();
}, [saveHistory]);
```

- Adicionar `uploadCanvasBg(file: File)`:
```typescript
const uploadCanvasBg = useCallback((file: File) => {
  const url = URL.createObjectURL(file);
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;
  fabric.Image.fromURL(url, (img) => {
    canvas.setBackgroundImage(img, () => canvas.renderAll(), {
      scaleX: canvas.width! / img.width!,
      scaleY: canvas.height! / img.height!,
    });
    saveHistory();
  });
}, [saveHistory]);
```

### 4. PropertyPanel props
```typescript
interface PropertyPanelProps {
  // ...existing props...
  canvasBg?: string;
  onSetCanvasBg?: (color: string) => void;
  onUploadBgImage?: () => void;
}
```

### Validação
- [ ] Nada selecionado → PropertyPanel mostra seção "Fundo do Canvas"
- [ ] Mudar cor → canvas background muda
- [ ] Upload imagem → imagem de fundo
- [ ] Selecionar objeto → PropertyPanel volta a mostrar propriedades do objeto

---

## A.4 — Safe zone overlay

**Branch**: `feat/f1-23-safezone`

### 1. Criar SafeZoneOverlay.tsx

```typescript
'use client';

import React from 'react';

interface SafeZoneConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const safeZoneMap: Record<string, SafeZoneConfig> = {
  '1080x1920': { top: 250, bottom: 250, left: 0, right: 0 }, // Instagram Story
  '1080x1080': { top: 0, bottom: 0, left: 0, right: 0 },
};

interface SafeZoneOverlayProps {
  width: number;
  height: number;
  zoom: number;
  visible: boolean;
}

export default function SafeZoneOverlay({ width, height, zoom, visible }: SafeZoneOverlayProps) {
  const key = `${width}x${height}`;
  const zone = safeZoneMap[key];
  if (!visible || !zone) return null;

  const overlayStyle = (pos: 'top' | 'bottom') => ({
    position: 'absolute' as const,
    left: 0,
    right: 0,
    [pos]: 0,
    height: (zone[pos as keyof SafeZoneConfig] * zoom) + 'px',
    background: 'rgba(255, 0, 0, 0.08)',
    border: '1px dashed rgba(255, 0, 0, 0.3)',
    pointerEvents: 'none' as const,
    zIndex: 10,
  });

  return (
    <>
      <div style={overlayStyle('top')} title={`Safe zone top: ${zone.top}px`} />
      <div style={overlayStyle('bottom')} title={`Safe zone bottom: ${zone.bottom}px`} />
    </>
  );
}
```

### 2. Editor.tsx
- Importar e renderizar `SafeZoneOverlay` sobre o canvas
- `useState(false)` para `showSafeZone`
- Botão toggle no header (ícone `ScanEye` ou similar)
- Passar `width, height, zoomLevel, showSafeZone`

### 3. useEditor.ts
- Expor `safeZoneVisible`, `toggleSafeZone`
- `safeZoneMap` pode ser estendida via `options.safeZones`

### Validação
- [ ] Canvas 1080x1920 (Instagram Story) → overlay com top/bottom 250px
- [ ] Canvas 1080x1080 → sem overlay
- [ ] Toggle safe zone → liga/desliga
- [ ] Zoom muda → overlay escala proporcionalmente

---

## Validação final da Sprint

```bash
npm run build
# Compiled successfully

# Teste manual:
# 1. ArtboardSelector dropdown funcional
# 2. Heart, speech-bubble, pentagon, dashed line no canvas
# 3. Fundo canvas muda cor
# 4. Safe zone em Instagram Story
```

Commits sugeridos:
- `feat: artboard selector with 11 presets`
- `feat: 4 new shapes - heart, speech bubble, pentagon, dashed line`
- `feat: canvas background color and image`
- `feat: safe zone overlay for social media sizes`
