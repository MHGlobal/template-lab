# RS Storage / RSIA — Auditoria Canónica de Continuidade

**Última atualização:** 19 de setembro de 2026  
**Documento de handoff entre chats:** SIM  
**Repositório alvo:** `MHGlobal/RS-Storage`  
**Branch alvo:** `release/v4.7.13-agent-harness`  
**Branch de estabilização:** `release/v4.7.13-agent-stabilization`  
**Runner público obrigatório:** `MHGlobal/template-lab` · branch `editor`  
**Estado de release:** **BLOQUEADO — auditoria ainda não concluída**

---

## Como retomar em qualquer chat novo

Use esta instrução:

```text
Continue a auditoria RS Storage a partir do documento canónico:
MHGlobal/template-lab
branch editor
arquivo reports/RS_STORAGE_AUDIT_CONTINUITY.md

Leia primeiro o documento inteiro, depois confira o estado atual dos workflows no Template Lab e continue exatamente do primeiro gate pendente. Não altere main. Não considere a auditoria completa só porque testes automatizados passam. Use evidência visual real e mantenha este documento atualizado antes de terminar a sessão.
```

A sessão nova deve:

1. Ler este ficheiro inteiro.
2. Confirmar HEAD de `release/v4.7.13-agent-harness`.
3. Confirmar HEAD de `MHGlobal/template-lab:editor`.
4. Consultar os workflows mais recentes Wave 1–5 e Agent Tool Parity.
5. Separar falha do produto de falha do harness/runner.
6. Continuar do primeiro gate realmente pendente.
7. Atualizar este ficheiro com novos commits, runs, findings e decisões antes de encerrar o chat.

---

# 1. Regras permanentes da auditoria

A auditoria do RS Storage/RSIA deve ser uma auditoria de produção verdadeira e adversarial. **PASS automatizado não significa release aprovado.**

Regras obrigatórias definidas pelo utilizador:

- usar obrigatoriamente o workflow público existente no Template Lab;
- usar o runner público de forma real, não apenas como shell para checks de existência;
- não decidir que a auditoria terminou porque CI ou unit tests passaram;
- executar validação visual real da aplicação Android e da Web;
- capturar screenshots/fotos reais e rever as próprias imagens antes de aprovar UI/UX;
- preservar funcionalidades existentes que já funcionam;
- não introduzir regressões para corrigir outra área;
- não avançar sobre falhas sem investigar e corrigir a causa;
- não aceitar `grep exists = PASS` como teste funcional;
- não hardcodar resultados para satisfazer gates;
- não mascarar erros de provider, Android, network ou build;
- não alterar `main` durante desenvolvimento/auditoria;
- trabalhar em `release/v4.7.13-agent-harness`;
- não fazer merge automático na `main`;
- não produzir APK final como entrega concluída enquanto gates obrigatórios estiverem pendentes;
- o APK final deve aceitar update por cima do APK já instalado, sem obrigar desinstalação e sem perder configurações/dados;
- validar package ID, versionCode/versionName e linhagem de assinatura para garantir update;
- a auditoria final deve cobrir Android, Web, RS FILE, RS Cinema, RSIA Chat/Agent, rede local/Wi‑Fi/hotspot, permissões, segurança, performance, updates e produção.

---

# 2. Escopo completo

## Android

Auditar design, organização visual, tutorial/onboarding, tabs, dashboard, permissões, settings, foreground service/lifecycle, notificações, server start/stop, background/rotação/process death, screen off/battery saver, áreas de toque, textos/labels/versão, telas de erro, model load/unload, ANR/freeze e atualização APK preservando dados.

A UI não pode parecer produto ainda em desenvolvimento.

## Web servida pelo Android

Auditar Dashboard, RS FILE, RS Cinema, RSIA Chat, RSIA Agent, Clients/Acessos, menus, mobile/desktop, overflow, overlays/modals, estados loading/error/empty, XSS/path handling/authorization, sessões e Web realmente servida pela app Android.

## RS FILE — regressões que continuam na matriz

