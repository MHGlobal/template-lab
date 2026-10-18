# RS Screen Manager — Estado da implementação

**Referência:** PLANO_MESTRE_IMPLEMENTACAO_V1.md; branch `feature/rs-screen-manager`.  
**Data:** 18/10/2026.  
**Versão de integração:** v0.4.0-alpha (hotspot e melhorias de arquitetura).

Este documento distingue implementação no código de testes com equipamento real. Não substitui o plano mestre.

| Etapa | Estado atual | Prova / trabalho pendente |
|---|---|---|
| 00 Baseline | Parcial | Plano e base de código identificados; faltam screenshots e regressão Windows/Android |
| 01 Core/async | Parcial | ADB devices, packages, pair/connect/disconnect agora não bloqueiam UI durante a espera; falta SessionCoordinator independente, state machine e migração de MainWindow |
| 02 UI/UX | Parcial | Dashboard connect+, estados, drawer integrado Gaming; faltam shell de navegação definitiva, revisão visual real e editor Gaming funcional |
| 03 Hotspot Android | Implementado no código, teste físico pendente | WLAN adapters/SSID/gateway, conectar perfil Wi-Fi guardado, abrir Definições, USB autorizado → ADB TCP/IP, conectar/confirmar ADB via rede; verificar com Android 15 e hotspot real |
| 04 Apps/orientação | Parcial | Pacotes listados off UI, start-app e retrato automático; faltam nomes/ícones reais, launchability, transform e suporte dinâmico por app |
| 05 Render embebido | Não implementado | Vídeo ainda abre em janela externa do scrcpy. Precisa de decoder, presenter e controlo de canais nativos |
| 06 Clipboard/áudio | Parcial | Clipboard scrcpy para sessões novas e opções de áudio; faltam alteração instantânea por sessão e gestão de áudio |
| 07 Gaming | Parcial | Mapper core testado, preset de vídeo e drawer coerente; falta touch transport real, RawInput, gamepad, editor sobre vídeo e perfis |
| 08 Multimédia | Parcial | MP4, PNG físico e listagem; faltam screenshot virtual, thumbnails e biblioteca avançada |
| 09 PT/EN/A11y | Parcial | Português e controlo de UI básico; faltam recursos PT/EN, leitor de ecrã, testes DPI/acessibilidade |
| 10 Diagnósticos/QA | Parcial | CI WinUI + fallback + hotspot policies; faltam testes físicos e telemetria real |
| 11 Distribuição | Parcial | GitHub Actions cria setup e ZIP; instalação/update devem ser validados em Windows real |

## Evidência por implementar
- Os testes automáticos apenas comprovam integridade de código, APIs Windows e artefactos. Não comprovam funcionamento do hotspot em um Android nem qualidade visual da aplicação.
- Nunca afirmar que o controlo Gaming é completo antes da injeção multitoque real.
- Não forçar landscape por defeito; evitar apresentar uma app vertical distorcida.
- Nenhum fluxo deve pedir root, instalar Companion sem consentimento ou tentar contornar permissão ADB.
- A Internet externa não é requisito da sessão local.

## Iteração recomendada após a v0.4.0
1. Teste presencial USB autorizado + hotspot do Android + opção Wi-Fi guardada, com logs sanitizados.
2. Extrair `AdbRunner` e `SessionCoordinator` da janela C++ para serviços testáveis.
3. Catálogo de apps com metadados verificáveis e detecção de launchability.
4. Spike de renderização D3D e controlo scrcpy integrado; apenas depois editor Gaming com toques reais.
5. Avançar etapa a etapa até todos os acceptance gates do plano mestre passarem.

**Ainda não é versão 1.0. Nenhuma etapa incompleta deve ser vendida como pronta.**
