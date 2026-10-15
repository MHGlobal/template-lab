# Auditoria comparativa — Plexo × Bond0
**Data:** 15-10-2026  
**Estado:** análise de código concluída; integração no motor de produção **não iniciada**.  
**Destino:** `MHGlobal/template-lab`, branch `lab/bond0-control-center`, PR draft #25.  
**Objetivo:** aproveitar soluções de gestão de ligações, telemetria, limites e testes do Plexo para evoluir o Bond0 (túnel IP cifrado Windows → Oracle). **Sem IA no runtime.**

## 1. Evidência e versões analisadas

### Plexo (fonte primária)
- Repositório: https://github.com/anmolkapil/plexo
- Revisão de ficheiros verificada pelo GitHub: `fd22a886055757842d68dd337598b5f3b10281c4` (endereço devolvido pela pesquisa; recuperar SHA completo para build reproduzível antes de reusar código).
- [README / arquitetura funcional](https://github.com/anmolkapil/plexo/blob/main/README.md)
- [Descoberta e monitorização de interfaces](https://github.com/anmolkapil/plexo/blob/main/src/main/network/interfaces.ts)
- [Binding e rotas por dispositivo](https://github.com/anmolkapil/plexo/blob/main/src/main/network/deviceBinding.ts)
- [Scheduler de blocos HTTP](https://github.com/anmolkapil/plexo/blob/main/src/main/download/scheduler.ts)
- [Limites e contadores de consumo](https://github.com/anmolkapil/plexo/blob/main/src/main/network/limits.ts)
- [Métricas de velocidade por rede](https://github.com/anmolkapil/plexo/blob/main/src/main/download/transfer.ts)
- [Gestão de concorrência](https://github.com/anmolkapil/plexo/blob/main/src/main/download/concurrency.ts)
- [Contrato IPC](https://github.com/anmolkapil/plexo/blob/main/src/shared/ipc-contract.ts)
- [Testes de scheduler](https://github.com/anmolkapil/plexo/blob/main/e2e/scheduler.spec.ts), [testes chaos](https://github.com/anmolkapil/plexo/blob/main/e2e/chaos.spec.ts), [configurações de teste](https://github.com/anmolkapil/plexo/blob/main/src/main/testKnobs.ts).
- Licença MIT — https://github.com/anmolkapil/plexo/blob/main/LICENSE. Se algum código for efetivamente copiado/adaptado, preservar aviso de copyright/licença; a análise e recriação independente dos conceitos não é uma cópia.

### Bond0 (evidência do próprio código na Oracle)
- Origem do motor Rust: `Donovoi/Bonding`, revision `d2587a46e097c4408144d6dc48d7cd096f83d00a`; fonte inspecionada em `/home/ubuntu/Bond0-src`. As alterações locais já corrigidas estão presentes; não inferir que o repositório upstream contém esses patches.
- `bonding-core/src/scheduler.rs`: implementa `Stripe` por índice round-robin; `Preferred` usa `PathMetrics::score()` e histerese; `Redundant` duplica para todos os caminhos.
- `bonding-client/src/runtime.rs`: obtém as interfaces, cria UDP paths, constrói o scheduler e alimenta `scheduler.schedule()` para tráfego do TUN; **não encontrei chamadas a `scheduler.update_metrics()`, `update_rtt()` ou `update_loss()` no runtime do cliente**. Os campos de pontuação existem, mas ainda não correspondem a amostras medidas em runtime.
- `bonding-server/src/runtime.rs`: `SessionState.peers` mapeia `SocketAddr → Instant`; `next_peer()` ordena os peers e distribui pacotes do servidor por round-robin. Não usa métricas por percurso. Pruning aplica `SESSION_TTL`, mas isso não mede boa capacidade/queda transitória.
- `bonding-core/src/reorder.rs`: reordenação global por `sequence` com `max_age`; `retrieve()` é chamada no cliente **após a chegada de outro pacote de dados**, não num timer independente. Depois de uma lacuna no final de uma transferência pode manter pacotes retidos até chegar mais tráfego.
- `bonding-core/src/transport.rs`: o binding da interface Windows utiliza `IP_UNICAST_IF` em modo best-effort; atualmente ignora falhas dessa configuração. Confirmar o binding efetivo (source + ifIndex) no teste real.
- `bonding-core/src/control.rs`: whitelist `allowed_interfaces` por nome/alias e filtragem parcial de virtuais. Após iniciar, a lista é estática; quando a whitelist não é vazia, exige todos os paths para arrancar.
- `bond0/desktop/Program.cs` no Template Lab: POC WinForms gerencia perfis estáticos ou personalizados; reinicia o motor para mudar a lista. Teste 4 MiB apenas download e sem série temporal nem consumo por percurso. Hotspot ainda só abre definições do Windows.
- `bond0/server/manager.py`: manager apenas read-only em `127.0.0.1:8870`; não há controlo remoto seguro nem telemetria por WAN.

## 2. Diferença fundamental: o que NÃO devemos copiar

Plexo e Bond0 podem ambos somar capacidade, mas em níveis diferentes:
- **Plexo:** fluxos HTTP Range e múltiplas conexões de torrent, cada uma presa a um caminho; redistribui *blocos independentes de um ficheiro*, com reattempt e *hedging* de blocos lentos. Não cria TUN nem assegura que todo o tráfego IP do Windows use a soma.
- **Bond0:** encapsula pacotes IP no mesmo túnel lógico com UDP cifrado; precisa preservar a semântica TCP/IP do fluxo, sequência, janelas anti-replay, MTU e comportamento em perdas.

**Não portar `pickWork()` como scheduler de pacotes IP nem duplicar pacotes arbitrariamente ao detetar "lentidão"**: um bloco HTTP duplicável não é o mesmo que um datagrama IP cifrado. Hedging só faz sentido sob uma política de fiabilidade própria do túnel, após provar nonce/anti-replay/deduplicação. Também não transferir limites por suspensão de leituras HTTP para UDP sem considerar filas, RTT, MTU e controlo de congestionamento.

## 3. Melhorias concretas e priorizadas

| ID | Prioridade | O que aproveitar do Plexo | Implementação específica do Bond0 | Critério mínimo |
|---|---|---|---|---|
| P0-1 | **CRÍTICA** | Monitor contínuo de interfaces (interfaces.ts) | `PathRegistry` com ID estável GUID/ifIndex, estado `UP/DEGRADED/DOWN/PROBING`, eventos Windows + polling de segurança; N caminhos sem reiniciar cliente | Desligar/religar tethering ou Wi-Fi USB sem perder o outro uplink, 30 ciclos |
| P0-2 | **CRÍTICA** | Escolha de interface vinculada ao socket (deviceBinding.ts) | Verificar `IP_UNICAST_IF` e binds de todas as UDP sockets Windows; falhar path isolado e reportar erro, **não fallback silencioso para rota default** | tcpdump por WAN prova IP/NIC correctos, sem duplicar path |
| P0-3 | **CRÍTICA** | Medições contínuas (transfer.ts) | Métricas por path e direção: bytes úteis, bytes de encapsulamento, RTT EWMA, jitter, perdas por ACK/sequence, fila, capacidade estimada, data cost; alimentar `Scheduler.update_metrics` | Snapshot imutável 1 s, contadores monotónicos; nenhuma métrica inventada |
| P0-4 | **CRÍTICA** | Recuperação de work/timeout (scheduler.ts) | Revisitar reorder/replay: distinguir **número de sequência de dados** de control/keepalive, timer independente de `retrieve()`, limite de memória, pacotes tardios e gap skip; teste de nonce único e retransmissão | perda de um datagrama não bloqueia fluxo; duplicados e replays rejeitados; 0 deadlocks em caos |
| P0-5 | **CRÍTICA** | Estado coerente de interface | Servidor deve associar `path_id` autenticado aos peers, com TTL e estado; revalidar sessão/endpoint após NAT rebinding; não tratar porta UDP como identidade física estável | escolha server→client consistente, sem enviar 50% a path morto |
| P1-1 | **ALTA** | Repartição por capacidade (concurrency.ts, transfer.ts) | Substituir RR **por weighted deficit round-robin ou política de pacing por path**, iniciando com pesos fixos e EWMA limitada; histerese e limites mínimos; **scheduler por direção** no cliente e na VPS | A mais lenta recebe peso reduzido; ganho medido acima da melhor WAN quando viável; regressão com A=B |
| P1-2 | **ALTA** | Limites de velocidade/dados (limits.ts) | Token bucket/budget **por WAN** na camada de envio, contagem de tráfego real inclusive overhead + duplicados; diário/semanal/mensal; modo poupança dados móveis e alerts | WAN limitada não ultrapassa limite acima de tolerância; rollover testado |
| P1-3 | **ALTA** | Notificações e controlo dinâmico | API local do serviço Windows via Named Pipes com ACL, comandos idempotentes `add/remove/set_weight/set_cost/set_mode`; snapshot só leitura exposto à GUI | nenhuma alteração de TOML com segredo em perfis temporários |
| P1-4 | **ALTA** | E2E/chaos/property tests | Laboratório controlado de WANs simuladas: perdas 0–20%, jitter 5–200 ms, assimetria, 1..N links, retransmissão, ordem invertida, NAT rebinding, suspensão do Windows | testes CI com seeds reprodutíveis; cenários 30 min sem stall |
| P2-1 | **MÉDIA** | Menu de redes, renomear e mostrar cores | C# desktop: lista por GUID, rótulo, custo e throughput; **dados de saúde reais** e perfis persistentes cifrados | GUI controla live registry sem PowerShell |
| P2-2 | **MÉDIA** | Medidor temporal e estado | Speed test integrado `A/B/A+B/A+B+C`, down/up, latência/jitter/perda, volume configurável, percentis, histórico e exportação | >=3 repetições por cenário; overhead identificado |
| P2-3 | **MÉDIA** | Controlo do consumo | Limites mensais de hotspot por cliente e uplink; política data saver, alerta ao atingir 80/100%, parar sem mudar NIC física | teste com Android ligado via Wi-Fi hotspot |
| P3-1 | **DEPOIS** | Interface e experiência desktop | Tray, auto start, tema, perfis, assistente de diagnóstico, atualização com rollback; visual não define comportamento do motor | testes UI Windows 11; nenhum dado de demonstração no modo live |

## 4. Hotspot da Internet combinada — requisito próprio do Bond0

O Plexo **não resolve esta etapa**. Implementar de raiz no serviço Windows:
1. Detectar suporte físico a hotspot Wi-Fi Direct/Mobile Hotspot ou usar AP USB dedicado; uma placa Wi-Fi em modo cliente nem sempre suporta AP simultâneo.
2. Verificar que o **tráfego dos clientes do hotspot** será encaminhado pelo `Bond0` e não por uma única WAN física. Evitar default route global para preservar o acesso do PC.
3. Prevenir loop do UDP destinado à Oracle fixando egress físico por uplink.
4. Configurar NAT/DHCP/DNS apenas num segmento de partilha separado, com snapshot e rollback transacional da configuração Windows; não transformar interface de hotspot em WAN descoberta.
5. Validar um segundo dispositivo: DHCP+DNS+HTTPS, IP público Oracle, queda isolada de uma WAN, recuperação, consumo, restauro completo.

**Aceite apenas com evidência de cliente real**. O botão "Abrir Hotspot" da POC é apenas assistente.

## 5. Plano de implementação sem arriscar a VPS em produção

- **Sprint 0 / baseline + observabilidade (P0-2/P0-3):** criar testes de NIC bind e contador/telemetria por path no motor Rust; snapshot tipado para Windows/VPS. Sem alteração do scheduler enquanto as medições não existirem.
- **Sprint 1 / fiabilidade do túnel (P0-1/P0-4/P0-5):** reconexão 1..N, fix control/data sequence, reorder timer, peer id por sessão, anti-replay/nonce. Testes com jitter, perda, NAT rebinding.
- **Sprint 2 / algoritmo (P1-1/P1-2):** introduzir scheduler ponderado atrás de feature flag, mantendo round-robin como fallback; níveis de qualidade e política de dados móveis.
- **Sprint 3 / produto desktop (P1-3/P2-1/P2-2):** Serviço Windows isolado + IPC autenticado, gerir redes em live, dashboard com velocidades por WAN, testes A/B/A+B/N, limites e histórico sem segredos temporários.
- **Sprint 4 / partilha (hotspot/WinNAT/ICS):** gateway separado, policy routing, snapshot/rollback, clientes reais e controlo remoto com confirmação.
- **Sprint 5 / Netlify e releases:** API VPS autenticada TLS+OIDC; dashboard só read-only até RBAC; benchmark + assinatura + installer/rollback Windows.

Cada sprint necessita de **Build Windows GitHub Actions + unit tests Rust + smoke em Windows real + rollback documentado**, e alterações na VPS devem ser implantadas apenas após aprovação explícita. O PR draft #25 é o laboratório e **não faz merge automático**.

## 6. Testes comparativos exigidos

| Cenário | Característica a provar | Observação |
|---|---|---|
| A sozinho | velocidade útil e jitter | baseline, volume idêntico |
| B sozinho | velocidade útil e jitter | baseline, sem Wi-Fi Direct |
| A+B RR actual | medir ganho relativo | dado histórico 4 MiB / 2,76 s ≈ 12,15 Mbps; não provar ganho sem A e B |
| A+B ponderado | comparar round-robin vs política por capacidade | 3+ repetições, mesmos volumes e condições |
| A+B+C | hot-plug e N interfaces | LAN+2 Wi-Fi/USB com egress distinto |
| Path em falha | desligar **conectividade lógica** da WAN, sem desabilitar NIC Windows | mantém fluxo no caminho activo |
| Rede cara | atingir cota de dados e reponderar | contabilizar bytes UDP efetivos |
| Hotspot | cliente Android sem rotas do PC adulteradas | egress IP público Oracle; DNS/NAT |

## 7. Não fazer / segurança

- Não copiar diretamente o scheduler de blocos HTTP para o data-plane IP; não renomear classes de Plexo sem compreender diferenças.
- Não guardar `encryption_key_b64` em logs, site Netlify, GitHub Actions, TOMLs temporários distribuídos ou relatórios.
- Não ativar default route global, ICS ou NAT do hotspot sem snapshot, rota anti-loop e rollback.
- Não usar IP ou port de CGNAT como identificador definitivo de WAN.
- Não apresentar medições de upload/downlink como somatório "garantido".
- Não dizer que mais interfaces significa mais ISPs: 2 links para o mesmo router/mesma ligação WAN não aumentam capacidade.
- Quando usar porções substanciais de Plexo, incluir licença MIT e copyright original, com nota de alterações e origem.

## 8. Decisão de arquitetura (ADR-001)

**Aceitar a ideia de telemetry-driven multi-WAN e limites do Plexo; rejeitar a cópia do scheduler HTTP na camada IP.**  
Implementar o motor eficiente e multiplataforma em Rust, serviço Windows em C#/.NET e manager read-only seguro na VPS, mantendo o painel Netlify como cliente de uma API autenticada. `Plexo` é uma referência técnica, não dependência de execução do Bond0.

**Estado em 15/10/2026:** investigação concluída e documento de integração criado. Código do motor Rust de produção não alterado nesta auditoria; próximos passos exigem um PR de implementação com testes e provas Windows.
