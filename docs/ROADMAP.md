# Template Lab — Roadmap de Implementação

> **Projeto**: Editja Template Lab (Next.js 14 + Fabric.js 6 + Supabase)
> **Última atualização**: 2026-06-20
> **Total de itens**: 112

---

## Fase 0 — Correções Críticas (P0)

### 0.1 Bug Ctrl+A
- **Arquivo**: `src/hooks/useEditor.ts:1051`
- **Problema**: Condição `!(o as any).evented === false || !(o as any).selectable === false` é sempre true
- **Correção**: Trocar por `o.selectable !== false && o.evented !== false`

### 0.2 strokeUniform em formas geométricas
- **Arquivo**: `src/hooks/useEditor.ts:175-225`
- **Problema**: Ao redimensionar, strokeWidth distorce em rect/ellipse
- **Correção**: Adicionar `strokeUniform: true` em toda criação de shape

### 0.3 saveHistory inconsistente
- **Arquivo**: `src/hooks/useEditor.ts:334`
- **Problema**: setActiveTool('select') em placementMouseUp força novo history logo após saveHistory
- **Correção**: Remover saveHistory extra ou usar flag isInternalHistory

### 0.4 captureHistory reseta array
- **Arquivo**: `src/hooks/useEditor.ts:117`
- **Problema**: `historyRef.current = [state]` zera histórico
- **Correção**: Trocar para `historyRef.current = state ? [state] : []`

### 0.5 MAX_HISTORY baixo
- **Arquivo**: `src/hooks/useEditor.ts:105`
- **Correção**: Subir para 200 e tornar configurável via prop

### 0.6 loadJson perde data.id
- **Arquivo**: `src/hooks/useEditor.ts:876`
- **Correção**: Adicionar `obj.data = obj.data || {}` no callback após loadFromJSON

### 0.7 getCanvasObjects vs reorderLayer dessincronia
- **Arquivo**: `src/hooks/useEditor.ts:1108-1151`
- **Correção**: Usar exclusivamente o index retornado por getObjects() em vez de indexOf

### 0.8 Visibilidade por opacity no LayerPanel
- **Arquivo**: `src/components/editor/LayerPanel.tsx:92`
- **Correção**: Usar `obj.visible !== false` em vez de `obj.opacity !== 0`

### 0.9 setLayerVisibility com _savedOpacity
- **Arquivo**: `src/hooks/useEditor.ts:1115`
- **Problema**: _savedOpacity pode colidir em seleções múltiplas
- **Correção**: Usar WeakMap<FabricObject, number> para estado salvo

### 0.10 nudgeSelected sem saveHistory
- **Arquivo**: `src/hooks/useEditor.ts:1096`
- **Correção**: Adicionar saveHistory() ao final do nudge

### 0.11 Ctrl+Shift sem atalho
- **Arquivo**: `src/hooks/useEditor.ts:994`
- **Correção**: Implementar Alt+drag para duplicar (padrão Figma)

### 0.12 Dashboard/Library com dados mock
- **Arquivo**: `src/app/page.tsx`, `src/app/library/page.tsx`
- **Correção**: Substituir placeholders [1,2,3] por leitura real de templateService.getTemplates()

---

## Fase 1 — Funcionalidades Core (P1 Mercado)

### 1.1 Multi-page / Multi-canvas
- Navegação de páginas (pages[]) com barra inferior
- Criar/renomear/duplicar/remover páginas
- Cada página tem seu próprio fabric_json + fundo
- **Arquivos**: `src/hooks/useEditor.ts` (pages state), `src/components/editor/PageBar.tsx`

### 1.2 Variáveis dinâmicas em texto
- Suporte a `{{nome_cliente}}`, `{{data}}`, `{{preco}}`
- Painel "Substituir variáveis" com preview
- **Arquivos**: `src/components/editor/VariablesPanel.tsx`, `src/hooks/useVariables.ts`

### 1.3 Rich-text avançado
- Parâgrafos, listas ordenadas/não ordenadas
- Negrito/itálico/sublinhado por seleção
- **Arquivos**: `src/components/editor/RichTextToolbar.tsx`, extender `propertyPanel`

### 1.4 Máscaras e clipping
- Image mask retangular/circular/personalizada
- Crop tool com handles de canto
- **Arquivos**: `src/hooks/useMask.ts`, `src/components/editor/CropTool.tsx`