1. modal de transferências desaparecia ao mudar de pasta durante upload/transferência;
2. botão de transferências aparecia indevidamente no login;
3. estado da pasta/posição do ficheiro não persistia ao abrir/fechar/voltar;
4. clique longo estilo ZArchiver não funcionava corretamente;
5. menu de três pontos tinha ações sem funcionar;
6. ficheiro selecionado para upload desaparecia ao trocar de pasta;
7. suporte consistente para Office, imagens, vídeos, áudio e outros formatos;
8. mkdir/rename/copy/move/delete/details devem funcionar de verdade;
9. estado/prioridade de transferências deve permanecer durante navegação;
10. velocidade e integridade de upload/download/copy devem ser medidas.

## RS Cinema

Auditar Filmes/Séries, poster/thumbnail, índice, pesquisa, detalhes, temporadas/episódios, progresso/resume, Range/seek, direct-play, múltiplos streams, erros de codec, favoritos/histórico e concorrência com IA carregada.

## RSIA Chat + Agent

Auditar Chat separado de Engineer/Editor, Provider/Model/Protocol separados, Local GGUF separado de provider externo, endpoints OpenAI-compatible/OpenCode Zen/NVIDIA/outros, streaming, tool calling, `content=null` + `tool_calls` válido, JSON estruturado como fallback, tagged protocol só no último fallback, reasoning privado nunca exibido, tasks reais, approvals reais, subagents, memory/session, crash recovery, undo/redo, CompletionGate, DoomLoopDetector, stop/cancel, Git, filesystem, shell, WorkspaceGuard e UI mobile.

---

# 3. Agent Harness 4.7.13

O Harness não pode ser reduzido a prompt + parser.

Componentes obrigatórios:

- AgentRegistry;
- RunStateMachine;
- ExecutionLoop;
- ContextEngine;
- ContextBudgetManager;
- TaskLedger;
- ToolRegistry;
- executors reais;
- PermissionEngine;
- WorkspaceGuard;
- ProviderAdapters/Gateway;
- RecoveryEngine;
- DoomLoopDetector;
- ProgressDetector;
- CompletionGate;
- SubagentManager;
- MemoryEngine;
- SessionEngine;
- EventBus;
- ChangeSet/undo-redo.

Engineer e Editor são primary agents distintos. Chat também é experiência distinta.

Princípio central:

> O modelo propõe ações. O Harness valida, autoriza, executa, observa, persiste, recupera e decide quando o trabalho terminou.

Prioridade de protocolos:

1. native tool/function calling;
2. structured JSON fallback;
3. tagged protocol como último fallback.

Completion só pode acontecer com objetivo satisfeito, tasks obrigatórias resolvidas, sem erro bloqueador, mudanças persistidas, validação aplicável, diff conhecido, permissões respeitadas e workspace íntegro.

---

# 4. Git e branches

RS Storage:

```text
repo: MHGlobal/RS-Storage
branch: release/v4.7.13-agent-harness
```

HEAD observado nesta retomada:

```text
a2856148961be6c6e4242feb2d81dbfc3ba94b91
```

O commit `a2856148` altera apenas `.github/workflows/rs-storage-v4713-agent-harness.yml`. O código do produto auditado pelos Waves 1/3/4/5 permanece em `3b93d08a1b24d80fb392eaf26561ca3de685cf0e`.

Confirmar novamente em cada sessão.

Branch de estabilização:

```text
release/v4.7.13-agent-stabilization
```

Template Lab:

```text
repo: MHGlobal/template-lab
branch: editor
```

HEAD observado em 15/09/2026 após reporters automáticos:

```text
32b15df5f893219c191b65a9b809b912bddfa5c7
```

O branch pode avançar automaticamente por reporters.

Regra: não publicar source privado do RS Storage em artifacts públicos; apenas evidência sanitizada, screenshots, resultados, hashes e metadata permitidos.

---

# 5. Wave 1 — Baseline

Workflow:

```text
.github/workflows/rs-storage-wave1-baseline.yml
```

Objetivos:

- regression map;
- Agent Harness behavior contracts;
- Web runtime + visual evidence;
- Android ARM64 build + unit baseline;
- Security + permission baseline;
- Android emulator visual evidence;
- aggregate gate.

