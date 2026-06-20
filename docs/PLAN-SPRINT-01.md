# Plano de Implementação — Sprint 0.1

> 5 bugs do histórico e seleção
> Base: `editor` branch
> Estimativa: ~2-3h

---

## T0.1.1 — Corrigir Ctrl+A (F0.1)

**Arquivo**: `src/hooks/useEditor.ts:1051`  
**Tempo**: 5min  
**Branch**: `fix/f0-1-ctrl-a`

### Problema
O filtro `!(o as any).evented === false || !(o as any).selectable === false` tem lógica invertida — objetos com `evented: false` passam no filtro.

### Fix
Trocar `||` por `&&` e inverter a lógica para só incluir objetos que são **simultaneamente** evented E selectable:

```typescript
const selectable = canvas.getObjects().filter(
  o => (o as any).evented !== false && (o as any).selectable !== false
);
```

### Validação
1. Abrir `editor/new`
2. Adicionar 1 rect + 1 circle (grid aparece automaticamente)
3. Pressionar Ctrl+A
4. **Esperado**: rect e circle selecionados. Grid não selecionada.
5. Mover seleção — grid não acompanha.

---

## T0.1.2 — Investigar/Corrigir saveHistory duplicado (F0.3)

**Arquivo**: `src/hooks/useEditor.ts:322,333,420-427`  
**Tempo**: 30min  
**Branch**: `fix/f0-3-duplicate-history`

### Investigação

O `placementMouseUp` (linha 316) faz:

```
1. canvas.remove(preview)     → linha 322
   → dispara 'object:removed' (linha 424-425)
   → saveHistory()            → estado SEM preview (pre-placement)
2. preview.set(...)           → linha 329
3. canvas.add(preview)        → linha 330
4. saveHistory()              → linha 333 (estado COM o objeto)
```

**Resultado**: O historico ganha 2 entradas no lugar de 1:
- Estado N+1: pre-placement (vazio)
- Estado N+2: com o novo objeto

### Fix

Adicionar flag `isPlacingRef` para suprimir `saveHistory` do evento `object:removed` durante placement:

**1. Declarar ref (após linha 50):**
```typescript
const isPlacingRef = useRef(false);
```

**2. Modificar `object:removed` handler (linha 424-427):**
```typescript
canvas.on('object:removed', () => {
  if (isPlacingRef.current) return;
  saveHistory();
  updateActiveProps();
});
```

**3. Em `placementMouseDown`, antes de `canvas.remove(preview)` (linha ~260):**
```typescript
isPlacingRef.current = true;
```

**4. Em `placementMouseUp`, após `saveHistory()` (linha 333):**
```typescript
saveHistory();
isPlacingRef.current = false;
```

### Validação
1. Adicionar 2 rects (rect A, rect B)
2. Pressionar Ctrl+Z 1x → some rect B (não precisa de 2 undos)
3. Pressionar Ctrl+Z 1x → some rect A
4. Canvas vazio (só grid)

---

## T0.1.3 — Corrigir captureHistory (F0.4)

**Arquivo**: `src/hooks/useEditor.ts:114-119, 876-888`  
**Tempo**: 15min  
**Branch**: `fix/f0-4-capture-history`

### Problema
`captureHistory()` (linha 114-119) sobrescreve todo o histórico:

```typescript
historyRef.current = [state];       // PERDE tudo que veio antes
historyIndexRef.current = 0;
```

Quando `loadJson` chama `captureHistory()` (linha 885), o histórico anterior é perdido. Ctrl+Z após loadJson não funciona.

### Fix
`captureHistory()` deve preservar o histórico existente, apenas trocando o estado **atual**:

```typescript
const captureHistory = useCallback(() => {
  const state = getCanvasState();
  if (!state) return;
  const idx = historyIndexRef.current;
  if (idx >= 0 && idx < historyRef.current.length) {
    historyRef.current[idx] = state;  // troca estado atual
  } else {
    // fallback: se não há nenhum estado, inicia fresh
    historyRef.current = [state];
    historyIndexRef.current = 0;
  }
}, [getCanvasState]);
```

### Validação
1. Init do editor → `historyRef.current` tem 1 entrada
2. Adicionar rect (estado salvo em N+1, index=1)
3. Clicar "Load" com JSON válido → `captureHistory()` troca estado no index atual (1)
4. Pressionar Ctrl+Z 1x → volta ao estado pré-load (inicial)
5. `historyRef.current.length` não cresce descontroladamente