### 1.5 Componentes reutilizáveis
- Salvar objeto como "componente" no painel Assets
- Arrastar do Assets para instanciar
- Sincronização por referência (editar um = atualizar todos)
- **Arquivos**: `src/hooks/useComponents.ts`, `src/components/editor/AssetsPanel.tsx`

### 1.6 Auto-layout flex
- Container com direção (row/column), gap, padding
- Objetos filhos reposicionam automaticamente
- **Arquivos**: `src/hooks/useAutoLayout.ts`, `src/components/editor/AutoLayoutPanel.tsx`

### 1.7 Smart guides (snapping)
- Snap a bordas do canvas, centros de objetos
- Guias temporárias ao mover
- Ângulos 0/45/90° ao girar
- **Arquivos**: `src/hooks/useSnapping.ts`

### 1.8 Alinhamento a pixel
- Forçar alinhamento ao grid de pixels quando zoom > 100%
- **Arquivo**: `src/hooks/useEditor.ts` (modificar setPosition/setSize)

### 1.9 Constraint groups
- Fixar proporção (aspect ratio lock) por objeto/grupo
- **Arquivo**: `src/hooks/useEditor.ts`

### 1.10 Mais formas
- Coração, balão de fala, pentágono, hexágono, estrela multicanais
- Linha tracejada com strokeDashArray presets
- **Arquivo**: `src/hooks/useEditor.ts` (extender createShape)

### 1.11 Pen tool (Bezier)
- Criação de paths customizados via clique + arrasto
- Edição de pontos de ancoragem
- **Arquivos**: `src/hooks/usePenTool.ts`, `src/components/editor/PathEditor.tsx`

### 1.12 Biblioteca de setas
- Ponta simples, dupla, chevron
- Lucide icons como vetores
- **Arquivo**: `src/hooks/useEditor.ts` (extender arrow tool)

### 1.13 Sombras e brilhos
- Drop shadow, outer glow, inner shadow
- Configuráveis (offset, blur, cor, spread)
- **Arquivos**: `src/components/editor/ShadowPanel.tsx`, `src/hooks/useShadow.ts`

### 1.14 Gradientes
- Linear e radial no painel de preenchimento
- Editor de pontos de gradiente
- **Arquivos**: `src/components/editor/GradientPanel.tsx`, `src/hooks/useGradient.ts`

### 1.15 Pattern fill
- Arrastar imagem para o swatch = pattern fill
- **Arquivo**: `src/hooks/useEditor.ts`

### 1.16 Texto em curva
- fabric.IText sobre path (círculo, arco, path customizado)
- **Arquivo**: `src/hooks/useTextPath.ts`

### 1.17 QR Code nativo
- Gerar QR code dentro do editor (qr-code-styling ou qrcode)
- Útil para validação ecommerce (templateValidator.ts)
- **Arquivo**: `src/hooks/useQRCode.ts`

### 1.18 Embed SVG externo
- Drag & drop SVG → fabric loadSVGFromURL
- **Arquivo**: `src/hooks/useEditor.ts` (extender addImage)

### 1.19 Tabela / grid de células
- Grid com edição de texto por célula
- Essencial para templates de e-commerce/business
- **Arquivo**: `src/hooks/useTable.ts`

### 1.20 Modelos de tamanho (artboards)
- Dropdown com Instagram Post/Story/Reel, Facebook Cover, LinkedIn, YouTube Thumbnail, A4/A5
- **Arquivo**: `src/components/editor/ArtboardSelector.tsx`

### 1.21 Fundo do canvas personalizável
- Cor sólida, gradiente, imagem por página
- **Arquivo**: `src/hooks/useEditor.ts` (extender toggleGrid)

### 1.22 Réguas (Rulers)
- Réguas laterais com posição do pointer
- Unidade px/mm/in configurável
- **Arquivo**: `src/components/editor/Rulers.tsx`

### 1.23 Safe zone overlay
- Overlay visual para Instagram stories (250px topo/rodapé)
- Integrar com validateSocialMedia (templateValidator.ts)
- **Arquivo**: `src/components/editor/SafeZoneOverlay.tsx`

### 1.24 Suporte a PDF
- Importar PDF página-a-página (pdfjs-dist)
- Exportar PDF multipágina (jsPDF)
- **Arquivos**: `src/hooks/usePDF.ts`, `src/components/editor/PDFImportDialog.tsx`