Execução fresca importante:

```text
Run ID: 35006717678
Template Lab commit: a54366b5291772e15a2ed93cc87bc76e07ea7409
Conclusion: failure
```

Subjobs:

```text
Regression map / branch delta           SUCCESS
Web runtime + visual evidence           SUCCESS
Security + permission baseline          SUCCESS
Android ARM64 build + unit baseline     FAILURE
Agent Harness behavior contracts        FAILURE
Android emulator visual evidence        FAILURE
Wave 1 aggregate gate                   FAILURE
```

## Falhas do auditor, não bugs provados do produto

### Android setup

`android-actions/setup-android@v3` injeta `packages: tools platform-tools`. O pacote legado `tools` deixou de existir no sdkmanager atual. Os jobs Android falham no setup antes de compilar/instalar o RS Storage.

Correção pendente:

- sobrescrever explicitamente `packages: platform-tools` nos dois jobs Android, ou usar o SDK pré-instalado de forma controlada.

### Agent contracts

O código atual usa `RuntimeToolExecutors`, mas o `javac` da Wave 1 não incluiu `RuntimeToolExecutors.java`, causando `cannot find symbol RuntimeToolExecutors`.

Correção pendente:

```text
Adicionar RuntimeToolExecutors à compilação Wave 1 e rerodar.
```

## Web visual

A captura foi reforçada para:

```text
360x800 mobile
412x915 mobile
1366x768 desktop
```

Estados:

```text
files
menu global
context menu
transfers modal
```

O job Web runtime + visual evidence do run 35006717678 passou, mas as imagens ainda precisam de revisão visual humana antes de aprovação.

---

# 6. Wave 2 — Real Task Gates

Workflow:

```text
.github/workflows/rs-storage-wave2-real-task.yml
```

Objetivos:

- Agent runtime tool surface;
- WorkspaceGuard real + edit + undo + redo;
- traversal attacks;
- CompletionGate cannot self-approve;
- aggregate production gate.

Resultados comprovados:

```text
Workspace guard + undo/redo      PASS
Completion gate                  PASS
```

Primeira falha do Agent runtime tool surface: o auditor não compilava `RuntimeToolExecutors.java`.

Foi feito commit:

```text
a3187e7a4465139c131b226fade2b2cf9d4be261
fix(audit): compile RuntimeToolExecutors in Wave 2 gate
```

Nova execução:

```text
Run ID: 35006815286
Conclusion: failure
```

Subjobs:

```text
Completion gate cannot self-approve      SUCCESS
Workspace guard + undo/redo real task    SUCCESS
Agent runtime tool surface               FAILURE
Wave 2 production gate                   FAILURE
```

Causa atual: o teste procura `AgentHarness.defaultTools()` sem parâmetros, mas o código atual usa `defaultTools(WorkspaceGuard workspace)`.

Falha:

```text
NoSuchMethodException: com.rs.localstorage.AgentHarness.defaultTools()
```

Isto é stale test do auditor.

Correção de retomada:

- instanciar `AgentHarness` real com workspace fixture e ler `harness.tools`, ou refletir a assinatura correta com `WorkspaceGuard`;
- validar `git_status`, `git_diff`, `git_log`, `git_commit`, `git_push` e executors não nulos;
- validar policies Engineer: commit/push ASK, status/diff ALLOW;
- rerodar Wave 2.

---

# 7. Agent Tool Parity

Houve divergências históricas entre schema nativo, registry, executors/runtime, production dispatcher e fallback instructions.

Findings históricos incluíram:

- `git_commit`/`git_push` declarados em policy mas ausentes noutro surface;
- argumentos `from/to` vs `source/destination` em copy/move;
- semântica `fs_edit` replace vs append/content;
- risco de dispatcher duplicado em vez de `AgentHarness.executeTool()` como caminho canónico.

O gate dedicado evoluiu e passou na tentativa 5:

```text
Workflow: RS Storage Audit Agent Tool Parity Gate
Run ID: 34950844526
Attempt: 5
Conclusion: success
```

O finding antigo de git commit/push deve ficar como histórico/resolvido, não blocker atual sem reprodução.

