# SPEC-F0 — Correções Críticas (Phase 0)

> **Objetivo**: Corrigir 12 bugs bloqueantes no editor Template Lab.
> **Arquivo principal**: `src/hooks/useEditor.ts` (10 dos 12 bugs)
> **Estimativa**: 1-2 dias de trabalho

---

## F0.1 — Ctrl+A seleciona objetos não-selecionáveis

**Arquivo**: `src/hooks/useEditor.ts:1051`

**Contexto atual**:
```typescript
case 'a':
case 'A':
  if (ctrl) {
    e.preventDefault();
    const selectable = canvas.getObjects().filter(
      o => !(o as any).evented === false || !(o as any).selectable === false
    );
```

**Problema**: A expressão `!(o as any).evented === false` é avaliada como:
1. `!(o.evented)` → se evented for `false`, vira `true`
2. `true === false` → `false`
3. Se evented for `true`, vira `false`, `false === false` → `true`

Matematicamente: `!(o.evented) === false` equivale a `!!o.evented === true`, ou seja, SEMPRE retorna `true` quando evented é `true` (a condição do filtro). Inclui objetos com `selectable: false` ou `evented: false`.

**Correção**:
```typescript
const selectable = canvas.getObjects().filter(
  o => o.selectable !== false && o.evented !== false
);
```

**Critérios de aceitação**:
- [ ] Ctrl+A seleciona apenas objetos selecionáveis (exclui grid e objetos com evented:false)
- [ ] Objetos com `lockMovementX: true` ainda são selecionáveis (só não movíveis)
- [ ] Grades não são incluídas na seleção

---

## F0.2 — strokeUniform ausente em formas

**Arquivo**: `src/hooks/useEditor.ts:174-225`

**Contexto atual**: Nenhuma das 7 formas (rect, rounded-rect, circle, ellipse, triangle, line, star, polygon) define `strokeUniform`.

**Problema**: No Fabric.js, o padrão `strokeUniform: false` faz com que a espessura do stroke escale com o objeto. Ao redimensionar um retângulo com `strokeWidth: 2`, o stroke visual pode virar 4px ou mais.

**Correção**: Adicionar `strokeUniform: true` na criação de cada forma:

```typescript
case 'rect':
  return new fabric.Rect({
    left: x, top: y, width: absW, height: absH,
    fill: colors.rect, stroke: '#000000', strokeWidth: 0, strokeUniform: true,
  });
// ... todas as formas
```

**Critérios de aceitação**:
- [ ] rect com strokeWidth: 4 mantém 4px ao redimensionar
- [ ] circle, ellipse, triangle, rounded-rect com stroke mantêm espessura constante
- [ ] polygon e star mantêm stroke constante

---

## F0.3 — saveHistory duplicado em placementMouseUp

**Arquivo**: `src/hooks/useEditor.ts:329-335`

**Contexto atual**:
```typescript
preview.set({ selectable: true, evented: true, opacity: 1 } as any);
canvas.add(preview);
canvas.setActiveObject(preview);
canvas.renderAll();
saveHistory();
setActiveTool('select');  // ← setActiveTool chama outro saveHistory?
```

**Problema**: `setActiveTool('select')` dispara `toolChange` que, quando 'select', pode ou não chamar saveHistory dependendo da implementação. Dentro de `placementMouseUp` já temos `saveHistory()` explícito na linha 333. Se `setActiveTool` também salvar, teremos histórico duplicado.

**Correção**:
1. Verificar se `setActiveTool('select')` dispara saveHistory em toolChange
2. Se sim: substituir `setActiveTool('select')` por `setActiveToolState('select')` direto
3. Se não: o saveHistory em 333 é suficiente

Além disso, verificar todo fluxo de `mouse:up` para `tool !== 'arrow' && tool !== 'select' && tool !== 'draw'` — em `placementMouseUp` o tool foi setado antes, mas check adicional pode ser necessário.

**Critérios de aceitação**:
- [ ] Colocar um rect não gera 2 entradas no histórico
- [ ] Undo após colocar rect volta ao estado anterior corretamente
- [ ] setActiveTool('select') não introduz history extra

---

## F0.4 — captureHistory reseta array em vez de inicializar

**Arquivo**: `src/hooks/useEditor.ts:114-119`

**Contexto atual**:
```typescript
const captureHistory = useCallback(() => {
  const state = getCanvasState();
  if (!state) return;
  historyRef.current = [state];    // ← reseta, mas isso é OK na inicialização
  historyIndexRef.current = 0;
}, [getCanvasState]);
```