### 1.25 Animações + timeline
- FadeIn/SlideIn/Scale com keyframes
- Timeline visual (play/pause/stop)
- Exportar GIF/MP4
- **Arquivos**: `src/hooks/useAnimation.ts`, `src/components/editor/Timeline.tsx`

### 1.26 Transições de página
- Animação entre páginas (slide, fade)
- **Arquivo**: `src/hooks/useEditor.ts`

---

## Fase 2 — UI/UX e Atalhos (P1 UX)

### 2.1 Paleta de comandos
- ⌘K / Ctrl+K com busca de ações
- "Trazer ao centro", "Agrupar", "Exportar PNG"
- **Arquivo**: `src/components/editor/CommandPalette.tsx`

### 2.2 Mini-map
- Miniatura do canvas no canto inferior direito
- Navegação por clique/arrasto
- **Arquivo**: `src/components/editor/MiniMap.tsx`

### 2.3 Zoom adaptativo
- Quando zoom < 25%, mostrar versão esquematizada
- **Arquivo**: `src/hooks/useEditor.ts`

### 2.4 Tema escuro
- Modo dark completo com CSS variables
- Toggle no header
- **Arquivo**: `src/providers/ThemeContext.tsx`, `src/app/globals.css`

### 2.5 Drag múltiplo de arquivos
- Arrastar múltiplas imagens/SVGs/JSON para o canvas
- **Arquivo**: `src/hooks/useEditor.ts` (extender eventos de drop)

### 2.6 Drag do sistema de arquivos
- Arrastar imagem do explorer direto para o canvas
- **Arquivo**: `src/components/editor/Editor.tsx` (eventos onDrop)

### 2.7 Marquee select invertido
- Clique direito sobre seleção = inverter seleção
- **Arquivo**: `src/hooks/useEditor.ts`

### 2.8 Hover highlights
- Ao passar mouse em layer do painel, realçar objeto no canvas
- Ao passar mouse em objeto, destacar no painel de camadas
- **Arquivo**: `src/components/editor/LayerPanel.tsx`

### 2.9 Snapshots / versões
- Salvar versão nomeada do projeto
- Navegar entre versões (V0, V1...)
- **Arquivos**: `src/hooks/useVersioning.ts`, `src/components/editor/VersionPanel.tsx`

### 2.10 Comentários
- Marcação de feedbacks em posições específicas
- Camada "comments" no canvas
- **Arquivos**: `src/hooks/useComments.ts`, `src/components/editor/CommentTool.tsx`

### 2.11 Toolbar reordenável
- Usuário arrasta ferramentas para personalizar
- **Arquivo**: `src/components/editor/Toolbar.tsx`

### 2.12 Tooltips padronizados
- Todos os botões com tooltip + atalho
- **Arquivo**: `src/components/editor/` (todos os componentes)

### 2.13 Painéis redimensionáveis
- Header direito (w-72 → variável)
- Toolbar esquerda (w-14 → variável)
- **Arquivo**: `src/components/editor/Editor.tsx`

### 2.14 Split panes flutuantes
- Painéis dockable com Floating-ui
- **Arquivo**: `src/components/editor/SplitPane.tsx`

### 2.15 Modo Foco
- F11 esconde tudo menos canvas
- **Arquivo**: `src/hooks/useEditor.ts`

### 2.16 Status bar
- Número de objetos, área total (px²), posição do histórico
- **Arquivo**: `src/components/editor/StatusBar.tsx`

### 2.17 Toast/Snackbar
- Sistema centralizado de notificações
- Substitui texto no botão de salvar
- **Arquivo**: `src/providers/ToastContext.tsx`

### 2.18 Bloqueio de fechamento
- beforeunload se houver mudanças não salvas
- **Arquivo**: `src/hooks/useEditor.ts`

### 2.19 Salvar como
- "Salvar como" com versionamento de template
- **Arquivo**: `src/components/editor/SaveAsDialog.tsx`

### 2.20 Gestos de trackpad
- Pinch zoom e two-finger pan
- **Arquivo**: `src/hooks/useEditor.ts`

### 2.21 Toggle grid com snap
- Grid magnético (snap) quando grid está visível
- **Arquivo**: `src/hooks/useEditor.ts`

### 2.22 OVERLAY de atalhos
- Modal "?" com lista completa de shortcuts
- **Arquivo**: `src/components/editor/ShortcutsModal.tsx`

---

## Fase 3 — Colaboração e Armazenamento (P2)