---

# 8. Wave 3 — Android Runtime / Upgrade / Android-served Web

Objetivos:

- update APK sobre instalação anterior;
- preservação de dados/configurações;
- runtime Android;
- native UI;
- Web servida pelo Android real;
- screenshots/hierarchy/logcat;
- evidência de upgrade.

Histórico recente:

```text
RS Storage Audit Wave 3 Android Runtime — FAILURE
```

Falharam blocos de Android upgrade, native visual, Android-served Web e aggregate evidence gate.

Antes de atribuir ao produto, confirmar se cada causa foi runner shutdown, SDK bootstrap, signing/update mismatch ou defeito real.

O Template Lab gerou depois um evidence index para Wave 3.

## Upgrade válido

Não vale `adb uninstall` + instalação limpa.

Teste correto:

1. instalar versão anterior compatível;
2. abrir e criar dados/configuração sentinela;
3. instalar candidato por update normal;
4. não limpar data;
5. confirmar mesmo package ID;
6. confirmar assinatura compatível;
7. confirmar configurações preservadas;
8. confirmar RS FILE/RS Media externos intactos;
9. confirmar app/serviços funcionais.

---

# 9. Wave 4 — Transfer Integrity / Performance

Objetivos:

- upload/download reais;
- integridade por hash;
- tamanho correto;
- cancelamento/recovery;
- Range;
- copy/move;
- performance com payloads controlados;
- comportamento do server Android real.

Histórico:

```text
Wave 4 Transfer Performance attempt #2 — FAILURE
Android real-server transfer integrity/performance — FAILURE
Automated transfer gate — FAILURE
```

Continua pendente até investigação detalhada do log atual.

Não classificar velocidade como aceitável apenas por localhost/browser mock. Release precisa de medição realista e, quando necessário, rede física.

---

# 10. Wave 5 — Local Network / Android 16 / Wi-Fi / Hotspot

Histórico:

```text
Production network policy contract                         SUCCESS
Android 16 LNP app-UID enforcement / denied permissions    FAILURE
Automated network gate                                     FAILURE
```

Findings de rede já identificados:

### NET-001 — mensagem/permissão Wi-Fi imprecisa

A UI/mensagem de permissão não representa corretamente todos os estados necessários para rede local/hotspot em Android recente.

### NET-002 — mDNS stale após mudança de interface

Se o dispositivo muda interface/rede/hotspot, anúncio/estado mDNS pode ficar associado à informação anterior. Deve haver lifecycle de restart/rebind quando interface/IP muda.

### NET-003 — sessão HTTP e source IP

Foi identificado risco de sessão autenticada continuar válida sem revalidação adequada da origem de rede/source IP em mudanças relevantes. Precisa validar o contrato de sessão desejado e o mecanismo seguro.

### NET-004 — foco em RFC1918 IPv4

Verificar link-local, IPv6 local/ULA quando aplicável, hotspot OEM, interfaces múltiplas e Local Network Protection Android atual.

---

# 11. Baseline 4.7.10 que não pode regredir

A auditoria 4.7.10 registrou correções/implementações que devem ser preservadas:

- upload atómico;
- fila web;
- operações de ficheiros;
- Range/HTTP;
- provider RSIA;
- web_fetch;
- XSS;
- lifecycle do serviço;
- tutorial Android;
- Cinema;
- Web File.

Gates históricos reportados:

```text
SafetyBehavior             62 verificações
Gates herdados             20/20
RS FILE                    12/12
overlays                    6/6
```

Esses PASS antigos são baseline de regressão, não prova suficiente da 4.7.13.

---

# 12. APK / assinatura / instalação

A linhagem V4 demonstrou compilação ARM64 com llama.cpp e package `com.rs.localstorage`, mas builds de teste históricas usavam debug signing.

Regra atual:

- manter identidade de package esperada;
- versionCode deve permitir update;
- assinatura deve ser compatível com o APK instalado que será atualizado;
- update deve preservar dados/configuração;
- só depois pode ser chamado APK de entrega.

Não entregar APK que obriga uninstall se a exigência é preservar configuração.

---

# 13. Evidência visual obrigatória

