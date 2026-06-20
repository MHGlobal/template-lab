# SPEC-F1 — Funcionalidades Core (26 itens)

> Baseado em ROADMAP.md Fase 1 (P1 Mercado)
> 26 itens, ~4-6 semanas estimado

---

## 1.1 Multi-page / Multi-canvas

**Hook/Componente novos**: `usePages.ts`, `PageBar.tsx`  
**Arquivos existentes que mudam**: `useEditor.ts`, `Editor.tsx`, `Toolbar.tsx`

### Estado
```typescript
interface Page {
  id: string;
  name: string;
  fabric_json: any;
  background: string;
  width: number;
  height: number;
}

const [pages, setPages] = useState<Page[]>([
  { id: 'page-1', name: 'Página 1', fabric_json: null, background: '#FFFFFF', width: 1080, height: 1080 }
]);
const [activePageId, setActivePageId] = useState('page-1');
```

### PageBar (novo componente)
- Barra horizontal na parte inferior do canvas
- Miniaturas das páginas com nome
- Botão "+" para nova página
- Botão "..." com menu: Renomear, Duplicar, Remover
- Clique na página alterna `activePageId`
- Remover página: confirmação se for a única

### Fluxo
1. `useEditor` expõe `pages`, `activePageId`, `addPage`, `removePage`, `duplicatePage`, `renamePage`, `switchPage`
2. `switchPage(id)`: salva `fabric_json` da página atual → carrega `fabric_json` da nova página via `loadJson()`
3. `addPage()`: cria página com `fabric_json: null` (canvas vazio)
4. `Editor.tsx` renderiza `<PageBar>` entre canvas e ZoomControls

### Validação
- [ ] Criar 3 páginas → barra mostra 3 miniaturas
- [ ] Clicar Página 2 → canvas carrega conteúdo da Página 2
- [ ] Adicionar objeto na Página 2, voltar Página 1 → objeto não aparece
- [ ] Voltar Página 2 → objeto ainda está lá
- [ ] Duplicar página → cópia com sufixo " (cópia)"
- [ ] Remover página → última página não pode ser removida
- [ ] Renomear página → nome atualiza na barra

---

## 1.2 Variáveis dinâmicas em texto

**Hook/Componente novos**: `useVariables.ts`, `VariablesPanel.tsx`  
**Arquivos existentes que mudam**: `PropertyPanel.tsx`, `Editor.tsx`

### Estado
```typescript
interface Variable {
  key: string;          // 'nome_cliente'
  label: string;        // 'Nome do Cliente'
  value: string;        // 'Maria Silva'
  type: 'text' | 'number' | 'date';
}

const [variables, setVariables] = useState<Variable[]>([]);
```

### Detectação
- `useVariables` escaneia todos os `fabric.IText` no canvas por `{{...}}`
- Regex: `/\{\{(\w+)\}\}/g`
- Popula `variables` com os matches únicos
- `VariablesPanel` mostra tabela: variável → valor atual
- Preview inline: `{{nome_cliente}}` aparece como "Maria Silva" no texto

### Substituição
- `previewVariables()`: percorre todos os `i-text`, substitui `{{key}}` por `value`
- Botão "Aplicar" substitui permanentemente (remove `{{}}`)
- Botão "Restaurar" volta aos `{{key}}`

### Validação
- [ ] Texto com `{{nome_cliente}}` → variável detectada no painel
- [ ] Mudar valor "João" → canvas atualiza para "João"
- [ ] Várias variáveis no mesmo texto → todas detectadas
- [ ] Aplicar → `{{nome_cliente}}` vira "João" (sem chaves)
- [ ] Restaurar → volta a `{{nome_cliente}}`

---

## 1.3 Rich-text avançado

**Componente novo**: `RichTextToolbar.tsx`  
**Arquivos existentes que mudam**: `PropertyPanel.tsx`, `useEditor.ts`

### Funcionalidades
- Botões: Bold (⌘B), Italic (⌘I), Underline (⌘U), Strikethrough
- Listas: Bullet list, Numbered list
- Paragraph indent: aumentar/diminuir indentação
- Link: `⌘K` → prompt de URL

### Implementação
- Fabric.js `IText` já suporta `bold`, `italic`, `underline` via `styles` (per-character)
- `RichTextToolbar` renderiza dentro de `PropertyPanel` quando `isText`
- `useEditor` expõe: `toggleBold()`, `toggleItalic()`, `toggleUnderline()`, `toggleBulletList()`, `toggleNumberedList()`