**Problema**: `captureHistory` é chamado UMA vez na inicialização (useEffect da linha 416). O reset é intencional para o `.length = 0`. Mas se for chamado novamente (ex.: loadJson linha 885), o histórico inteiro é perdido.

**Correção**: Manter como está para init, mas em `loadJson` garantir que `captureHistory` não seja chamado se já houver histórico. Ou trocar `loadJson` para usar `saveHistory()` em vez de `captureHistory()`.

```typescript
// Opção A: em loadJson, usar saveHistory em vez de captureHistory
const loadJson = useCallback((json: any) => {
  const canvas = fabricCanvasRef.current;
  if (!canvas || !json) return;
  if (!json.objects || !Array.isArray(json.objects)) return;
  canvas.loadFromJSON(json).then(() => {
    if (!fabricCanvasRef.current) return;
    captureHistory();  // ← trocar para:
    // historyRef.current = [];
    // saveHistory();
    updateActiveProps();
  });
}, [captureHistory, updateActiveProps]);

// Opção B: captureHistory só resetar se vazio
const captureHistory = useCallback(() => {
  const state = getCanvasState();
  if (!state) return;
  if (historyRef.current.length === 0) {
    historyRef.current = [state];
    historyIndexRef.current = 0;
  }
}, [getCanvasState]);
```

**Critérios de aceitação**:
- [ ] loadJson não perde o histórico existente
- [ ] Init do editor sempre tem estado inicial no histórico

---

## F0.5 — MAX_HISTORY = 50 muito baixo

**Arquivo**: `src/hooks/useEditor.ts:105`

**Contexto atual**:
```typescript
const MAX_HISTORY = 50;
```

**Problema**: Projetos complexos podem ter centenas de ações. 50 entradas é pouco para uso profissional.

**Correção**:
```typescript
const MAX_HISTORY = 200;
```

E tornar configurável via `EditorOptions`:
```typescript
export interface EditorOptions {
  width: number;
  height: number;
  maxHistory?: number;
}

// No hook:
const MAX_HISTORY = options.maxHistory ?? 200;
```

**Critérios de aceitação**:
- [ ] Editor aceita prop `maxHistory`
- [ ] Padrão é 200
- [ ] Histórico respeita o limite configurado

---

## F0.6 — loadJson perde data.id dos objetos

**Arquivo**: `src/hooks/useEditor.ts:883-887`

**Contexto atual**:
```typescript
canvas.loadFromJSON(json).then(() => {
  if (!fabricCanvasRef.current) return;
  captureHistory();
  updateActiveProps();
});
```

**Problema**: `loadFromJSON` desserializa objetos mas NÃO preserva a propriedade `data` customizada (incluindo `data.id`, `data.type`). Objetos carregados perdem seus identificadores.

**Correção**: Restaurar `data` de cada objeto após carregar:
```typescript
canvas.loadFromJSON(json).then(() => {
  if (!fabricCanvasRef.current) return;
  const canvas = fabricCanvasRef.current;
  canvas.getObjects().forEach((obj: any) => {
    // data pode vir no JSON se foi serializado com toJSON()
    // mas se não veio, garantir que existe
    obj.data = obj.data || {};
  });
  captureHistory();
  updateActiveProps();
});
```

**Critérios de aceitação**:
- [ ] Objetos com `data.id` no JSON preservam o ID após load
- [ ] Objetos sem `data` recebem `data = {}`
- [ ] Grid lines (data.type === 'grid') são filtradas antes do load

---

## F0.7 — getCanvasObjects vs reorderLayer dessincronia

**Arquivo**: `src/hooks/useEditor.ts:1108-1151`

**Contexto atual**:
```typescript
// getCanvasObjects (linha 1108)
return fabricCanvasRef.current.getObjects().map((obj, index) => ({ obj, index }));

// reorderLayer (linha 1138)
const objects = canvas.getObjects();
const currentIndex = objects.indexOf(obj);
```

**Problema**: `getCanvasObjects()` retorna o índice do array, mas `reorderLayer()` chama `indexOf()` que busca por referência. Em cenários com `ActiveSelection` ou objetos duplicados na memória, `indexOf` pode retornar -1 ou índice errado.

**Correção**: Usar `getObjects().indexOf()` no reorderLayer (já está correto atualmente), mas garantir que:
1. O índice retornado por `getCanvasObjects` seja o mesmo usado no `reorderLayer`
2. Tratar caso `indexOf` retorne -1 (objeto não encontrado) — já existe