Auditoria só pode ser chamada completa quando houver revisão visual real de:

- Android nativo;
- Web servida pelo Android;
- mobile;
- desktop;
- menus;
- modals;
- context menus;
- transfer modal;
- RSIA Chat;
- Engineer;
- Editor;
- RS FILE;
- Cinema;
- Clients;
- tutorial;
- settings;
- estados de erro/loading/empty.

Capturar imagem sem revisar a imagem não conta.

---

# 14. Segurança e hardening

Continuar revisão de path traversal, encoded traversal, symlink escape, external path, shell escaping, command injection, secrets, provider keys, approval bypass, force push/reset/clean, XSS, auth/session, HTTP parsing, Range validation, storage scope, WebView JS bridge, cleartext/local network policy, foreground service lifecycle, permission bypass e Android LNP.

Wave 2 já comprovou em fixture:

```text
plain traversal blocked
encoded traversal blocked
symlink escape blocked
edit persisted
undo passed
redo passed
synthetic git diff visible
```

CompletionGate comprovou:

```text
empty evidence rejected
unknown diff rejected for software change
complete evidence accepted
```

---

# 15. Classificação obrigatória de failures

Cada failure deve ser classificado como:

```text
PRODUCT_DEFECT
AUDIT_HARNESS_DEFECT
RUNNER_INFRA_FAILURE
TEST_STALE_CONTRACT
EXPECTED_PHYSICAL_LIMITATION
UNRESOLVED
```

Exemplos confirmados nesta fase de `AUDIT_HARNESS_DEFECT`/`TEST_STALE_CONTRACT`:

1. Android setup solicitando pacote removido `tools`.
2. Wave 1 `javac` sem `RuntimeToolExecutors.java`.
3. Wave 2 `javac` inicialmente sem `RuntimeToolExecutors.java`.
4. Wave 2 refletindo assinatura antiga `defaultTools()` sem `WorkspaceGuard`.

Não corrigir produto para satisfazer auditor errado.

---

# 16. Alterações feitas no Template Lab nesta retomada

## Ledger Wave 1 reconciliado

`reports/rs-storage-wave1-findings.md` foi atualizado para marcar finding git commit/push antigo como resolvido por evidência posterior, manter release bloqueado e registrar gates físicos/visuais ainda obrigatórios.

Commit:

```text
e1a9ef56ee81c1d56a03578d92ade415e95f8812
```

## Evidência visual mobile estreita

`audit/rsfile_visual_capture.mjs` passou a capturar também 360x800, além de 412x915 e desktop.

Commit:

```text
a54366b5291772e15a2ed93cc87bc76e07ea7409
```

## Wave 2 RuntimeToolExecutors

Workflow atualizado para incluir `RuntimeToolExecutors` no compile.

Commit:

```text
a3187e7a4465139c131b226fade2b2cf9d4be261
```

Ainda falta corrigir a introspecção antiga `defaultTools()`.

Reporters automáticos podem avançar o HEAD `editor` depois destes commits.

---

# 17. Próxima sequência exata

## Passo 1 — corrigir Wave 1 auditor

Editar `.github/workflows/rs-storage-wave1-baseline.yml`:

- adicionar `RuntimeToolExecutors` ao compile dos Agent contracts;
- configurar `android-actions/setup-android@v3` para não pedir pacote legado `tools`;
- definir `packages: platform-tools` explicitamente nos dois jobs Android;
- rerodar Wave 1;
- classificar apenas failures restantes.

## Passo 2 — corrigir Wave 2 stale test

No `rs-storage-wave2-real-task.yml`:

- parar de chamar `AgentHarness.defaultTools()` sem parâmetros;
- instanciar Harness real com workspace fixture ou refletir assinatura correta;
- validar surface real + executors + policies;
- rerodar Wave 2.

## Passo 3 — revisar artifacts visuais Wave 1

Mesmo com Web visual green:

- abrir PNGs;
- revisar 360x800, 412x915 e desktop;
- registrar findings para overflow, clipping, menu, toolbar, modal e hierarquia;
- não marcar UI aprovada sem revisão.

## Passo 4 — Wave 3