### Bullet/Numbered list
- Simulado com detection de `\n- ` ou `\n1. ` no texto
- `toggleBulletList()`: prefixa cada linha com `- ` ou remove
- `toggleNumberedList()`: prefixa com `1. `, `2. `...

### Validação
- [ ] Selecionar texto, Bold → texto fica negrito
- [ ] Italic, Underline, Strikethrough funcionam
- [ ] Bullet list → cada linha prefixada com `- `
- [ ] Numbered list → linhas numeradas
- [ ] ⌘B/⌘I/⌘U atalhos funcionam

---

## 1.4 Máscaras e clipping

**Hook/Componente novos**: `useMask.ts`, `CropTool.tsx`  
**Arquivos existentes que mudam**: `PropertyPanel.tsx`, `Editor.tsx`, `useEditor.ts`

### Image mask
- `useMask` expõe `applyMask(obj, shape: 'rect' | 'circle' | 'polygon')`
- Usa `fabric.Group` com `clipPath` (Fabric 6 clipPath API)
- `removeMask(obj)`: restaura imagem original

### Crop tool
- `CropTool.tsx`: overlay com 8 handles de canto/meio
- Ao ativar crop, objeto entra modo de edição com handles
- Handles arrastam bordas do crop
- Ao confirmar, `obj.set({ left, top, width, height, scaleX, scaleY })` recalcula

### Validação
- [ ] Selecionar imagem → botão "Máscara" aparece no PropertyPanel
- [ ] Aplicar máscara círculo → imagem aparece circular (clipPath)
- [ ] Remover máscara → imagem volta ao normal
- [ ] Ativar Crop → 8 handles aparecem
- [ ] Arrastar handle → preview do crop
- [ ] Confirmar → imagem cortada

---

## 1.5 Componentes reutilizáveis

**Hook/Componente novos**: `useComponents.ts`, `AssetsPanel.tsx`  
**Arquivos existentes que mudam**: `Editor.tsx`

### Estado
```typescript
interface ComponentDef {
  id: string;
  name: string;
  fabric_json: any;
  thumbnail: string;
  updatedAt: number;
}
```

### Fluxo
1. `useComponents` gerencia `ComponentDef[]` em localStorage (`editja_components`)
2. Salvar como componente: selecionar objeto(s) → "Salvar como componente"
3. `AssetsPanel.tsx`: painel lateral com grid de componentes (miniaturas)
4. Arrastar componente do AssetsPanel para o canvas instancia uma cópia
5. **Sincronização**: "Sincronizar todos" → percorre instâncias, atualiza `fabric_json`

### Identificação de instâncias
- Cada instância recebe `data.componentId: string`
- `getInstances(componentId)`: filtra canvas por `data.componentId`
- `syncComponent(componentId)`: atualiza todas as instâncias com o JSON mestre

### Validação
- [ ] Selecionar grupo → "Salvar como componente" → aparece no Assets
- [ ] Arrastar do Assets → nova instância no canvas
- [ ] Editar instância original → sincronizar → todas as instâncias atualizam
- [ ] Remover componente → instâncias viram objetos normais

---

## 1.6 Auto-layout flex

**Hook/Componente novos**: `useAutoLayout.ts`, `AutoLayoutPanel.tsx`  
**Arquivos existentes que mudam**: `PropertyPanel.tsx`, `useEditor.ts`

### Estado
```typescript
interface AutoLayoutConfig {
  direction: 'row' | 'column';
  gap: number;
  padding: number;
  align: 'start' | 'center' | 'end' | 'stretch';
  wrap: boolean;
}
```

### Implementação
- `AutoLayoutPanel` aparece quando grupo selecionado
- Configura `data.autoLayout` no grupo
- `useAutoLayout` observa `object:modified` nos filhos do grupo
- Ao adicionar/remover/redimensionar filho, reposiciona automaticamente
- Usa `obj.set()` nos filhos para manter gap e alinhamento

### Validação
- [ ] Criar grupo com 3 rects
- [ ] Ativar auto-layout row, gap=10 → rects alinhados horizontalmente com 10px gap
- [ ] Mudar para column → alinhamento vertical
- [ ] Aumentar gap → filhos se distanciam
- [ ] Adicionar rect ao grupo → reposiciona automaticamente

---

## 1.7 Smart guides (snapping)

