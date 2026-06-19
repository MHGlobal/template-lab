# QA Review — Pipeline AGY + Stitch

## 1. Race Conditions Identificadas

### RC1 — Flush de disco vs completed.txt
**Problema**: agy escreve `responses/response-001.md`, depois `metadata.json`, depois `completed.txt`. No Windows, `Set-Content` não garante que o buffer tenha sido descarregado em disco antes do próximo comando. Se o watcher detectar `completed.txt` antes do buffer, lê ficheiro vazio/parcial.

**Solução**: metadata.json incluir `response_count` e `response_files[]` com tamanhos. O watcher, ao detectar `completed.txt`, lê metadata.json e verifica se cada ficheiro existe com o tamanho esperado (double-check).

### RC2 — Múltiplas execuções simultâneas
**Problema**: Se o prompt for lançado duas vezes, dois processos agy escrevem para a mesma pasta simultaneamente.

**Solução**: Lock file (`.lock`) com PID do processo. Remover no final.

### RC3 — Watcher detecta completed.txt antes de metadata.json
**Problema**: Se agy escrever metadata.json e completed.txt em paralelo, ou metadata falhar, o watcher encontra completed.txt mas metadata corrompido.

**Solução**: Escrever metadata.json primeiro, flush, só depois criar completed.txt. Watcher só confirma se AMBOS existirem.

## 2. Problemas de Sincronização

### PS1 — agy não é um daemon
**Problema**: agy executa um prompt e termina. Watcher precisa de processo separado.

**Solução**: Script `run-stitch.ps1` orquestra: cria pastas, remove completed.txt anterior, cria `.lock`, lança agy + watch-completion.ps1.

### PS2 — agy stdout no Windows
**Problema**: agy usa WriteConsole Win32 API — stdout perdido fora de terminal real.

**Solução**: Prompt do agy instrui ESCREVER cada resposta num FICHEIRO.

## 3. Ambiguidades

### AM1 — Projecto Stitch: novo vs reutilizar
**Decisão**: Mesmo projecto para os 3 ecrãs. agy cria projecto no primeiro upload, reutiliza `projectId`.

### AM2 — Erros parciais
**Decisão**: Cada ecrã independente. Falhas registadas em logs. Pipeline continua com sucessos. completed.txt criado independentemente.

### AM3 — Timeout agy
**Decisão**: Watcher tem timeout global (10 min). Se expirar, cria completed.txt com `STATUS=TIMEOUT`.

## 4. Melhorias

- **M1**: SHA-256 checksums em metadata.json para detectar corrupção
- **M2**: Nomenclatura `response-{timestamp}-{seq}.md`
- **M3**: Lock file com PID + timestamp
- **M4**: Ficheiro `.writing` temporário durante escrita de cada resposta (watcher ignora)

## 5. Arquitetura Corrigida

```
run-stitch.ps1
  ├── mkdir .agy-stitch-output/{responses,logs}
  ├── Remove completed.txt anterior
  ├── New-Item .lock (PID)
  ├── Start agy (background) → escreve ficheiros, stitch, salva, metadata, completed.txt
  └── Start watch-completion.ps1 (background)
        └── Polling 2s, timeout 600s
              └── Detecta completed.txt + metadata.json
                    └── Chama process-responses.ps1
                          ├── Lê metadata, valida checksums
                          ├── Gera final-report.json
                          └── Pronto para refinação agy
```

## 6. Conclusão

Após corrigir 3 race conditions, 2 sync problems, resolver 3 ambiguidades e aplicar 4 melhorias — arquitetura pronta. Risco residual mínimo: se agy falha silenciosamente, watcher atinge timeout e gera `STATUS=TIMEOUT`.