- ler evidence index atual;
- identificar causa de cada failure;
- corrigir infra/harness se necessário;
- executar upgrade sem uninstall;
- validar assinatura/dados;
- obter Android native screenshots + hierarchy + logcat;
- obter Web servida pelo APK instalado.

## Passo 5 — Wave 4

- abrir logs mais recentes;
- localizar ponto exato da falha;
- testar upload/download/copy/move/Range/cancel/recovery;
- medir throughput;
- verificar hashes;
- separar CI sintético de rede física.

## Passo 6 — Wave 5

- investigar Android 16 LNP/app UID;
- validar permissões recusadas;
- testar network policy;
- revalidar mDNS interface change;
- revalidar session source IP policy;
- avaliar IPv6/link-local quando pertinente;
- executar hotspot/Wi-Fi real onde CI não consegue reproduzir honestamente.

## Passos finais

- auditoria visual Android/Web completa;
- APK update test;
- build candidato;
- assinatura correta;
- SHA-256;
- metadata;
- release report;
- known limitations factuais;
- nenhum PASS inventado para physical tests não executados.

---

# 18. Critério de auditoria completa

A auditoria não está completa enquanto faltar qualquer um destes grupos:

```text
[ ] Wave 1 atual sem failures de harness
[ ] Wave 2 real-task atual
[ ] Agent tool parity sem regressão
[ ] Wave 3 runtime/upgrade/native/Web Android
[ ] Wave 4 transfer/performance
[ ] Wave 5 network/LNP
[ ] revisão visual manual das screenshots Android
[ ] revisão visual manual das screenshots Web
[ ] atualização APK sem uninstall/data loss
[ ] assinatura/versão/package verificados
[ ] Wi-Fi/hotspot físico onde necessário
[ ] RS FILE regressions verificadas
[ ] Cinema verificado
[ ] RSIA Chat verificado
[ ] Engineer verificado
[ ] Editor verificado
[ ] providers/endpoints verificados
[ ] permissions/security revisadas
[ ] relatório final com evidence links e hashes
```

---

# 19. Status resumido atual

```text
TARGET                         release/v4.7.13-agent-harness
TARGET SHA observado           6a11bda5ab9c072ad0f14370a33d7b90bb1926f8
TEMPLATE LAB                   MHGlobal/template-lab:editor
AUDIT COMPLETE                 NO
RELEASE APPROVED               NO
MAIN MODIFIED                  NÃO DEVE SER
WEB WAVE1 CURRENT              PASS automatizado; revisão visual ainda obrigatória
SECURITY WAVE1 CURRENT         PASS baseline
REGRESSION MAP                 PASS
ANDROID WAVE1                  BLOCKED por setup-android package tools no auditor
AGENT CONTRACT WAVE1           BLOCKED por RuntimeToolExecutors ausente no javac do auditor
WAVE2 WORKSPACE/UNDO/REDO      PASS
WAVE2 COMPLETION               PASS
WAVE2 RUNTIME SURFACE          BLOCKED por stale reflection no auditor
AGENT TOOL PARITY              PASS na tentativa 5 do gate dedicado
WAVE3                          PENDENTE/BLOCKED
WAVE4                          PENDENTE/BLOCKED
WAVE5                          PARCIAL; policy contract PASS, Android/LNP FAIL
APK UPDATE/DATA PRESERVATION   AINDA NÃO APROVADO
PHYSICAL HOTSPOT/WIFI          AINDA NÃO APROVADO
```

---

# 20. Manutenção deste documento

Antes de terminar qualquer sessão futura relacionada à auditoria:

1. atualizar data;
2. atualizar HEAD RS Storage;
3. atualizar HEAD Template Lab;
4. adicionar run IDs novos;
5. registrar commits relevantes;
6. mover findings resolvidos para resolvido sem apagar histórico;
7. registrar blockers ativos;
8. atualizar a próxima sequência exata;
9. não incluir secrets;
10. não incluir reasoning privado.

Este ficheiro é a fonte de continuidade entre chats.

---

# 21. Decisão vigente

**Não aprovar RS Storage/RSIA 4.7.13 para produção ainda.**

