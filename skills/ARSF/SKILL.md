# ARSF — Auditoria RS Storage Full

## Identidade

**Nome curto:** ARSF  
**Significado operacional:** Auditoria RS Storage Full  
**Tipo:** skill de continuidade, execução e controlo de qualidade para RS Storage / RSIA.

## Trigger

Quando o utilizador escrever apenas **ARSF**, **continuar ARSF**, **executar ARSF**, **retomar ARSF** ou equivalente, trate isso como ordem para retomar imediatamente a auditoria RS Storage / RSIA a partir do estado persistido mais recente.

Não peça ao utilizador para repetir o contexto já persistido.

## Fonte canónica de continuidade

1. Leia `RS_STORAGE_CONTINUE_HERE.md` na branch `editor` de `MHGlobal/template-lab`.
2. Leia integralmente `reports/RS_STORAGE_AUDIT_CONTINUITY.md` na mesma branch.
3. Confira o HEAD atual de `MHGlobal/template-lab:editor`.
4. Confira o HEAD atual de `MHGlobal/RS-Storage:release/v4.7.13-agent-harness`.
5. Confira os workflows/runs mais recentes das Waves 1–5 e do Agent Tool Parity Gate.
6. Continue do **primeiro gate genuinamente pendente**, sem repetir trabalho já validado.

## Repositórios e branches

- Produto: `MHGlobal/RS-Storage`
- Branch alvo: `release/v4.7.13-agent-harness`
- Branch de comparação/estabilização: `release/v4.7.13-agent-stabilization`
- Runner público de auditoria: `MHGlobal/template-lab`
- Branch do runner: `editor`
- **Nunca alterar `main` durante a auditoria/implementação.**

## Regra principal

A auditoria **NÃO** está concluída porque testes automatizados passaram.

Aprovação só pode ocorrer quando existir evidência real suficiente de:

- comportamento funcional;
- segurança e permissões;
- Android real/emulador conforme o gate;
- Web realmente servida pelo Android quando exigido;
- screenshots/fotos reais de Android e Web;
- revisão manual das próprias imagens;
- RS FILE;
- RS Cinema;
- RSIA Chat;
- Engineer;
- Editor;
- Agent Harness;
- providers/endpoints;
- transferências e integridade;
- rede Wi‑Fi/hotspot/local;
- atualização do APK sem apagar configurações;
- package/signature/version compatíveis.

## Classificação obrigatória de falhas

Toda falha deve ser classificada antes de alterar o produto:

- `PRODUCT_DEFECT`
- `AUDIT_HARNESS_DEFECT`
- `RUNNER_INFRA_FAILURE`
- `TEST_STALE_CONTRACT`
- `EXPECTED_PHYSICAL_LIMITATION`
- `UNRESOLVED`

Não modificar o produto apenas para satisfazer um auditor quebrado ou contrato de teste desatualizado.

## Agent Harness — invariantes

Preservar e validar:

- AgentRegistry
- TaskLedger
- ToolRegistry
- PermissionEngine
- WorkspaceGuard
- ProviderAdapters / Provider Gateway
- ExecutionLoop
- RecoveryEngine
- DoomLoopDetector
- CompletionGate
- SubagentManager
- MemoryEngine
- SessionEngine
- EventBus / AgentEventBus
- ChangeSetEngine / undo-redo

Engineer e Editor são primary agents distintos.

Prioridade de protocolo:

1. native tool/function calling;
2. structured JSON fallback;
3. tagged RS protocol somente como último fallback.

`content=null` com `tool_calls` válidos é resposta válida.

Reasoning privado, `analysis`, `thinking`, `<think>` ou equivalentes nunca devem aparecer na UI.

O modelo não decide sozinho quando a tarefa terminou; CompletionGate decide.

## RS FILE — matriz de regressão obrigatória

Validar de forma real:

1. modal de transferências não desaparece ao navegar durante upload/transferência;
2. botão de transferências não aparece indevidamente no login;
3. estado/posição da pasta e do ficheiro persiste ao voltar;
4. clique longo funciona de forma equivalente ao esperado;
5. menu de três pontos executa ações reais;
6. ficheiro selecionado para upload não desaparece ao mudar de pasta;
7. suporte relevante a Office, imagens, vídeo, áudio e outros formatos;
8. mkdir/rename/copy/move/delete/details funcionam;
9. prioridade/estado da transferência permanece estável ao navegar;
10. upload/download/copy/move/Range/cancel/recovery têm integridade e medição real.