Melhor ainda: unificar fonte da verdade:
```typescript
const reorderLayer = useCallback((obj: fabric.FabricObject, newIndex: number) => {
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;
  const objects = canvas.getObjects();
  const currentIndex = objects.indexOf(obj);
  if (currentIndex === -1 || currentIndex === newIndex) return;
  if (currentIndex < newIndex) {
    for (let i = currentIndex; i < newIndex; i++) canvas.bringObjectForward(obj);
  } else {
    for (let i = newIndex; i < currentIndex; i++) canvas.sendObjectBackwards(obj);
  }
  canvas.renderAll();
  saveHistory();
}, [saveHistory]);
```

**Critérios de aceitação**:
- [ ] Arrastar layer no LayerPanel reposiciona corretamente
- [ ] Objeto vai para o índice exato solto
- [ ] Nenhum erro "indexOf retornou -1"

---

## F0.8 — Visibilidade usa opacity em vez de visible

**Arquivo**: `src/components/editor/LayerPanel.tsx:92`

**Contexto atual**:
```typescript
const vis = (item.obj as any).visible !== false && (item.obj as any).opacity !== 0;
```

**Problema**: Se o usuário define `opacity: 0` intencionalmente (ex.: para uma animação fade-in), o LayerPanel mostra o objeto como invisível, mesmo que `visible: true`.

**Correção**:
```typescript
const vis = (item.obj as any).visible !== false;
```

**Critérios de aceitação**:
- [ ] Objeto com `visible: true` e `opacity: 0` aparece como VISÍVEL no LayerPanel
- [ ] Objeto com `visible: false` aparece como INVISÍVEL (eye-off)
- [ ] Toggle visibility via LayerPanel funciona corretamente

---

## F0.9 — setLayerVisibility usa _savedOpacity que colide

**Arquivo**: `src/hooks/useEditor.ts:1113-1118`

**Contexto atual**:
```typescript
const setLayerVisibility = useCallback((obj: fabric.FabricObject, visible: boolean) => {
  if (!fabricCanvasRef.current) return;
  obj.set({ visible, opacity: visible ? (obj as any)._savedOpacity || 1 : 0 });
  if (!visible) (obj as any)._savedOpacity = obj.opacity;
  fabricCanvasRef.current.renderAll();
}, []);
```

**Problema**: `_savedOpacity` é uma propriedade direta no objeto (`(obj as any)._savedOpacity`). Se múltiplos objetos forem manipulados em sequência (ex.: ActiveSelection), a propriedade pode ser lida/escrita no objeto errado. Além disso, não há proteção contra opacity já ser 0.

**Correção**: Usar `WeakMap` para armazenar opacidade salva:
```typescript
const savedOpacityMap = useRef(new WeakMap<fabric.FabricObject, number>()).current;

const setLayerVisibility = useCallback((obj: fabric.FabricObject, visible: boolean) => {
  if (!fabricCanvasRef.current) return;
  if (visible) {
    const saved = savedOpacityMap.get(obj) ?? 1;
    obj.set({ visible: true, opacity: saved });
  } else {
    savedOpacityMap.set(obj, obj.opacity ?? 1);
    obj.set({ visible: false, opacity: 0 });
  }
  fabricCanvasRef.current.renderAll();
}, []);
```

**Critérios de aceitação**:
- [ ] Toggle visibility ON restaura a opacidade exata que o objeto tinha
- [ ] WeakMap não vaza memória (objetos removidos são GC coletados)
- [ ] Objetos com opacity = 0.5, toggle OFF → ON mantém 0.5

---

## F0.10 — nudgeSelected sem saveHistory

**Arquivo**: `src/hooks/useEditor.ts:1096-1105`

**Contexto atual**:
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
}, []);
```

**Problema**: Navegar com setas move o objeto mas não salva no histórico. Usuário não consegue desfazer um nudge.

**Correção**: Adicionar dependência `saveHistory` e chamar ao final:
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
  saveHistory();
}, [saveHistory]);
```

**Critérios de aceitação**:
- [ ] Mover objeto com setas (1px) cria entrada no histórico
- [ ] Ctrl+Z após nudge restaura posição anterior
- [ ] Shift+setas (10px) também salva histórico
- [ ] Mover objeto vazio (canvas sem seleção) não crasha

---

## F0.11 — Falta atalho Alt+drag para duplicar

**Arquivo**: `src/hooks/useEditor.ts:994`