Há progresso real e vários gates passam, mas ainda existem falhas no harness público a corrigir/rerodar, Wave 3/4/5 pendentes, upgrade/data-preservation não comprovado, validação visual Android incompleta e network/hotspot físico incompleto.

Regra final: **evidência primeiro, aprovação depois.**


---

# 22. Retomada de 19/09/2026 — estado fresco

## Identidade

```text
RS Storage branch HEAD          a2856148961be6c6e4242feb2d81dbfc3ba94b91
Product/app SHA auditado        3b93d08a1b24d80fb392eaf26561ca3de685cf0e
Diferença 3b93 -> a285          apenas workflow YAML; nenhum ficheiro do app
Template Lab antes deste handoff c2be1036908779eb3fd3ecc8bace1c064c7ec5b0
MAIN                            não alterada
```

O preflight público fresco resolveu corretamente o HEAD `a2856148` e passou.

## Gates frescos

```text
Wave 1 anterior                 35430714200  SUCCESS automatizado, mas evidência Android invalidada por revisão humana
Wave 1 corrigido                35433151831  IN_PROGRESS
Wave 2                          35430759107  SUCCESS
Agent Tool Parity               35430761879  SUCCESS
Wave 3                          35430718876  IN_PROGRESS
Wave 4                          35430728242  IN_PROGRESS
Wave 5                          35430730728  IN_PROGRESS attempt 2; static network policy SUCCESS
Full Audit/preflight fresco     35433151712  SUCCESS
```

## Findings de rede resolvidos no produto atual

- NET-001: UI Android 16 agora distingue servidor local de acesso LAN bloqueado quando `NEARBY_WIFI_DEVICES` é negado.
- NET-002: mDNS possui refresh/rebind periódico quando interface/endereço muda.
- NET-003: sessão HTTP é vinculada ao endereço remoto e invalidada em mudança da origem.
- NET-004: policy local agora cobre RFC1918, CGNAT `100.64/10`, IPv4 link-local `169.254/16` e prefixos IPv6 de interfaces locais, excluindo WWAN/VPN/túneis.
- O contrato estático Wave 5 passou essas regras.
- Android 16 continua corretamente testado com `RESTRICT_LOCAL_NETWORK` + `NEARBY_WIFI_DEVICES`. Android 17/API 37 exigirá roadmap para `ACCESS_LOCAL_NETWORK`; não é blocker da 4.7.13 targetSdk 36.

## Revisão visual humana Wave 1

A revisão das screenshots do run `35430714200` detectou que o PASS automatizado não era suficiente:

1. Android:
   - `01-main-launch.png`: diálogo do sistema “Bluetooth keeps stopping”.
   - `02-after-back.png`: diálogo “System UI isn't responding”.
   - `activity.txt`: `MainActivity` ainda estava com `reportedDrawn=false`.
   - classificação: `RUNNER_INFRA_FAILURE` + evidência visual inválida; não é prova de defeito do RS Storage.

2. Web:
   - a captura desktop aparecia artificialmente limitada a ~235 px.
   - causa: fixture sintética do auditor criava `.admin-layout` sem `aside`, mas mantinha o grid de produção `235px 1fr`; o `main` caía na primeira coluna.
   - classificação: `AUDIT_HARNESS_DEFECT`, não `PRODUCT_DEFECT`.

Correções no Template Lab:

```text
9779799ab8078a4ca110add1d386a1f71e52d068
fix(audit): render Wave 1 file fixture at full desktop width

cf576b0f3f39282c196f1ed932c99be37216cf76
fix(audit): reject invalid Android visual evidence

c2be1036908779eb3fd3ecc8bace1c064c7ec5b0
fix(audit): scope Android drawn check to RS Storage activity
```

O novo Wave 1 deve ser revisado visualmente novamente; PASS automático continua insuficiente.

## Workflow físico do RS Storage

Existe `.github/workflows/rs-storage-v4713-agent-harness.yml` com:
- `mandatory-gates` em hosted runner;
- `redmi-note-13-pro-install` em `[self-hosted, android, redmi-note-13-pro-4g]`;
- instalação física via `adb install -r`, launch, PID e versionName.