## RS Cinema — matriz mínima

Validar:

- filmes/séries;
- posters/thumbnails;
- índice persistente;
- pesquisa;
- detalhe;
- temporadas/episódios;
- progresso/resume;
- Range/seek/direct-play;
- múltiplos streams;
- codec não suportado;
- favoritos/histórico;
- responsividade;
- concorrência com IA carregada.

## APK — gate de atualização sem perda de dados

Nunca usar uninstall + clean install para declarar este gate aprovado.

Procedimento mínimo:

1. instalar versão anterior compatível;
2. criar configuração/dado sentinela;
3. instalar candidato como atualização (`adb install -r` ou fluxo equivalente);
4. não limpar dados;
5. confirmar mesmo package ID;
6. confirmar assinatura compatível;
7. confirmar versionCode compatível/crescente;
8. confirmar sentinela preservado;
9. confirmar RS FILE/RS Media preservados;
10. confirmar app e serviços funcionais após update.

## Waves e ordem de retomada

Ao iniciar ARSF, verifique o estado atual, não assuma que IDs históricos ainda são os mais recentes.

Ordem geral:

1. corrigir/validar Wave 1;
2. corrigir/validar Wave 2;
3. confirmar Agent Tool Parity sem regressão;
4. revisar manualmente screenshots Web/Android;
5. concluir Wave 3 runtime/upgrade/native/web;
6. concluir Wave 4 transfer integrity/performance;
7. concluir Wave 5 local network/LNP/Wi‑Fi/hotspot;
8. executar auditoria visual manual completa;
9. executar update real do APK sem perda de dados;
10. somente então produzir candidato final, hashes, assinatura e relatório de release.

## Execução

- Use o workflow público existente do Template Lab; não crie um caminho paralelo desnecessário.
- Faça testes reais por milestone/gate.
- Não avance sobre falha não classificada.
- Preserve funcionalidades existentes.
- Não faça merge automático para `main`.
- Não trate `grep`, existência de classe/função ou screenshot não revisada como PASS funcional.
- Evidência primeiro; aprovação depois.

## Continuidade entre chats

Antes de encerrar qualquer sessão ARSF:

- atualizar `reports/RS_STORAGE_AUDIT_CONTINUITY.md`;
- atualizar data e HEADs relevantes;
- adicionar novos run IDs e commits;
- marcar findings resolvidos sem apagar histórico;
- listar blockers ainda ativos;
- registrar a próxima sequência exata;
- nunca gravar secrets/tokens;
- nunca gravar chain-of-thought privado.

## Prompt canónico de continuação

```text
ARSF — retome a Auditoria RS Storage Full.

Leia primeiro `skills/ARSF/SKILL.md`, depois `RS_STORAGE_CONTINUE_HERE.md` e `reports/RS_STORAGE_AUDIT_CONTINUITY.md` no repositório `MHGlobal/template-lab`, branch `editor`.

A seguir, confirme o HEAD atual do Template Lab e do `MHGlobal/RS-Storage` na branch `release/v4.7.13-agent-harness`, verifique os workflows/runs mais recentes das Waves 1–5 e do Agent Tool Parity Gate e continue exatamente do primeiro gate real ainda pendente.

Não altere `main`. Não repita trabalho já validado. Não considere a auditoria concluída apenas porque testes automatizados passaram. Classifique cada falha como PRODUCT_DEFECT, AUDIT_HARNESS_DEFECT, RUNNER_INFRA_FAILURE, TEST_STALE_CONTRACT, EXPECTED_PHYSICAL_LIMITATION ou UNRESOLVED antes de decidir qualquer correção.

Use 100% o runner público existente do Template Lab. Preserve funcionalidades existentes. Faça testes reais. Abra e revise manualmente as evidências visuais Android e Web. Valide RS FILE, RS Cinema, RSIA Chat, Engineer, Editor, Agent Harness, providers, segurança, permissões, transferências, rede local/Wi‑Fi/hotspot e atualização do APK sem uninstall nem perda de dados/configurações.

Continue a trabalhar até concluir todos os gates que forem tecnicamente executáveis no ambiente atual. Ao final da sessão, atualize o handoff canónico no Git com HEADs, runs, commits, findings, blockers e a próxima sequência exata.

Regra final: evidência primeiro, aprovação depois.
```
