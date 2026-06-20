# Sprints — Fase 1 (Core Features)

> 26 itens do ROADMAP.md Fase 1
> Sprint length: 1 semana cada
> Estimativa total: 6 sprints (~6 semanas)

## Critério de agrupamento
- **Sprint A**: Features visíveis imediatas (artboards, shapes, fundo, formas)
- **Sprint B**: Manipulação de objeto (snapping, constraints, alinhamento, réguas)
- **Sprint C**: Texto avançado (variáveis, rich-text, texto em curva, QR)
- **Sprint D**: Preenchimento e efeitos (gradiente, pattern, sombras, setas)
- **Sprint E**: Ferramentas de desenho (pen tool, máscaras, tabela, SVG)
- **Sprint F**: Multi-page, animações e export (páginas, timeline, PDF, transições)

---

## Sprint A — Canvas, Formas e Fundo

**Itens**: 1.20, 1.10, 1.21, 1.23

### Tarefas

#### A.1 — ArtboardSelector (1.20)
- **Novo**: `src/components/editor/ArtboardSelector.tsx`
- **Muda**: `Editor.tsx` (header)
- **Esforço**: 1h
- **Validação**: Dropdown com presets → canvas redimensiona

#### A.2 — Mais formas (1.10)
- **Muda**: `src/hooks/useEditor.ts` (createShape), `Toolbar.tsx`
- **Esforço**: 2h
- **Validação**: Heart, speech bubble, pentagon, hexagon, dashed line no toolbar

#### A.3 — Fundo canvas (1.21)
- **Muda**: `src/hooks/useEditor.ts`, `PropertyPanel.tsx`
- **Esforço**: 1.5h
- **Validação**: PropertyPanel sem seleção mostra fundo

#### A.4 — Safe zone overlay (1.23)
- **Novo**: `src/components/editor/SafeZoneOverlay.tsx`
- **Muda**: `Editor.tsx`, `useEditor.ts`
- **Esforço**: 1h
- **Validação**: Instagram Story mostra safe zones

---

## Sprint B — Snapping, Constraints e Réguas

**Itens**: 1.7, 1.9, 1.8, 1.22, 1.12

### Tarefas

#### B.1 — Smart guides (1.7)
- **Novo**: `src/hooks/useSnapping.ts`
- **Muda**: `src/hooks/useEditor.ts`
- **Esforço**: 3h
- **Validação**: Objeto snap a 5px de outros objetos

#### B.2 — Constraint groups (1.9)
- **Muda**: `src/hooks/useEditor.ts`, `PropertyPanel.tsx`
- **Esforço**: 1h
- **Validação**: Aspect ratio lock no resize

#### B.3 — Pixel alignment (1.8)
- **Muda**: `src/hooks/useEditor.ts`
- **Esforço**: 30min
- **Validação**: Posições sempre inteiras

#### B.4 — Réguas (1.22)
- **Novo**: `src/components/editor/Rulers.tsx`
- **Muda**: `Editor.tsx`
- **Esforço**: 2h
- **Validação**: Réguas com marcadores de posição

#### B.5 — Biblioteca de setas (1.12)
- **Muda**: `src/hooks/useEditor.ts` (extender arrow), `PropertyPanel.tsx`
- **Esforço**: 1.5h
- **Validação**: Chevron, dupla, tracejada

---

## Sprint C — Texto e Dados

**Itens**: 1.2, 1.3, 1.16, 1.17

### Tarefas

#### C.1 — Variáveis dinâmicas (1.2)
- **Novo**: `src/hooks/useVariables.ts`, `src/components/editor/VariablesPanel.tsx`
- **Muda**: `Editor.tsx`
- **Esforço**: 3h
- **Validação**: `{{nome}}` detectado, substituído, restaurado

#### C.2 — Rich-text (1.3)
- **Novo**: `src/components/editor/RichTextToolbar.tsx`
- **Muda**: `PropertyPanel.tsx`, `useEditor.ts`
- **Esforço**: 3h
- **Validação**: Bold/Italic/Underline/Listas

#### C.3 — Texto em curva (1.16)
- **Novo**: `src/hooks/useTextPath.ts`
- **Muda**: `PropertyPanel.tsx`
- **Esforço**: 2h
- **Validação**: Texto segue círculo/path