O gate privado tinha uma lista `javac` desatualizada sem `RuntimeToolExecutors`; corrigido no branch:

```text
a2856148961be6c6e4242feb2d81dbfc3ba94b91
fix(ci): compile runtime tool executors in v4.7.13 gates
```

O hosted job privado subsequente terminou sem registrar steps, portanto não foi usado como substituto dos runners públicos. O Redmi continuou skipped. Mesmo um PASS do Redmi provaria instalação/launch físico, mas não substitui o requisito final de Wi-Fi/hotspot real com segundo cliente.

## Estado de encerramento

```text
FINAL_AUDIT_COMPLETE=NO
```

Ainda obrigatórios: conclusão limpa de Wave 1 corrigido, Wave 3, Wave 4 e Wave 5; revisão humana dos novos screenshots Android/Web; evidência de upgrade sem perda; artefactos/metrics finais; e teste Wi-Fi/hotspot físico com cliente real.

# 23. Retomada de 20/09/2026 — estabilização do runtime de auditoria

Diagnóstico confirmado nos logs:

- Wave 1 falhava por diálogo/crash do System UI/Bluetooth do emulator, classificado como `RUNNER_INFRA_FAILURE`, não como defeito provado do produto.
- Waves 3/4/5 anteriores atingiam o limite do job durante os gates Android reais.
- Wave 4 ficou bloqueada durante `adb install --no-streaming`.
- Wave 5 instalou o APK, depois ficou presa após reboot do emulator.
- `cancel-in-progress: true` agravava o histórico cancelando runs válidos durante correções do próprio auditor.

Correções aplicadas no Template Lab:

```text
fef4508a6ebd71c72dc268631fce3760c27c2659  stabilize Wave 3 runtime
5346bc7ce80b5b337211cf0a7d3b269131c4a27e  stabilize Wave 4 runtime
ee654431d3f351bbaca36ce2bb6473109345447e  stabilize Wave 5 runtime
84ac79e9aaf9f8ef03adcdc116b0043b71648ee0  stabilize Wave 1 runtime
e55266aa70fdd373aa8d7ecd49a5a5fe4ae8896e  Wave 3 streaming adb install
058f0350e58c6a32cfbb4755099e9fba32ccdf8c  Wave 4 streaming adb install
7def57e42b26a18ccdc3d4e102f42fc3d6934c29  Wave 1 stable concurrency generation
9795a93e20cf0bb23b29eb12228b37d31a177957  Wave 3 stable concurrency generation
f831fae70070b3634cfc36737fe334f7268b4bd5  Wave 4 stable concurrency generation
f5f9d29b8898418cc711a0ca3eea4017b5ec9199  Wave 5 stable concurrency generation
```

Mudanças:
- Android macOS jobs: timeout elevado para 300 min como proteção contra falso timeout.
- `cancel-in-progress` desativado na geração estabilizada.
- Wave 3 e Wave 4 passaram a usar instalação ADB streaming normal em vez de `--no-streaming`.
- grupos de concurrency estabilizados foram isolados para não depender dos runs antigos ainda em execução.

Runs estabilizados disparados:

```text
Wave 1  run 35481552162  queued
Wave 3  run 35481555017  queued
Wave 4  run 35481557227  queued
Wave 5  run 35481559983  queued
```

Runs anteriores ainda ocupando runner no momento do handoff:

```text
Wave 1  35481080188  in_progress
Wave 3  35480687305  in_progress
Wave 4  35481177632  in_progress
Wave 5  35480692520  in_progress
```

Estado da auditoria neste ponto:

```text
WAVE2                  PASS
AGENT TOOL PARITY      PASS
WAVE1                  rerun estabilizado pendente
WAVE3                  rerun estabilizado pendente
WAVE4                  rerun estabilizado pendente
WAVE5 STATIC POLICY    PASS
WAVE5 ANDROID RUNTIME  rerun estabilizado pendente
FINAL_AUDIT_COMPLETE   NO
```

Não marcar release como aprovado enquanto os Android runtime gates e a validação física Wi-Fi/hotspot não tiverem evidência válida.
