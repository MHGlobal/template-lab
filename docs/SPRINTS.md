# Sprints — Fase 0

> Baseado em SPEC-F0.md (12 bugs críticos)
> Sprint length: 1 semana cada
> Estimativa total: 1-2 semanas

---

## Sprint 0.1 — Histórico e Seleção

**Duração**: 1 semana
**Itens**: F0.1, F0.3, F0.4, F0.5, F0.10

### Tarefas

#### T0.1.1 — Corrigir Ctrl+A (F0.1)
- **Arquivo**: `src/hooks/useEditor.ts:1051`
- **Mudança**: 1 linha
- **Validação**: Abrir editor, adicionar rect + circle + grid. Ctrl+A seleciona rect+circle apenas. Grid não é selecionada.

#### T0.1.2 — Corrigir saveHistory duplicado (F0.3)
- **Arquivo**: `src/hooks/useEditor.ts:329-335`
- **Mudança**: Investigar se `setActiveTool` dispara history. Se sim, trocar por `setActiveToolState`.
- **Validação**: Adicionar 2 rects. Undo 1x → some o último rect. Undo 2x → suma o primeiro. Não deve precisar de 3+ undos.

#### T0.1.3 — Corrigir captureHistory (F0.4)
- **Arquivo**: `src/hooks/useEditor.ts:117`
- **Mudança**: 1-2 linhas
- **Validação**: 
  1. Init do editor → histórico tem 1 entrada
  2. loadJson → histórico não perde estado anterior
  3. Undo após loadJson funciona

#### T0.1.4 — Aumentar MAX_HISTORY (F0.5)
- **Arquivo**: `src/hooks/useEditor.ts:105`
- **Mudança**: `50` → `200`, adicionar `maxHistory` em `EditorOptions`
- **Validação**: `maxHistory: 5` no editor → após 5 ações, as primeiras são removidas

#### T0.1.5 — nudgeSelected com saveHistory (F0.10)
- **Arquivo**: `src/hooks/useEditor.ts:1103`
- **Mudança**: Adicionar `saveHistory()` e dependência no useCallback
- **Validação**: Selecionar objeto, seta direita 3x. Ctrl+Z 3x → volta ao início.

---

## Sprint 0.2 — Shapes, Camadas e Dados

**Duração**: 1 semana
**Itens**: F0.2, F0.6, F0.7, F0.8, F0.9, F0.11, F0.12

### Tarefas

#### T0.2.1 — strokeUniform nas formas (F0.2)
- **Arquivo**: `src/hooks/useEditor.ts:174-225`
- **Mudança**: Adicionar `strokeUniform: true` em cada `new fabric.Rect/Circle/Ellipse/Triangle/Polygon`
- **Validação**: Criar rect com strokeWidth=8. Redimensionar. Stroke permanece 8px.

#### T0.2.2 — Preservar data.id no loadJson (F0.6)
- **Arquivo**: `src/hooks/useEditor.ts:883-887`
- **Mudança**: Adicionar `obj.data = obj.data || {}` após loadFromJSON
- **Validação**: Exportar JSON com objeto que tem `data.id`. Importar JSON de volta. Objeto mantém `data.id`.

#### T0.2.3 — ReorderLayer usar índice consistente (F0.7)
- **Arquivo**: `src/hooks/useEditor.ts:1138-1150`
- **Mudança**: Garantir que reorderLayer usa canvas.getObjects().indexOf() corretamente
- **Validação**: Adicionar 3 objetos (A, B, C). Arrastar C para índice 0 → ordem C, A, B. Arrastar B para índice 2 → C, A, B.

#### T0.2.4 — Visibilidade sem opacity check (F0.8)
- **Arquivo**: `src/components/editor/LayerPanel.tsx:92`
- **Mudança**: Remover `&& (item.obj as any).opacity !== 0`
- **Validação**: Objeto com opacity=0 aparece como visível no LayerPanel. Objeto com visible=false aparece como invisível.

#### T0.2.5 — WeakMap para savedOpacity (F0.9)
- **Arquivo**: `src/hooks/useEditor.ts:1113-1118`
- **Mudança**: Criar `useRef(new WeakMap())`, usar `savedOpacityMap.get/set` em vez de `_savedOpacity`
- **Validação**: 
  1. Objeto com opacity=0.3. Toggle OFF → ON → opacity=0.3
  2. Múltiplos objetos não compartilham opacidade salva

#### T0.2.6 — Alt+clique duplicar (F0.11)
- **Arquivo**: `src/hooks/useEditor.ts` (evento mouse:down)
- **Mudança**: Adicionar detecção de `opt.e.altKey` + `canvas.getActiveObject()` no início do mouse:down
- **Validação**: 
  1. Selecionar objeto. Alt+clique → objeto duplicado com +20/+20
  2. Sem seleção, Alt+clique → comportamento normal (placement)
  3. Undo após duplicar funciona

#### T0.2.7 — Dashboard + Library reais (F0.12)
- **Arquivos**: `src/app/page.tsx`, `src/app/library/page.tsx`
- **Mudança**: Adicionar `'use client'`, estado templates, useEffect para carregar, loading/empty states
- **Validação**:
  1. Dashboard mostra contagens reais
  2. Library lista templates com nome/categoria/tags
  3. Loading spinner aparece durante carregamento
  4. "Nenhum template" quando lista vazia
  5. Fallback localStorage funciona sem Supabase

---

## Sprint atual

| Sprint | Status | Itens |
|--------|--------|-------|
| Sprint 0.1 | Pendente | F0.1, F0.3, F0.4, F0.5, F0.10 |
| Sprint 0.2 | Pendente | F0.2, F0.6, F0.7, F0.8, F0.9, F0.11, F0.12 |

## Critérios de done da Fase 0

- [ ] Todos os 12 bugs corrigidos e commitados
- [ ] `npm run build` passa sem erros
- [ ] Dev server consegue carregar `/editor/new`
- [ ] Teste manual dos 12 itens conforme acceptance criteria

## Como iniciar uma sprint

1. Mover tarefas do sprint para `TODO`
2. Para cada tarefa, criar branch `fix/f0-{numero}-{descricao}`
3. Implementar conforme SPEC-F0.md
4. Validar acceptance criteria
5. Commitar e fazer PR para `editor`
6. Mover para `Done` no board