**Hook novo**: `useSnapping.ts`  
**Arquivos existentes que mudam**: `useEditor.ts`

### Implementação
- `useSnapping` observa `object:moving`
- Para cada objeto sendo movido, calcula snap points:
  - Borda superior/inferior/esquerda/direita vs outros objetos
  - Centro horizontal/vertical vs outros objetos
  - Borda vs canvas
- Se distância < 5px, `obj.set({ left/top })` alinha e desenha guide line temporária
- Guide line: `fabric.Line` adicionado ao canvas e removido após `mouse:up`

### Snapping de ângulos
- Ao girar com Shift, snap a 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°

### Validação
- [ ] Mover rect perto de outro → snap (distância < 5px)
- [ ] Guide line aparece durante snap
- [ ] Girar com Shift → snap a 45°
- [ ] Soltar objeto → guide line desaparece
- [ ] Canvas sem objetos → snap só nas bordas do canvas

---

## 1.8 Alinhamento a pixel

**Arquivos existentes que mudam**: `useEditor.ts`

### Implementação
- Quando `zoom >= 1.0`, `setPosition` arredonda `left`/`top` para inteiros
- Quando `zoom < 1.0`, arredonda para `.5` (meio pixel)
- `setSize` sempre arredonda `width`/`height` para inteiros
- `nudgeSelected` sempre arredonda posição final

### Validação
- [ ] Zoom 100%, mover objeto → X,Y sempre inteiros
- [ ] SetPosition(100.3, 200.7) → vira (100, 201)
- [ ] SetSize(150.3, 200.8) → vira (150, 201)
- [ ] Nudge com shift (10px) → posição sempre inteira

---

## 1.9 Constraint groups

**Arquivos existentes que mudam**: `useEditor.ts`, `PropertyPanel.tsx`

### Aspect ratio lock
- `useEditor` expõe `toggleAspectLock(obj)`
- Quando ativo: `obj.set({ lockScalingX: false, lockScalingY: false })` + evento `object:scaling` mantém proporção
- Implementação: no `object:scaling`, calcula `scaleX` vs `scaleY` e força o maior (ou menor)
- `PropertyPanel` mostra ícone de cadeado quando ativo

### Validação
- [ ] Selecionar rect → botão "Travar proporção" no PropertyPanel
- [ ] Ativar → redimensionar mantém aspect ratio
- [ ] Desativar → redimensionar livre novamente

---

## 1.10 Mais formas

**Arquivos existentes que mudam**: `useEditor.ts` (extender `createShape`), `Toolbar.tsx`

### Novas formas
| Forma | Fabric class | Parâmetros |
|-------|-------------|------------|
| Heart | `fabric.Polygon` | 2 curvas bezier + ponta (20 pontos) |
| Speech bubble | `fabric.Polygon` | Rect + triângulo inferior |
| Pentagon | `fabric.Polygon` | 5 lados |
| Hexagon | `fabric.Polygon` | 6 lados (já existe como polygon) |
| Multi-star | `fabric.Polygon` | Spike count configurável (5-12) |
| Dashed line | `fabric.Line` | `strokeDashArray: [8, 4]` |

### UI
- `Toolbar.tsx`: botão "..." que expande mais formas
- Dropdown/grid com ícones das formas adicionais

### Validação
- [ ] Cada nova forma aparece no canvas ao clicar
- [ ] Heart recognizável visualmente
- [ ] Speech bubble recognizável
- [ ] Dashed line com traços visíveis
- [ ] Multi-star com 8 pontas funciona

---

## 1.11 Pen tool (Bezier)

**Hook/Componente novos**: `usePenTool.ts`, `PathEditor.tsx`  
**Arquivos existentes que mudam**: `Toolbar.tsx`, `useEditor.ts`

### Fluxo
1. `activeTool === 'pen'`: clique no canvas adiciona ponto de ancoragem
2. Arrasto cria curva bezier (handle de controle)
3. Enter/duplo clique finaliza path
4. Path criado via `fabric.Path` com string SVG path
5. `PathEditor`: modo de edição onde clica em pontos para mover handles

### Estado
```typescript
interface PenPoint {
  x: number; y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
}
```

### Validação
- [ ] Ativar Pen → clique no canvas cria ponto
- [ ] Clique em outro local → linha reta entre pontos
- [ ] Arrasto → curva bezier com handles visíveis
- [ ] Enter/duplo clique → path finalizado
- [ ] Path editável no PathEditor