#### C.4 — QR Code (1.17)
- **Novo**: `src/hooks/useQRCode.ts`
- **Esforço**: 1.5h
- **Validação**: QR gerado e scaneável

---

## Sprint D — Preenchimento e Efeitos

**Itens**: 1.14, 1.15, 1.13, 1.12 (arrow styles)

### Tarefas

#### D.1 — Gradientes (1.14)
- **Novo**: `src/hooks/useGradient.ts`, `src/components/editor/GradientPanel.tsx`
- **Muda**: `PropertyPanel.tsx`
- **Esforço**: 3h
- **Validação**: Linear/radial com color stops

#### D.2 — Pattern fill (1.15)
- **Muda**: `src/hooks/useEditor.ts`, `PropertyPanel.tsx`
- **Esforço**: 1h
- **Validação**: Imagem vira pattern fill

#### D.3 — Sombras e brilhos (1.13)
- **Novo**: `src/hooks/useShadow.ts`, `src/components/editor/ShadowPanel.tsx`
- **Muda**: `PropertyPanel.tsx`
- **Esforço**: 2h
- **Validação**: Drop shadow, inner, glow

---

## Sprint E — Ferramentas Avançadas

**Itens**: 1.11, 1.4, 1.19, 1.18

### Tarefas

#### E.1 — Pen tool (1.11)
- **Novo**: `src/hooks/usePenTool.ts`, `src/components/editor/PathEditor.tsx`
- **Muda**: `Toolbar.tsx`, `useEditor.ts`
- **Esforço**: 4h
- **Validação**: Pontos, curvas bezier, path finalizado

#### E.2 — Máscaras + Crop (1.4)
- **Novo**: `src/hooks/useMask.ts`, `src/components/editor/CropTool.tsx`
- **Muda**: `PropertyPanel.tsx`, `useEditor.ts`
- **Esforço**: 3h
- **Validação**: ClipPath circular, crop handles

#### E.3 — Tabela (1.19)
- **Novo**: `src/hooks/useTable.ts`
- **Esforço**: 2h
- **Validação**: Grid 3x3 editável

#### E.4 — SVG externo (1.18)
- **Muda**: `src/hooks/useEditor.ts`
- **Esforço**: 1h
- **Validação**: SVG como paths vetoriais

---

## Sprint F — Multi-page e Exportação

**Itens**: 1.1, 1.24, 1.25, 1.26

### Tarefas

#### F.1 — Multi-page (1.1)
- **Novo**: `src/hooks/usePages.ts`, `src/components/editor/PageBar.tsx`
- **Muda**: `useEditor.ts`, `Editor.tsx`
- **Esforço**: 4h
- **Validação**: Páginas, navegação, duplicar, remover

#### F.2 — PDF (1.24)
- **Novo**: `src/hooks/usePDF.ts`, `src/components/editor/PDFImportDialog.tsx`
- **Esforço**: 3h
- **Validação**: Import/export PDF

#### F.3 — Animações (1.25)
- **Novo**: `src/hooks/useAnimation.ts`, `src/components/editor/Timeline.tsx`
- **Muda**: `Editor.tsx`
- **Esforço**: 5h
- **Validação**: Keyframes, play, speed

#### F.4 — Transições (1.26)
- **Muda**: `src/hooks/useEditor.ts` (switchPage)
- **Esforço**: 2h
- **Validação**: Slide/fade entre páginas

---

## Como iniciar

1. Mover tarefas da Sprint A para `docs/PLAN-SPRINT-A-F1.md`
2. Implementar conforme SPEC-F1.md
3. `npm run build` entre cada item
4. Ao final da sprint, commit com `git commit -m "feat: sprint A - artboards, shapes, background, safezone"`
5. Atualizar Obsidian com progresso

## Status atual

| Sprint | Status | Previsão |
|--------|--------|----------|
| A — Canvas/Formas/Fundo | Pendente | Semana 1 |
| B — Snapping/Constraints | Pendente | Semana 2 |
| C — Texto/Dados | Pendente | Semana 3 |
| D — Preenchimento/Efeitos | Pendente | Semana 4 |
| E — Ferramentas | Pendente | Semana 5 |
| F — Multi-page/Export | Pendente | Semana 6 |