### 3.1 Multiplayer em tempo real
- Supabase Realtime ou Yjs + WebRTC
- CRDT para posições de objetos
- **Arquivos**: `src/hooks/useMultiplayer.ts`, `src/providers/CollaborationProvider.tsx`

### 3.2 Histórico de versão multiusuário
- Undo entre sessões
- Timeline de alterações por usuário
- **Arquivo**: `src/hooks/useVersioning.ts`

### 3.3 Pastas e coleções
- Organizar templates em pastas/tags
- Substitui lista plana no dashboard
- **Arquivo**: `src/components/library/FolderTree.tsx`

### 3.4 Permissões
- Níveis Viewer/Editor/Owner
- **Arquivo**: `src/lib/auth.ts`

### 3.5 Fluxo de aprovação
- Draft → In Review → Approved → Published
- Notificações por status
- **Arquivos**: `src/hooks/useApproval.ts`, `src/components/editor/ApprovalBadge.tsx`

### 3.6 API pública
- Endpoints REST em `/api/templates`
- **Arquivos**: `src/app/api/templates/route.ts`

### 3.7 Validação Zod nos payloads
- Schemas de validação para criação/atualização de templates
- **Arquivo**: `src/lib/validators/templateValidator.ts`

### 3.8 Cache + CDN para thumbnails
- next/image + Supabase storage URL
- **Arquivo**: `src/services/templateService.ts`

### 3.9 Audit log
- Tabela `template_changes` (quem, o quê, quando)
- **Arquivo**: `src/lib/audit.ts`

### 3.10 Auto-save
- Salvar automaticamente a cada N segundos com throttle
- **Arquivo**: `src/hooks/useAutoSave.ts`

### 3.11 Importar de outros editores
- Canva JSON, Figma JSON, Sketch JSON
- Conversor por formato
- **Arquivos**: `src/lib/importers/figma.ts`, `src/lib/importers/canva.ts`

---

## Fase 4 — Validação e Acessibilidade (P2)

### 4.1 Validação visual ao vivo
- Overlays de warning no canvas (fora de safe zone, baixa resolução, fonte < 10pt)
- **Arquivo**: `src/components/editor/LiveValidator.tsx`

### 4.2 Contraste WCAG
- Checar contraste entre fill do texto e pixel do fundo
- **Arquivo**: `src/hooks/useWCAG.ts`

### 4.3 Tamanho final do arquivo
- Estimativa de tamanho PNG/JPEG antes de exportar
- **Arquivo**: `src/hooks/useExport.ts`

### 4.4 DPI checker
- Aviso para imagens < 150 DPI
- **Arquivo**: `src/hooks/useEditor.ts`

### 4.5 Acessibilidade de teclado
- Tab para navegar painéis, foco visível, ARIA labels
- **Arquivo**: Todos os componentes

### 4.6 Anunciador aria-live
- Ao mudar zoom, selecionar objeto, salvar
- **Arquivo**: `src/components/editor/AriaLive.tsx`

### 4.7 LayerPanel acessível
- Cada linha <div> → <button role="option"> em role="listbox"
- **Arquivo**: `src/components/editor/LayerPanel.tsx`

### 4.8 Modo alto contraste
- prefers-contrast (Windows High Contrast)
- **Arquivo**: `src/app/globals.css`

### 4.9 Internacionalização completa
- Mapear todo texto da UI (faltam chaves)
- **Arquivo**: `src/providers/LanguageContext.tsx`

### 4.10 Idioma automático
- Detectar navigator.language
- **Arquivo**: `src/providers/LanguageContext.tsx`

---

## Fase 5 — Performance e DX (P3)

### 5.1 Idempotência do dispose
- Garantir que canvas.dispose() seja seguro no StrictMode
- **Arquivo**: `src/hooks/useEditor.ts`

### 5.2 History com debounce
- object:moving não salvar a cada frame — salvar apenas ao soltar
- **Arquivo**: `src/hooks/useEditor.ts`

### 5.3 Web Worker para export
- OffscreenCanvas ou Worker para PNG grande
- **Arquivo**: `src/hooks/useExport.ts`

### 5.4 Tipagem local do Fabric
- Criar `src/types/fabric.d.ts` para eliminar casts `as any`
- **Arquivo**: `src/types/fabric.d.ts`

### 5.5 React.memo
- PropertyPanel, LayerPanel memorizados
- **Arquivos**: `src/components/editor/PropertyPanel.tsx`, `src/components/editor/LayerPanel.tsx`

