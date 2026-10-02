# RS Storage / RSIA — Work Handoff de Continuação

**Data:** 20 de setembro de 2026  
**Objetivo:** permitir que ChatGPT Work retome a auditoria/correção sem repetir trabalho já validado e sem confundir falhas do harness com falhas do produto.

## Repositórios e branches

- Produto: `MHGlobal/RS-Storage`
- Branch de trabalho obrigatória: `release/v4.7.13-agent-harness`
- HEAD observado em 20/09/2026: `3f9810213c7bfea619fea3a664eda32c8afaed45`
- Branch de estabilização/referência: `release/v4.7.13-agent-stabilization`
- Harness público obrigatório: `MHGlobal/template-lab`
- Branch do harness: `editor`
- HEAD observado em 20/09/2026: `27d1cf684a2b718cf45db09a0a45664e1c43d3e2`
- Skill canónica: `skills/ARSF/SKILL.md`
- Continuidade canónica: `reports/RS_STORAGE_AUDIT_CONTINUITY.md`
- Entrada rápida: `RS_STORAGE_CONTINUE_HERE.md`

> IMPORTANTE: os HEADs acima são um ponto de referência. Antes de qualquer alteração, confirmar novamente os HEADs atuais e ler commits posteriores. Não resetar trabalho novo.

## Regras obrigatórias

1. Não alterar `main`.
2. Não considerar a auditoria concluída porque CI/unit tests ficaram verdes.
3. Separar sempre **PRODUCT FAILURE** de **HARNESS/RUNNER FAILURE**.
4. Não alterar o produto para satisfazer um bug do workflow.
5. Android e Web precisam de screenshots reais do APK em execução e revisão visual humana das imagens antes de aprovação.
6. O update deve instalar por cima da versão existente sem perder configurações/dados.
7. Não publicar APK/AAB final enquanto gates obrigatórios estiverem pendentes.
8. Não expor source privado, APK privado, secrets ou credenciais em artifacts públicos.
9. Preservar funcionalidades existentes já validadas.
10. Atualizar este handoff/continuidade antes de encerrar uma sessão relevante.

## Estado confirmado da auditoria

**RELEASE: BLOQUEADO.**

O bloqueio atual não é um único erro. Há gates ainda sem evidência válida e findings de produto que precisam de revalidação/correção.

### 1. Wave 3 — upgrade + Android visual + Web servida pelo APK

Run histórico relevante: `34899549508`  
Job: `104161933019`

Esse run falhou no build em uma revisão antiga por uso de APIs Java não disponíveis no Android:

- `Files.readString(...)`
- `Files.writeString(...)`
- arquivo: `RuntimeToolExecutors.java`

Essa falha antiga **não deve ser tratada como blocker atual sem revalidação**, porque builds posteriores do candidate passaram nas Waves 4/5 e a branch avançou bastante depois disso.

O problema atual da Wave 3 é de evidência: o run antigo não chegou ao runtime e não produziu screenshots válidas. Portanto:

- upgrade preservation: ainda precisa ser reexecutado no HEAD atual;
- Android UI: NÃO APROVADA;
- Web servida pelo Android: NÃO APROVADA;
- screenshots: obrigatórias;
- abrir e revisar manualmente cada PNG produzido.

Ação: corrigir/modernizar a Wave 3 para o HEAD atual e reexecutar candidate + stabilization sem reaproveitar conclusões de runs antigos.

### 2. Wave 4 — transfer integrity/performance

Run relevante: `34899815754`  
Job reexecutado: `104605525599`

O candidate x86_64 compilou com sucesso.

A falha observada **é do HARNESS**, não do RS Storage:

```text
/usr/bin/sh: 1: set: Illegal option -o pipefail
```

O `reactivecircus/android-emulator-runner` executou o script via `/usr/bin/sh` (dash), enquanto o script começa com `set -euo pipefail`.

O emulador chegou a bootar, embora muito lentamente (~927 s), e o teste do produto nem começou de forma válida.

Correção esperada do harness:

- garantir execução sob Bash, por exemplo chamar um script versionado com `#!/usr/bin/env bash` e `bash audit/...sh`, ou equivalente;
- não remover `pipefail` apenas para esconder falhas;
- preservar todos os asserts do gate.

Depois reexecutar e validar:

- upload/download 32 MiB + SHA-256;
- transfer state/progress;
- copy/move real pelo embedded server;
- fila/priority/destination lock;
- cancelamento;
- ausência de `.partial` após cancel/error;
- stress com milhares de ficheiros;
- memória/CPU/logcat;
- responsividade após stress;
- métricas de emulator separadas do gate físico Wi-Fi.

### 3. Wave 5 — Android 16 Local Network Protection

Run relevante: `34900103350`  
Job Android: `104605548140`  
Job policy contract: `104605550264`

O **Production network policy contract passou**.

O job Android falhou por **HARNESS/RUNNER INFRA**:

```text
Timeout waiting for emulator to boot.
```

Antes do timeout houve repetidos:

```text
adb: device offline
```

Portanto esse run NÃO prova falha do RS Storage na LNP.

Ação:

- estabilizar boot do emulador API 36;
- não reduzir o teste para API inferior, porque este gate é especificamente Android 16/LNP;
- revisar RAM/cores, accel, emulator options, cold boot, timeout e health-check;
- capturar diagnostics do emulator/adb quando offline;
- depois executar o teste sob o UID real do app.

O gate deve continuar a provar:

1. com `RESTRICT_LOCAL_NETWORK` e Nearby negado, tráfego LAN sob UID do app é bloqueado;
2. comportamento real do `HotspotServerService` após negação;
3. estado mostrado ao utilizador não pode prometer LAN funcional quando a plataforma bloqueia;
4. após grant, o probe LAN sob UID do app funciona;
5. evidência sanitizada + screenshot do permission flow.

### 4. RSIA Agent — paridade end-to-end

Existe um gate público de paridade que encontrou 4 categorias de divergência. Revalidar no HEAD atual; não assumir automaticamente que continuam abertas se houve commits posteriores.

Alvos obrigatórios de regressão:

- `git-write-surface-parity`: `git_commit/git_push` devem existir de forma coerente em registry, native schemas, fallback/prompt e dispatcher de produção, usando permissões `git.commit` / `git.push`; shell genérico não vale como substituto;
- `copy-move-argument-contract-drift`: schema, registry/executor e runtime devem usar o mesmo contrato;
- `fs-edit-semantic-drift`: editar deve ter a mesma semântica em todas as superfícies;
- `duplicate-production-dispatch`: evitar registry “decorativo” enquanto produção executa outro dispatcher divergente.

Não basta o registry dizer que a ferramenta existe: deve ser chamável pelo modelo e executada no caminho real do produto.

### 5. Findings de rede local que precisam de revalidação/fix

Verificar no HEAD atual antes de editar:

- mDNS pode escolher interface errada quando há múltiplas interfaces;
- fallback hardcoded de subnet `/24` pode rejeitar LANs legítimas `/23`, `/20`, `/16`;
- negação de Nearby pode ainda deixar o servidor parecer `RUNNING` mesmo sem LAN funcional;
- política atual observada é orientada a IPv4/RFC1918;
- clientes IPv6 LAN podem ser rejeitados;
- `100.64.0.0/10` e `169.254.0.0/16` precisam de decisão explícita compatível com Android Local Network Protection;
- URLs apresentadas ao utilizador e interface escolhida pelo mDNS devem ser consistentes;
- testar mobile data + hotspot, Wi-Fi partilhado, hotspot Android, screen off/on, restart e permission deny/grant.

### 6. Segurança do embedded server

Controles positivos já observados e que não devem regredir:

- sessão aleatória;
- cookie HttpOnly;
- SameSite=Strict;
- CSRF;
- comparação constante;
- throttling/rate limit de login;
- PBKDF2-HMAC-SHA256 + salt;
- canonicalização;
- proteção contra symlink/path traversal;
- upload atómico/partial cleanup;
- `allowBackup=false`.

Finding aberto: tráfego LAN usa HTTP sem TLS. Avaliar threat model e solução prática sem destruir discovery/usabilidade. Não inventar HTTPS inseguro/self-signed sem estudar impacto.

### 7. Gate físico

O commit atual do produto indica trabalho recente relacionado a `probe physical Redmi runner independently`. Antes de criar outro mecanismo, inspecionar os commits/workflows atuais.

O gate físico não pode ser substituído por emulator:

- Android hotspot -> Android client;
- Android hotspot -> Windows/laptop;
- Wi-Fi partilhado;
- IP direto e `.local`;
- screen on/off;
- stop/start/restart;
- permission deny/grant;
- mobile data + hotspot;
- upload/download real com integridade;
- confirmar update do APK sem perda de configuração.