---

## 1.12 Biblioteca de setas

**Arquivos existentes que mudam**: `useEditor.ts` (extender arrow), `PropertyPanel.tsx`

### Tipos de seta
| Tipo | Descrição |
|------|-----------|
| Simples | Seta atual (1 ponta) |
| Dupla | Pontas em ambas extremidades |
| Chevron | Ponta fechada (triângulo) |
| Tracejada | Linha tracejada + ponta |

### UI
- `PropertyPanel` quando `type === 'arrow'` mostra seletor de estilo
- `strokeDashArray` controlado pelo preset

### Validação
- [ ] Selecionar seta → seletor de estilo aparece
- [ ] Mudar para "Dupla" → ponta em ambas extremidades
- [ ] Mudar para "Chevron" → triângulo fechado na ponta
- [ ] Tracejada → linha com `strokeDashArray: [8, 4]`

---

## 1.13 Sombras e brilhos

**Hook/Componente novos**: `useShadow.ts`, `ShadowPanel.tsx`  
**Arquivos existentes que mudam**: `PropertyPanel.tsx`

### ShadowPanel
- Drop shadow: offset X, offset Y, blur, cor, spread
- Inner shadow: `fabric.Shadow` com `affectStroke: false`, `nonScaling: true`
- Outer glow: shadow com blur alto e cor, sem offset

### Estado
```typescript
interface ShadowConfig {
  type: 'drop' | 'inner' | 'glow';
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  spread: number;
}
```

### Implementação
- Fabric.js `obj.set('shadow', new fabric.Shadow({...}))`
- `useShadow` converte `ShadowConfig` para `fabric.Shadow`

