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