## Ordem recomendada de execução

1. Ler integralmente `skills/ARSF/SKILL.md`, `RS_STORAGE_CONTINUE_HERE.md`, `reports/RS_STORAGE_AUDIT_CONTINUITY.md` e este handoff.
2. Confirmar HEADs atuais e revisar commits posteriores aos SHAs deste documento.
3. Revisar runs/workflows mais recentes antes de criar novos.
4. Corrigir **Wave 4 harness** para Bash e reexecutar.
5. Estabilizar **Wave 5 API 36 emulator** e reexecutar.
6. Modernizar/reexecutar **Wave 3** no HEAD atual até produzir screenshots reais.
7. Baixar artifacts de screenshots e revisar visualmente cada imagem; registrar findings concretos.
8. Reexecutar Agent Tool Parity no HEAD atual; corrigir divergências reais end-to-end.
9. Tratar findings de rede/segurança com testes de regressão.
10. Executar gate físico real.
11. Só depois executar release/AAB/signing/update-preservation final.
12. Atualizar `reports/RS_STORAGE_AUDIT_CONTINUITY.md` e este handoff com resultados finais.

## Critério de conclusão

A auditoria só pode ser declarada concluída quando houver, no mínimo:

- builds/release gates válidos;
- upgrade sem perda de dados;
- Android runtime funcional;
- screenshots Android revisadas;
- Web servida pelo APK revisada desktop/mobile;
- RS FILE regressões fechadas;
- RSIA chat/agent real tasks fechados;
- paridade de tools fechada;
- transfer integrity/performance fechado;
- Android 16 LNP fechado;
- Wi-Fi/hotspot físico fechado;
- security findings classificados/corrigidos/aceites explicitamente;
- nenhum blocker aberto;
- relatório final com evidência e SHAs/runs.

**Não emitir APPROVE antes disso.**


## 2026-10-02 — active audit resumption (not final approval)

Product HEAD after correction: `a7d1da00fbbeb807186ec4a30e9b9ef4fa6965b4`.
Harness correction commits: `8ed1ef44` (KVM), `cff91670` (reporter output filtering), `9ce1a766` (Wave 4 contracts/stress), `8a617f29` (fresh parity/security regressions), `a28b4b30` (real APK security checks).

Confirmed corrections and classifications:

- `AUDIT_HARNESS_DEFECT`: KVM was tested before permissions were repaired in Waves 3/5, or before udev settled in Waves 1/4. New preflight repairs existing device permissions, settles udev and proves KVM API 12 plus VM creation. The software fallback is removed because the previous evidence showed 11–17 minute boot, broken Binder/package services and invalid visual evidence. All four new preflights passed.
- `AUDIT_HARNESS_DEFECT`: release workflow YAML had an unindented AAB verification line; zero-step runs were not a product-build failure. Product commit `f7bbd7fa` restores indentation, and private release run `36984098134` now executes real steps.
- `PRODUCT_DEFECT`: Android's `Files.getFileStore()` always throws `SecurityException`, while `RsAtomicUpload.stage()` called it before reading the body. This explains Wave 4 HTTP 403 after mkdir/auth worked. Source reference: https://android.googlesource.com/platform/prebuilts/fullsdk/sources/+/refs/heads/androidx-constraintlayout-release/android-35/sun/nio/fs/UnixFileSystemProvider.java . The corrected query is `File.getUsableSpace()`, preserving atomic staging/commit and cleanup. Commits `848442f4` and follow-up newline repair `a7d1da00` are both recorded; only the latter is the valid candidate.
- `TEST_STALE_CONTRACT`: Range belongs to `/admin/raw`; tracked full download belongs to `/admin/download`. The harness used wrong endpoints, including nonexistent `/download` for priority. Corrected without changing server routes.
- `AUDIT_HARNESS_DEFECT`: the stress fixture reused literal directory `d`, overwriting 500 files instead of creating 5000. Corrected to ten distinct directories.
- `AUDIT_HARNESS_DEFECT`: reporters could extract PASS from printed shell commands. They now strip ANSI, isolate timestamped output and require a full marker match. Regression checks reject echoed PASS and accept actual runtime output.

Fresh validation:

| Gate | Run | State at this checkpoint |
|---|---|---|
| Wave 2 + atomic-upload/security behavior | `36984287064` | PASS; `SAFETY_BEHAVIOR_PASS=62` |
| Agent Tool Parity | `36984287026` | PASS on corrected product HEAD |
| Wave 1 | `36983719959` | Android runtime/build pending; Agent/Web/security slices PASS |
| Wave 3 | `36983719994` | Android build/runtime pending |
| Wave 4 | `36984436643` | Corrected source + expanded security/transfer gate pending |
| Wave 5 | `36983720007` | Policy PASS; Android API 36 runtime pending |
| Private release/signing | `36984098134` | Running real build steps; signature/update not yet approved |
| Existing physical probe | `35481441071`, attempt 2 | QUEUED, job `110765511122`, no steps; physical BLOCKED |

Visual evidence actually downloaded and reviewed: Wave 1 artifact `11216523294`, twelve screenshots of files, global menu, context menu and transfer modal at 360x800, 412x915 and 1366x768. No visible overlapping text or horizontal overflow was found in these examined fixture states. This is production-asset fixture evidence, not proof of Android-served Web. Android and APK-served screenshots from the current Waves still require manual review.

`reports/RS_STORAGE_PHYSICAL_GATE_STEPS.md` gives the exact signer/update checks and client network matrix using existing infrastructure. An external workspace marker does not prove configuration preservation; the physical test must compare actual settings before/after.

F-SEC-001 remains open for shared/untrusted LAN: HTTP exposes credentials/session traffic to a network observer. No artificial self-signed TLS change was made. Automated auth/role/CSRF/storage-boundary checks are added to the real-server Wave 4, but do not encrypt transport or replace the physical threat-model disposition.

`FINAL_AUDIT_COMPLETE=NO`, release remains `BLOCKED` while runtime/visual/transfer/signing/physical evidence is pending. Do not read reporter success as audit success. Next action: inspect current run outcomes/logs, classify each failure, download new visual artifacts and review images, then update this checkpoint with final results.


## 2026-10-02 — visual review and corrected capture gates

Product candidate is now `974c6271876cbae57f0ade9bb286491feaa7b48e`. Actual API 36 denial screenshot from Wave 5 showed the long LAN denial value compressing the `Acesso fácil` label. MainActivity now gives metric labels/values proportional 1:2 widths. This is a confirmed product UI defect and a committed correction, not yet a visually revalidated result. The Wave 5 runtime gate now checks label width, column separation and bounds in the actual denial hierarchy.

Completed evidence: Wave 1 `36983719959` passed all seven jobs including ARM64 unit/build and Android emulator capture. Wave 5 `36983720007` passed policy, UID-local-network denial/grant and UI URL hiding/restoration. Artifacts `11216599508`, `11216619972`, `11216788271` were downloaded and screenshots inspected. Wave 1 native screenshots show the initial administrator modal; they do not prove a complete native journey. Wave 3 screenshots cover server stopped/running, Media, Clients, Access and Settings. Its supposed RSIA screenshot actually showed the tutorial/server page: the old substring matcher for `IA` clicked `Reabrir tutorial visual`.

Wave 3 `36983719994` FAILED overall, but baseline install, candidate `adb install -r`, internal marker, SharedPreferences and external workspace preservation all actually PASSED before the navigation failure. Classification: audit navigation defect, not a failed product update. Harness commit `a9be9e52` prioritizes exact labels and forbids substring matching for short tab names.

A second capture defect was found by inspecting the Playwright script: `viewportSize` is not the context option. Harness commit `36b1a2ca` uses `viewport` and asserts the actual `innerWidth/innerHeight` for each page. Historical Wave 3 labels alone are not evidence of mobile width.

Current reruns: Wave 1 `36985180105`, Wave 5 `36985180107`, Wave 3 `36985315876`, Wave 4 `36985257098`, private signed release `36984913350`. All target product `974c6271`. Wave 2/parity run on `a7d1da00`; the sole subsequent product change is MainActivity metric layout, with no Agent/security implementation delta. Wave 4 probe distinguishes client-readable provider discovery from admin-only provider mutation (`adb366f8`), matching the current authorization contract.

At this checkpoint the new runs are pending/running, not PASS. Physical probe attempt 2 still has no steps. HTTP shared-LAN finding F-SEC-001 remains open. `FINAL_AUDIT_COMPLETE=NO`; release remains BLOCKED.