**Contexto atual**: Handler de teclado NÃO tem nenhum atalho para duplicar que não seja Ctrl+D (que só funciona com objeto selecionado).

**Problema**: No Figma/Sketch, Alt+arrasto duplica o objeto. Essa é uma das interações mais usadas em editores visuais e não existe no Template Lab.

**Correção**: Adicionar no handler de `mouse:down`:
```typescript
canvas.on('mouse:down', (opt) => {
  if (opt.e.altKey && canvas.getActiveObject()) {
    const active = canvas.getActiveObject();
    active.clone().then((clone: fabric.Object) => {
      clone.set({ left: (clone.left ?? 0) + 20, top: (clone.top ?? 0) + 20 });
      canvas.add(clone);
      canvas.setActiveObject(clone);
      canvas.renderAll();
      saveHistory();
    });
    return;
  }
  if (activeToolRef.current === 'arrow') arrowMouseDown(opt);
  else placementMouseDown(opt);
});
```

**Critérios de aceitação**:
- [ ] Alt+clique em objeto selecionado duplica com offset +20/+20
- [ ] Objeto duplicado fica selecionado
- [ ] Undo funciona após duplicar
- [ ] Alt+clique em canvas vazio não faz nada (ou cria shape, como Figma)

---

## F0.12 — Dashboard e Library com dados mockados

**Arquivos**: `src/app/page.tsx`, `src/app/library/page.tsx`

**Contexto atual**:
- Dashboard: `stats` hardcoded `['12', '8', '3', '1']` + templates recentes `[1, 2, 3]` (linhas 13-18, 60)
- Library: `[1, 2, 3, 4, 5, 6, 7, 8]` mapeados como cards fictícios (linha 47)

**Problema**: Nenhum dado real é carregado. Usuário vê informações falsas.

**Correção**:

**Dashboard** (`src/app/page.tsx`):
```typescript
'use client';
// ...imports...
import { templateService } from '@/services/templateService';

export default function Dashboard() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    templateService.getTemplates().then(data => {
      setTemplates(data);
      setLoading(false);
    });
  }, []);

  const stats = [
    { label: 'Total Templates', value: templates.length.toString(), icon: ImageIcon, color: 'text-blue-500' },
    { label: 'Aprovados', value: templates.filter(t => t.status === 'approved').length.toString(), icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Pendentes', value: templates.filter(t => t.status === 'pending').length.toString(), icon: Clock, color: 'text-yellow-500' },
    { label: 'Com Erro', value: templates.filter(t => t.status === 'error').length.toString(), icon: AlertCircle, color: 'text-red-500' },
  ];
  // ...
}
```

**Library** (`src/app/library/page.tsx`):
```typescript
const [templates, setTemplates] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  templateService.getTemplates().then(data => {
    setTemplates(data);
    setLoading(false);
  });
}, []);

// Em vez de [1,2,3...], mapear templates:
{templates.map((template) => (
  <div key={template.id}>...
```

**Critérios de aceitação**:
- [ ] Dashboard mostra contagens reais (templateService.getTemplates())
- [ ] Library lista templates reais com thumbnail/name/category/tags
- [ ] Loading state enquanto carrega
- [ ] Empty state quando não há templates
- [ ] Fallback localStorage funciona sem Supabase
- [ ] Filtro por categoria funciona com dados reais

---

## Resumo de esforço

| Item | Arquivos | Linhas para alterar | Complexidade |
|------|----------|-------------------|--------------|
| F0.1 | useEditor.ts:1051 | 1 | ★☆☆ |
| F0.2 | useEditor.ts:174-225 | 7 | ★☆☆ |
| F0.3 | useEditor.ts:329-335 | 1 | ★★☆ |
| F0.4 | useEditor.ts:117, 885 | 2 | ★★☆ |
| F0.5 | useEditor.ts:105 | 1 | ★☆☆ |
| F0.6 | useEditor.ts:883-887 | 5 | ★★☆ |
| F0.7 | useEditor.ts:1138-1150 | 5 | ★★☆ |
| F0.8 | LayerPanel.tsx:92 | 1 | ★☆☆ |
| F0.9 | useEditor.ts:1113-1118 | 10 | ★★★ |
| F0.10 | useEditor.ts:1096-1105 | 2 | ★☆☆ |
| F0.11 | useEditor.ts (mouse:down) | 10 | ★★★ |
| F0.12 | page.tsx, library/page.tsx | 40 | ★★☆ |
