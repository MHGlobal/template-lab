# Plano de Implementação — Sprint B (Fase 1)

> 5 itens: Snapping, Constraints, Pixel alignment, Réguas, Setas
> Base: `editor` branch (após Sprint A)
> Estimativa: ~8h

---

## Ordem de implementação

| # | Item | Arquivos | Risco |
|---|------|----------|-------|
| 1 | B.3 Pixel alignment | `useEditor.ts` | Muito Baixo |
| 2 | B.2 Constraint groups | `useEditor.ts`, `PropertyPanel.tsx` | Baixo |
| 3 | B.5 Biblioteca de setas | `useEditor.ts`, `PropertyPanel.tsx` | Médio |
| 4 | B.1 Smart guides | `useSnapping.ts` (novo), `useEditor.ts` | Alto |
| 5 | B.4 Réguas | `Rulers.tsx` (novo), `Editor.tsx` | Alto |

---

## B.3 — Pixel alignment

**Arquivos**: `useEditor.ts`

### Implementação
- `setPosition`: arredondar `left`/`top` para inteiros quando zoom >= 1.0, para `.5` quando zoom < 1.0
- `setSize`: arredondar `width`/`height` para inteiros
- `nudgeSelected`: arredondar posição final

### Validação
- [ ] Zoom 100%, setPosition(100.3, 200.7) → (100, 201)
- [ ] Zoom 50%, setPosition(100.3, 200.7) → (100.5, 200.5)
- [ ] setSize(150.3, 200.8) → (150, 201)

---

## B.2 — Constraint groups (aspect ratio lock)

**Arquivos**: `useEditor.ts`, `PropertyPanel.tsx`

### Implementação
- `toggleAspectLock(obj)`: alterne `data.aspectLock` + registre `object:scaling` listener
- No `object:scaling`, calcule `scaleX` vs `scaleY` e force proporção original
- `PropertyPanel` mostra ícone de cadeado quando aspect lock ativo

### Validação
- [ ] Selecionar rect → botão "Travar proporção"
- [ ] Ativar → redimensionar mantém aspect ratio
- [ ] Desativar → redimensionar livre

---

## B.5 — Biblioteca de setas

**Arquivos**: `useEditor.ts`, `PropertyPanel.tsx`

### Implementação
- `createArrow(type, x, y)`: cria seta com estilo configurável
- Tipos: 'simple', 'double', 'chevron', 'dashed'
- `PropertyPanel` quando `type === 'arrow'` mostra seletor de estilo
- `setArrowStyle(obj, style)`: altera `strokeDashArray` e forma da ponta

### Validação
- [ ] Selecionar seta → seletor de estilo aparece
- [ ] Chevrón → triângulo fechado na ponta
- [ ] Tracejada → linha com `strokeDashArray: [8, 4]`

---

## B.1 — Smart guides (snapping)

**Arquivo novo**: `src/hooks/useSnapping.ts`
**Arquivos que mudam**: `useEditor.ts`

### Implementação
- `useSnapping(canvas, options?)`: hook que observa `object:moving`
- Para cada objeto sendo movido, calcula snap points vs outros objetos:
  - Bordas (top, bottom, left, right)
  - Centros (centerX, centerY)
- Se distância < 5px, ajusta `obj.left`/`obj.top`
- Desenha guide line temporária (fabric.Line)
- Remove guide line em `mouse:up`
- Não snap com `activeSelection` (grupo de seleção)

### Validação
- [ ] Mover rect perto de outro → snap a <5px
- [ ] Guide line aparece durante snap
- [ ] Soltar → guide line desaparece

---

## B.4 — Réguas

**Arquivo novo**: `src/components/editor/Rulers.tsx`
**Arquivos que mudam**: `Editor.tsx`

### Implementação
- `Rulers.tsx`: componente que renderiza régua horizontal e vertical
- `useState<{x, y}>` para posição do cursor (atualizado via `onMouseMove` no canvas container)
- Marcas: a cada 10px (zoom < 50%), 20px (50-100%), 50px (>100%)
- Cores: fundo #F8F9FA, bordas #E2E8F0, texto #94A3B8

### Validação
- [ ] Toggle rulers → aparecem/desaparecem
- [ ] Mover mouse → indicador de posição

---

## Validação final da Sprint

```bash
npm run build
# Compiled successfully
```

Commits sugeridos:
- `feat: pixel alignment with zoom-aware rounding`
- `feat: aspect ratio lock for objects`
- `feat: arrow library with 4 styles`
- `feat: smart guides with snapping`
- `feat: rulers with cursor tracking`