### 5.6 Lazy load do Fabric
- useEditor só importa Fabric dinamicamente
- **Arquivo**: `src/hooks/useEditor.ts`

### 5.7 Separar useEditor
- Quebrar em hooks menores:
  - `useCanvasSetup` (inicialização)
  - `useShapePlacement` (ferramentas de desenho)
  - `useHistory` (undo/redo)
  - `useKeyboard` (atalhos)
  - `useTextEditing` (texto)
  - `useLayerManagement` (camadas)
- **Arquivos**: `src/hooks/useCanvasSetup.ts`, `src/hooks/useHistory.ts`, etc.

### 5.8 Testes unitários
- useEditor (jsdom + mock fabric)
- validadores
- services
- **Arquivos**: `src/__tests__/`

### 5.9 E2E com Playwright
- Visual regression tests
- **Arquivo**: `tests/editor.spec.ts`

### 5.10 Storybook
- PropertyPanel, LayerPanel, Toolbar, ZoomControls
- **Arquivo**: `.storybook/`

### 5.11 CI/CD
- GitHub Actions com lint + typecheck + test
- **Arquivo**: `.github/workflows/ci.yml`

### 5.12 Documentação da arquitetura
- `docs/ARCHITECTURE.md` com fluxo de dados
- **Arquivo**: `docs/ARCHITECTURE.md`

### 5.13 Migrar Fabric 6 beta → stable
- `^6.0.0-beta20` → versão estável
- **Arquivo**: `package.json`

### 5.14 Toast em vez de console.error
- Erros de runtime vão para toast, não console
- **Arquivo**: `src/hooks/useEditor.ts`

---

## Fase 6 — Quick Wins (P3+)

### 6.1 Indicador de conexão Supabase
- Status "Online" / "Offline" / "Fallback localStorage"
- **Arquivo**: `src/components/shared/SupabaseStatus.tsx`

### 6.2 Atalhos de ferramenta (V, R, C, T, L, P, G)
- V = Select, R = Rect, C = Circle, T = Text, L = Line, P = Pen, G = Grid
- Hoje só funciona por clique
- **Arquivo**: `src/hooks/useEditor.ts`

### 6.3 Centro de rotação persistente
- originX/originY em setSize considera rotação
- **Arquivo**: `src/hooks/useEditor.ts:577-598`

### 6.4 PWA
- Manifest + service worker para edição offline
- Salvando em IndexedDB
- **Arquivos**: `public/manifest.json`, `src/sw.ts`

### 6.5 Print preview
- Visualização com corte e marcas de sangria 3mm
- **Arquivo**: `src/components/editor/PrintPreview.tsx`

### 6.6 AI assist
- Comando "Reescrever texto" via API LLM
- **Arquivo**: `src/hooks/useAIAssist.ts`

### 6.7 Exportar GIF/MP4
- Para templates com animações
- **Arquivo**: `src/hooks/useExport.ts`

### 6.8 Limpar cache
- Botão "Limpar cache do Supabase" + fallback localStorage
- **Arquivo**: `src/components/settings/CacheManager.tsx`

---

## Resumo por Fase

| Fase | Itens | Esforço | Impacto |
|------|-------|---------|---------|
| 0 — Correções P0 | 12 | 1-2 dias | Alto (bloqueantes) |
| 1 — Funcionalidades Core | 26 | 4-6 semanas | Alto (mercado) |
| 2 — UI/UX | 22 | 2-3 semanas | Médio (reteção) |
| 3 — Colaboração | 11 | 4-8 semanas | Médio (time) |
| 4 — Validação/Acessibilidade | 10 | 2-3 semanas | Médio (conformidade) |
| 5 — Performance/DX | 14 | 3-4 semanas | Baixo (devs) |
| 6 — Quick Wins | 8 | 1 semana | Médio |

**Total: 112 itens • ~15-20 semanas de trabalho estimado (1 dev full-time)**

---

## Como usar este roadmap

1. **Cada item vira uma issue no GitHub** com label da fase (P0, Core, UX, etc.)
2. **Sprints semanais**: puxar 5-8 itens por sprint
3. **Ordem recomendada**: Fase 0 → Fase 6 (quick wins) → Fase 1 (parcial) → Fase 2
4. **Itens P0 devem ser resolvidos antes de qualquer feature nova**
5. **Itens marcados com "Arquivos" indicam onde o código precisa mudar**