### Validação
- [ ] Drop shadow = {ox:2, oy:2, blur:4, cor:#000} → sombra visível
- [ ] Inner shadow → sombra dentro do objeto
- [ ] Glow → brilho externo sem offset

---

## 1.14 Gradientes

**Hook/Componente Novos**: `useGradient.ts`, `GradientPanel.tsx`  
**Arquivos existentes que mudam**: `PropertyPanel.tsx`

### Tipos
- Linear: angle + color stops
- Radial: center + radius + color stops

### GradientPanel
- Seletor de tipo (linear/radial)
- Slider de ângulo (0-360) para linear
- Swatches de cor clicáveis
- Add/remove color stops (mín 2, máx 8)

### Implementação
- Fabric.js `obj.set('fill', new fabric.Gradient({...}))`
- `parseGradient(gradientDef)` → `fabric.Gradient`

### Validação
- [ ] Aplicar gradiente linear → objeto preenchido com gradiente
- [ ] Mudar ângulo → gradiente rotaciona
- [ ] Adicionar color stop → transição mais complexa
- [ ] Trocar para radial → gradiente radial

---

## 1.15 Pattern fill

**Arquivos existentes que mudam**: `useEditor.ts`, `PropertyPanel.tsx`

### Implementação
- PropertyPanel quando `isImage`: botão "Usar como Pattern"
- Clica na imagem → `obj.set('fill', new fabric.Pattern({ source: imgElement, repeat: 'repeat' }))`
- Remove a imagem do canvas e aplica como fill no objeto selecionado (ou cria rect com pattern)

### Validação
- [ ] Selecionar imagem → botão "Pattern Fill"
- [ ] Clicar → rect com pattern fill da imagem
- [ ] Pattern repete no preenchimento

---

## 1.16 Texto em curva

**Hook novo**: `useTextPath.ts`  
**Arquivos existentes que mudam**: `PropertyPanel.tsx`, `useEditor.ts`

### Implementação
- `useTextPath` expõe `applyTextPath(textObj, pathObj)` e `removeTextPath(textObj)`
- Usa `fabric.Textbox` sobre `fabric.Path` ou `fabric.Ellipse`
- Texto segue a geometria do path
- Botão "Texto em curva" no PropertyPanel quando rect/circle selecionado

### Validação
- [ ] Selecionar texto + path → "Aplicar curva" → texto segue path
- [ ] Remover curva → texto volta ao formato normal

---

## 1.17 QR Code nativo

**Hook novo**: `useQRCode.ts`  
**Arquivos existentes que mudam**: `Toolbar.tsx` (botão QR)

### Implementação
- `npm install qrcode` (lib leve, sem JSX)
- `useQRCode` expõe `generateQRCode(text, options)`
- Gera `<canvas>` com QR code, converte para `fabric.Image`
- Painel de entrada com campo de texto e botão "Gerar"

### Validação
- [ ] Botão QR na toolbar → abre modal/prompt
- [ ] Inserir "https://example.com" → QR code aparece no canvas
- [ ] QR code scaneável (testar com câmera)

---

## 1.18 Embed SVG externo

**Arquivos existentes que mudam**: `useEditor.ts` (extender `addImage`)

### Implementação
- `addImage` já aceita URL → detectar `.svg` pela extensão
- Se SVG: `fabric.loadSVGFromURL(url, (objects, options) => { ... })`
- Objetos SVG adicionados como grupo ao canvas
- Fallback: se loadSVG falhar, tratar como imagem normal

### Drag & drop SVG
- Evento `drop` no canvas detecta `e.dataTransfer.files` com `.svg`
- `FileReader` lê como texto, `fabric.loadSVGFromString()` renderiza

### Validação
- [ ] Upload SVG → path vetorial no canvas (não imagem rasterizada)
- [ ] Drag SVG do sistema → mesmo resultado
- [ ] SVG com paths complexos → renderizado corretamente

---

## 1.19 Tabela / grid de células

**Hook/Componente novos**: `useTable.ts`, dentro do `PropertyPanel`

### Implementação
- `useTable` expõe `createTable(rows, cols, options)`
- Cria `fabric.Group` com `fabric.Rect` (células) + `fabric.IText` (texto)
- `PropertyPanel` quando grupo de tabela: inputs para rows/cols e estilos
- Edição: clicar em célula ativa o `IText` dentro

### Validação
- [ ] "Inserir Tabela" → modal com rows (3) e cols (3)
- [ ] Confirmar → grid 3x3 de rects no canvas
- [ ] Clicar célula → digitar texto
- [ ] Mudar rows/cols → tabela redimensiona

---

## 1.20 Modelos de tamanho (artboards)

**Componente novo**: `ArtboardSelector.tsx`  
**Arquivos existentes que mudam**: `Editor.tsx` (acima do canvas)

### Presets
| Nome | Width | Height |
|------|-------|--------|
| Instagram Post | 1080 | 1080 |
| Instagram Story | 1080 | 1920 |
| Instagram Reel | 1080 | 1920 |
| Facebook Cover | 820 | 312 |
| LinkedIn Banner | 1584 | 396 |
| YouTube Thumbnail | 1280 | 720 |
| YouTube Banner | 2560 | 1440 |
| A4 | 2480 | 3508 |
| A5 | 1748 | 2480 |
| Twitter Post | 1200 | 675 |
| Twitch Banner | 1920 | 480 |
| Etsy Shop | 4000 | 2667 |

### Implementação
- `ArtboardSelector` dropdown no header do editor
- Ao selecionar, muda `width`/`height` do canvas
- Redimensiona canvas via `canvas.setWidth()`/`canvas.setHeight()` + re-render
- Preserva objetos existentes (reposiciona se necessário)

### Validação
- [ ] Selecionar "Instagram Story" → canvas muda para 1080x1920
- [ ] Selecionar "A4" → canvas muda para 2480x3508
- [ ] Objetos existentes mantidos após resize

---

## 1.21 Fundo do canvas personalizável

**Arquivos existentes que mudam**: `useEditor.ts` (extender `toggleGrid`), `PropertyPanel.tsx`

### Funcionalidades
- Cor sólida: `canvas.setBackgroundColor(color, () => canvas.renderAll())`
- Gradiente: `canvas.setBackgroundColor(new fabric.Gradient({...}), cb)`
- Imagem: `canvas.setBackgroundImage(url, () => canvas.renderAll(), { scaleX, scaleY })`
- Propriedade `background` no state `Page`

### PropertyPanel
- Quando nada selecionado (`activeProps === null`), mostra painel de fundo
- Seletor de cor, gradiente, upload imagem

### Validação
- [ ] Nada selecionado → PropertyPanel mostra "Fundo do Canvas"
- [ ] Mudar cor → fundo muda
- [ ] Upload imagem → imagem como fundo
- [ ] Gradiente → fundo gradiente
- [ ] Fundo por página (multi-page) preservado

---

## 1.22 Réguas (Rulers)

**Componente novo**: `Rulers.tsx`  
**Arquivos existentes que mudam**: `Editor.tsx`

### Implementação
- Regua horizontal e vertical nas bordas do canvas
- ~~~TSX
<div className="relative">
  <Ruler orientation="horizontal" width={canvasWidth} zoom={zoomLevel} />
  <Ruler orientation="vertical" height={canvasHeight} zoom={zoomLevel} />
  <canvas ref={canvasRef} />
</div>
~~~
- Marcação: px a cada 10px (zoom < 50%) / 20px (50-100%) / 50px (>100%)
- `useState` para `showRulers` (toggle no header)
- `mouse:move` no canvas atualiza posição do cursor nas réguas

### Validação
- [ ] Toggle rulers → réguas aparecem/desaparecem
- [ ] Mover mouse → indicador de posição nas réguas
- [ ] Zoom muda → escala da régua atualiza

---

## 1.23 Safe zone overlay

**Componente novo**: `SafeZoneOverlay.tsx`  
**Arquivos existentes que mudam**: `Editor.tsx`, `useEditor.ts`

### Implementação
- Overlay baseado no tamanho do canvas
- Instagram Story (1080x1920): barras superior e inferior (250px cada)
- Facebook Cover (820x312): zona segura central
- `useEditor` expõe `safeZones: { top: number, bottom: number, left: number, right: number }`
- `SafeZoneOverlay` renderiza `<div>` semi-transparente sobre canvas

### Validação
- [ ] Canvas Instagram Story → overlay com zonas seguras
- [ ] Canvas A4 → sem overlay (sem safe zone definida)
- [ ] Toggle safe zone no header → liga/desliga

---

## 1.24 Suporte a PDF

**Hook/Componente novos**: `usePDF.ts`, `PDFImportDialog.tsx`  
**Arquivos existentes que mudam**: `Editor.tsx`

### Import
- `npm install pdfjs-dist` (PDF.js)
- `PDFImportDialog`: file picker + preview página-a-página
- `usePDF.importPDF(file)`: renderiza cada página em canvas, extrai como imagem
- Importa cada página como `fabric.Image` em páginas separadas (multi-page)

### Export
- `usePDF.exportPDF()`: usa `jsPDF` (ou similar)
- Exporta cada página como imagem, monta PDF multipágina

### Validação
- [ ] Importar PDF de 3 páginas → 3 páginas no PageBar
- [ ] Cada página contém imagem da página do PDF
- [ ] Exportar → PDF com todas as páginas do canvas

---

## 1.25 Animações + timeline

**Hook/Componente novos**: `useAnimation.ts`, `Timeline.tsx`  
**Arquivos existentes que mudam**: `Editor.tsx`

### Keyframes
```typescript
interface Keyframe {
  time: number;     // % (0-100)
  props: Partial<{
    left: number; top: number; opacity: number;
    scaleX: number; scaleY: number; angle: number;
  }>;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}
```

### Timeline
- Barra horizontal na parte inferior (acima PageBar)
- Faixas por objeto com keyframes
- Play/Pause/Stop
- Scroll de tempo
- Speed control (0.5x, 1x, 2x)

### Implementação
- `useAnimation` gerencia `animations: Map<string, Keyframe[]>`
- `play()`: `requestAnimationFrame` loop interpolando props entre keyframes
- `fabric.util.animate` para transições suaves

### Validação
- [ ] Selecionar objeto → "+ Keyframe" no timeline
- [ ] Mover objeto em keyframe 2 → animação de posição
- [ ] Play → objeto anima entre keyframes
- [ ] Speed 2x → animação em dobro da velocidade

---

## 1.26 Transições de página

**Arquivos existentes que mudam**: `useEditor.ts` (extender `switchPage`)

### Tipos de transição
| Tipo | Descrição |
|------|-----------|
| None | Troca instantânea |
| Slide Left | Página atual desliza para esquerda, nova da direita |
| Slide Right | Inverso |
| Fade | Crossfade entre páginas |
| Zoom | Página atual zoom out, nova zoom in |

### Implementação
- `switchPage` com parâmetro `transition?: 'none' | 'slide-left' | 'slide-right' | 'fade' | 'zoom'`
- Durante transição: renderiza ambas páginas em canvases separados
- Anima opacidade/posição via CSS transitions no container
- Duração: 200-300ms

### Validação
- [ ] Mudar página → transição animada
- [ ] Slide Left → animação horizontal
- [ ] Fade → crossfade suave
- [ ] Transição não bloqueia UI
- [ ] Desativar transições → troca instantânea
