# Pipeline AGY + Stitch — Workflow

## Visão Geral

Pipeline automatizado para criar ecrãs de UI usando Stitch (geração de layouts via IA) + agy (execução). Toda a saída é salva localmente antes de qualquer processamento.

## Estrutura

```
template-lab/
├── .agy-stitch-output/       ← output do pipeline
│   ├── responses/             ← respostas do Stitch (html, txt)
│   ├── logs/                  ← logs de execução
│   ├── completed.txt          ← flag de conclusão
│   ├── metadata.json          ← metadados da execução
│   ├── final-report.json      ← relatório pós-processamento
│   └── prompt-agy.md          ← prompt usado pelo agy
├── scripts/
│   ├── run-stitch.ps1         ← orquestrador
│   ├── watch-completion.ps1   ← watcher
│   └── process-responses.ps1  ← processador
└── docs/
    ├── QA-REVIEW.md            ← revisão QA do pipeline
    └── workflow.md             ← este ficheiro
```

## Fluxo

1. **run-stitch.ps1** → cria pastas, lock, lança agy + watcher
2. **agy** → lê prompt-agy.md, cria HTML, upload ao Stitch, get_screen_code, salva tudo em responses/, escreve metadata.json, cria completed.txt
3. **watch-completion.ps1** → polling completed.txt, valida integridade, gera final-report.json
4. **process-responses.ps1** → lê responses/, valida checksums, reporta estado

## Como Executar

```powershell
# Pipeline completa
.\scripts\run-stitch.ps1

# Só processamento (se completed.txt já existe)
.\scripts\process-responses.ps1
```

## Segurança

- Lock file impede execução dupla
- Timeout configurável (padrão: 10 min)
- Checksums SHA-256 para cada ficheiro
- Ficheiro `.writing` temporário durante escrita (watcher ignora)
- agy com `--dangerously-skip-permissions` para escrita automática

## Saídas

| Ficheiro | Quando | Conteúdo |
|---|---|---|
| `responses/*.html` | STEP 1 | HTML source dos ecrãs |
| `responses/stitch-upload-*.txt` | STEP 2 | Raw output do upload |
| `responses/stitch-code-*.txt` | STEP 3 | Código gerado pelo Stitch |
| `logs/execution-log.txt` | STEP 4 | Log completo |
| `metadata.json` | STEP 5 | Metadados + checksums |
| `completed.txt` | STEP 6 (último) | Flag de conclusão |
| `final-report.json` | Watch-completion | Relatório final |