---

## T0.1.4 — Aumentar MAX_HISTORY + configurável (F0.5)

**Arquivo**: `src/hooks/useEditor.ts:6-9, 34, 105`  
**Tempo**: 30min  
**Branch**: `fix/f0-5-max-history`

### Mudanças

**1. Interface `EditorOptions` (linha 6-9):**
```typescript
export interface EditorOptions {
  width: number;
  height: number;
  maxHistory?: number;   // novo
}
```

**2. Hook signature + MAX_HISTORY (linha 34, 105):**
```typescript
export const useEditor = (canvasRef: ..., options: EditorOptions) => {
  const MAX_HISTORY = options.maxHistory ?? 50;
```

### Validação
1. Passar `maxHistory: 5` em `Editor.tsx:57`
2. Adicionar 6 objetos
3. Os primeiros são removidos do histórico (total = 5)
4. Voltar `maxHistory: 200` depois do teste
5. Estado default (`maxHistory` não passado) = 50

### Onde atualizar `Editor.tsx`
```typescript
// linha 57
const editor = useEditor(canvasRef, { width, height, maxHistory: 200 });
```

---

## T0.1.5 — nudgeSelected com saveHistory (F0.10)

**Arquivo**: `src/hooks/useEditor.ts:1096-1105, 1092-1094`  
**Tempo**: 20min  
**Branch**: `fix/f0-10-nudge-history`

### Problema
`nudgeSelected` modifica posição do objeto mas nunca chama `saveHistory()`.  
Ctrl+Z após nudge não funciona.

### Fix

**1. Adicionar ref para debounce (após linha 50):**
```typescript
const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

**2. Modificar `nudgeSelected` (linha 1096-1105):**
```typescript
const nudgeSelected = useCallback((dx: number, dy: number) => {
  const canvas = fabricCanvasRef.current;
  const active = canvas?.getActiveObjects();
  if (!active || active.length === 0) return;
  active.forEach(obj => {
    obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy } as any);
    obj.setCoords();
  });
  canvas?.renderAll();
  // Debounce: salva apenas 200ms após o último nudge
  if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
  nudgeTimerRef.current = setTimeout(() => saveHistory(), 200);
}, [saveHistory]);
```

**3. Adicionar cleanup no useEffect do teclado (linha 1092-1094):**
```typescript
useEffect(() => {
  // ... código existente ...
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
  };
}, [deleteSelected, undo, redo, saveHistory]);
```

### Validação
1. Selecionar objeto
2. Seta direita 3x (3 nudges consecutivos)
3. Pressionar Ctrl+Z 1x → objeto volta 1 passo (não 3 passos)
4. Pressionar Ctrl+Z 2x → objeto volta ao início

---

## Ordem de implementação sugerida

| # | Item | Branch | Risco |
|---|------|--------|-------|
| 1 | F0.1 — Ctrl+A | `fix/f0-1-ctrl-a` | Baixo |
| 2 | F0.5 — MAX_HISTORY | `fix/f0-5-max-history` | Baixo |
| 3 | F0.4 — captureHistory | `fix/f0-4-capture-history` | Médio |
| 4 | F0.3 — duplicate history | `fix/f0-3-duplicate-history` | Médio |
| 5 | F0.10 — nudge history | `fix/f0-10-nudge-history` | Médio |

F0.1 e F0.5 primeiro por serem mudanças isoladas e seguras.  
F0.4 antes de F0.3 porque `captureHistory` é chamado por `loadJson` que pode ser usado para testar o histórico como um todo.

---

## Validação final da Sprint

Após aplicar todos os 5 fixes:

1. `npm run build` passa sem erros
2. Dev server em `editor/new` carrega sem erro de runtime
3. Teste manual:
   - [ ] Ctrl+A seleciona só objetos usuário (exclui grid)
   - [ ] Placement não duplica entrada no histórico
   - [ ] loadJson preserva histórico anterior
   - [ ] MAX_HISTORY configurável via options
   - [ ] Nudge salva no histórico (Ctrl+Z desfaz nudge)
4. Commitar cada branch separadamente ou fazer squash em `fix/sprint-01`
