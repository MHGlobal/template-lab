# Bond0 — Plano mestre de engenharia
**Estado:** fase de conceção e POC; nada neste branch autoriza publicação de uma API sem autenticação ou alteração automática de rotas de produção.
**Local de trabalho:** `MHGlobal/template-lab`, branch `lab/bond0-control-center` (base `editor`).
**Base de dados real (já verificada):** cliente Windows + Wintun (198.18.0.2/24), Oracle Ubuntu `mcpe-net` (198.18.0.1/24), tráfego STRIPE observado nos dois caminhos, NAT para `ens3`, teste de 4 MiB HTTP/200 e cerca de 12,15 Mbps combinados; ainda não há benchmark comparável A/B/A+B nem validação de hotspot.
**Restrição principal:** sem IA em qualquer componente em runtime.

## 1. Resultado esperado
Uma aplicação de bandeja e desktop para Windows (Bond0 Control Center), um serviço local Windows (Bond0 Agent), motor multipath Rust, um serviço de controlo na VPS (Bond0 Manager) e um painel web estático publicado pelo Netlify. A app deve permitir adicionar/remover interfaces de forma explícita (Wi-Fi interno, USB Wi-Fi 2/3/4, Ethernet, tethering), arrastar prioridades, ajustar pesos e verificar cada link antes de o activar. Deve também disponibilizar hotspot de Internet combinada, sem alterações automáticas arriscadas e sem dependência da ligação de controlo para o data-plane.

## 2. Separação de responsabilidades e linguagens
- **Windows UI:** C#/.NET 8 Windows (WinForms POC; UI de produção WPF/WinUI a decidir após testes), serviço Windows .NET, privilégios mínimos, ligação a processo/serviço local por Named Pipe com ACL.
- **Motor de rede:** Rust/Wintun; responsável por encriptação de pacotes, descoberta de interfaces, scheduler multipath, sequência de dados por sessão, keepalives, reconexão, detecção de falhas e medição por caminho. Sem acesso a tokens Netlify.
- **VPS data-plane:** actual `bonding-server` Rust UDP 5000 com TUN e NAT; não substituir enquanto a alternativa não tiver testes de compatibilidade e rollback.
- **VPS control-plane:** API Rust/Axum ou Python/FastAPI atrás de reverse proxy TLS. Protótipo inicial em Python stdlib, **apenas 127.0.0.1**, READ-ONLY. API de produção com OAuth/OIDC, tokens de curta duração, permissões, rate limits, auditoria e rotação de credenciais.
- **Web Netlify:** dashboard estático React/Vite ou JS leve (primeiro MVP HTML/CSS/JS), compilado e publicado separadamente. Netlify não hospeda sockets UDP/TUN nem armazena chave de encriptação do túnel.

## 3. Topologia e fluxo
```
PC Windows
  ├─ UI Bond0 Desktop ─── Named Pipe autenticado ──► Bond0 Agent Windows
  │                                                    │
  ├─ WAN 1: Ethernet / Wi-Fi interno ─┐                 ▼
  ├─ WAN 2: Wi-Fi USB 1              ├─► Rust multipath + Wintun Bond0
  ├─ WAN 3: Wi-Fi USB 2              │                 │
  └─ WAN N: tether/ethernet ─────────┘                 │ UDP cifrado por WAN
                                                       ▼
Oracle VPS: Rust Bond0 Server → TUN bonding0 → NAT ens3 → Internet
              │
              └── Manager API (loopback) ← reverse proxy TLS/OIDC
                                                 ▲
Netlify static web dashboard ─ HTTPS com sessão autenticada ─┘
```
Não partilhar o mesmo token para a chave simétrica do TUN e o acesso ao dashboard. Desktop e manager devem continuar a transportar dados mesmo sem Netlify, sem API e sem acesso ao dashboard.

## 4. Multi-WAN arbitrário (1..N)
- Enumerar adaptadores pelo GUID/ifIndex, descrição e endereço IPv4 válido; mapear alias amigável com confirmação visual; excluir Wintun, Microsoft Wi-Fi Direct, ICS e adaptadores virtuais por padrão.
- Adicionar Wi-Fi USB sem configuração manual de IP; permitir estados `enable/disable` lógicos no scheduler, **nunca** `Disable-NetAdapter`. Verificar interface/ping externo específico e bind real por interface.
- Preferências por caminho: activo, peso, prioridade, custo de dados, limite mensal opcional, saúde e política de roaming.
- Modos: STRIPE (agregação de um fluxo), PREFERRED (failover), REDUNDANT (duplicação, maior uso de dados); weights adaptativos após amostras suficientes, não mudar em cada pacote sem controlo.
- Sessão, reordenação, janelas anti-replay, limites de buffer, nonce, timeouts e retransmissão devem manter consistência; não reutilizar nonce com a mesma chave/domínio/ID.
- Evitar sequências globais que bloqueiam o túnel quando se perde um pacote ou quando o path muda. Incluir métricas de pacotes úteis, descartados, atrasados e retransmitidos.

## 5. Funções da aplicação Windows
**Painel:** ligar/desligar, estado de TUN, IP, links, latência, perda, bytes/s, estado da VPS, perfil, alerta de custo.
**Redes:** adicionar/remover qualquer número de WAN; scan; whitelist; GUID; ordenação; pesos; health test por interface; avisos de redes caras.
**Perfis:** 1 rede, 2 redes, N redes, preferencial, redundante; testes A, B, A+B, A+B+C; exportar métricas sem segredos.
**Servidor:** pairing, configuração do endpoint, estado, versão, uptime, diagnóstico e actualização.
**Diagnóstico:** UDP sockets/IP locais, tcpdump resumido na VPS via API autenticada, RTT/jitter/perda e regras NAT read-only; bundle depurado.
**Hotspot:** assistente controlado pelo estado da rede, DNS, firewall, políticas NAT e número de clientes; funcionalidades destrutivas só com confirmação e rollback.
**Experiência:** suporte português, ícone de bandeja, iniciar com Windows opcional, logs, backups e instalador assinado em release.

## 6. Partilha da Internet combinada
Partilhar WANs individuais é diferente de partilhar a interface Bond0. Suportar inicialmente:
- **Wi-Fi hotspot Windows**: verificar se Mobile Hotspot/ICS consegue usar Bond0 como *source*, escolhendo adaptador Wi-Fi de emissão distinto dos uplinks. Não assumir que um único rádio Wi-Fi pode simultaneamente conectar-se a outras redes e emitir um hotspot.
- **Ethernet LAN**: opção de Windows ICS ou WinNAT suportado, com sub-rede distinta e rota de saída Bond0, sem conflito com 192.168.137.0/24.
- **Recuperação**: registrar estado original de ICS/NAT, DNS, firewall, default route e métricas; timer de rollback e opção Restaurar rede.
- **Protecção anti-loop**: rotas explícitas por WAN para o endereço público da VPS devem atravessar exclusivamente essas WANs; nunca encaminhar túneis através do próprio Bond0. Se o túnel cair, desactivar a partilha sem danificar as placas.
Critério de aceite: pelo menos um dispositivo recebe DHCP, DNS, navega através da saída pública VPS, sobrevive à perda de um WAN e regressa ao estado anterior após desligar a partilha. Só automatizar o hotspot depois destes gates.

### 6.1 Requisitos obrigatórios do aplicativo DESKTOP (não opcionais)

O desktop Windows é o **centro operacional completo** do Bond0. Todas as funções abaixo devem ter interface própria e estado/resultado verificável. A interface web é complementar; o desktop tem de funcionar sem Netlify e com a API remota indisponível.

| Módulo desktop | Funções obrigatórias | Critério de aceite |
|---|---|---|
| Painel | Estado global, WANs disponíveis/ligadas, IP Bond0, estado da VPS, RX/TX em tempo real, velocidade útil, uptime, consumo e alertas | Dados reais, sem métricas simuladas; modo offline visível |
| Redes | Descobrir/adicionar/remover Wi-Fi internos/USB, Ethernet, tethering (N adaptadores); ligar/desligar **logicamente** caminhos, nomes/GUID, prioridade, pesos, limites de dados e estado individual | 1, 2 e 3+ WANs simultâneas sem incluir Wintun/ICS como uplink |
| Modos de ligação | STRIPE para agregação, PREFERRED/failover, REDUNDANT sob escolha explícita; reconexão automática, perfis guardados | Mudanças seguras, sem desligar placas físicas |
| **Teste de velocidade completo** | Download/upload, latência, jitter, perda, ping, medição por WAN A/B/C/N e simultânea A+B/A+B+C; gráfico temporal, histórico, exportação, tamanho/duração/consumo configurável, limite padrão pequeno | Comparar amostras repetidas e correlacionar contadores/pcap da VPS; reportar ganho **medido**, sem confundir distribuição 50/50 com ganho |
| **Hotspot virtual da Internet COMBINADA** | Criar/configurar hotspot com nome (SSID), palavra-passe WPA2/WPA3 quando suportado, banda se disponível, ligar/desligar, mostrar clientes e consumo; origem de saída deve ser o Bond0 agregado e não qualquer WAN isolada | Telefone ligado ao hotspot acede à Internet, mostra IP público da VPS, DNS funciona, não há fuga pela WAN direta e velocidade/consumo são monitorizados |
| Partilha por cabo | Partilhar o Bond0 para Ethernet/LAN separada; escolher porta/segmento, DHCP/DNS/NAT ou ICS/WinNAT adequados | Segundo dispositivo navega com IP público de saída do túnel, mantendo acesso a redes locais |
| Proteção de rotas | Fixar túneis UDP da VPS às interfaces físicas antes de redirecionar clientes; prevenção de loops, métricas, fail-safe, backups e restauração do estado Windows | Perda de uma WAN não provoca loop; perda total encerra/recupera partilha de forma previsível; restaura rotas, ICS/NAT/DNS |
| Gestão da VPS | Pareamento seguro, ping/health, estado remoto, capacidade do servidor, logs redigidos, atualizar perfil autorizado, versão e histórico | Modo só leitura seguro até existir HTTPS+OIDC/RBAC/auditoria; nunca expor comandos shell arbitrários |
| Experiência do utilizador | Botões claros Ligar/Desligar, arranque automático opcional, tray, notificações, idioma português, assistente inicial, atualização/rollback e exportar diagnósticos | Uso diário sem copiar/colar comandos, sem Rust/Visual Studio no PC |
| Segurança e privacidade | Secrets com DPAPI/ACL, credenciais separadas da web, nenhuma IA, logs sem chaves, permissões mínimas | Nenhum TOML com chave duplicada em perfis temporários na release; build/artefacts não incluem segredos |

**A partilha é de A+B (ou A+B+C+N) já agregadas, através do adaptador Bond0**. Partilhar só o acesso da Internet A ou só da B NÃO satisfaz o requisito. Na POC, o botão abre as definições do Windows; isso **não é uma implementação do hotspot virtual combinado** e deve continuar marcado *pendente* até cumprir os testes.

### 6.2 Engenharia específica do hotspot virtual
1. Detectar suporte real de hotspot no equipamento (incluindo limitações de Wi-Fi Direct/Hosted Network, banda e nº de rádios). Se o mesmo rádio não puder ser WAN e AP ao mesmo tempo, exigir rádio USB/segunda interface ou oferecer partilha Ethernet; nunca prometer suporte universal.
2. Preferir interfaces Windows suportadas (Mobile Hotspot/ICS e APIs oficiais); avaliar WinNAT/WFP ou serviço gateway próprio só quando ICS não conseguir selecionar Bond0 como origem. Não criar bridge de nível 2 como substituto silencioso de NAT de nível 3.
3. Antes de ativar: capturar snapshot de interfaces/rotas/ICS/firewall/NAT, aplicar pinning de cada túnel ao uplink físico e guardar rollback. Configurar a rota de saída pelo túnel **somente para o tráfego partilhado**, sem romper o acesso normal do PC.
4. Configurar o segmento AP com subnet não conflituante; DHCP, DNS, NAT, firewall e isolamento de clientes conforme preferência. Clientes devem aceder à Internet só via TUN agregado.
5. Verificar automaticamente a partir de cliente real: DHCP, DNS, HTTP(S), endereço público VPS, failover WAN, recuperação pós perda total, taxa de transferência por cliente, limites de consumo e desconexão limpa.
6. Em falha de gateway, terminar partilha ou reverter sem modificar adaptadores físicos e com restauração imediata. Fornecer botão **Restaurar rede** com trilho de auditoria local.
7. A dashboard Netlify apresenta o estado do hotspot apenas após autenticação; operações remotas de ativação/desativação requerem autorização forte, confirmação e execução no serviço Windows local (não na VPS).

### 6.3 Painéis e fluxo de utilizador desktop
- **Início:** Ligar Bond0, modo, velocidade total real, saúde de cada WAN e VPS.
- **Minhas redes:** adicionar/adaptar/remover redes físicas ilimitadas, pesos, prioridades, custo e status.
- **Velocidade:** selector A/B/A+B/N, ping/jitter/loss, upload/download, gráfico, histórico e relatórios.
- **Hotspot virtual:** activar partilha **da ligação combinada**, SSID/senha/banda, clientes, consumo e restauração.
- **Partilha LAN:** escolher adaptador Ethernet de saída e ver estado de DHCP/NAT.
- **Servidor VPS:** emparelhar e diagnosticar segurança, versão, carga e estado.
- **Definições:** auto-start, actualizações, DNS, métricas, políticas e backups.
- **Diagnóstico:** logs, rotas TUN, sockets por WAN, testes dos caminhos, reparar/reverter, exportar ZIP depurado.

### 6.4 Gates de aceite inegociáveis
- **GATE-DESKTOP:** nenhum passo de uso diário exige executar PowerShell, Rust, compilar ou editar TOML; a GUI controla o serviço Windows com permissões correctas.
- **GATE-SPEED:** medir com três repetições em A, B, A+B, e N se aplicável; velocidade útil, overhead UDP e uso efectivo de ambas as WANs.
- **GATE-HOTSPOT:** pelo menos 1 telemóvel/laptop recebe IP e DNS, abre HTTPS, identifica o IP externo Oracle, mede tráfego via duas WANs e mantém/recupera ligação se uma cair.
- **GATE-ROUTE:** endpoint público Oracle continua acessível pelas WANs físicas mesmo com o hotspot e tráfego default partilhado; sem routing loop.
- **GATE-RECOVERY:** desativação e falha repetidas deixam o Windows com o mesmo estado anterior de rotas, adapters, ICS/NAT/DNS/firewall.
- **GATE-PRODUCTION:** chaves não aparecem em configs temporárias, CI, logs, browser, URL ou artefactos. Teste Windows real é obrigatório; compilação CI isolada não basta.

## 7. Control-plane VPS / web
MVP REST somente leitura:
- `GET /api/v1/health`: estado do manager e versão.
- `GET /api/v1/server`: serviço, interfaces, contadores agregados (sem segredo).
- `GET /api/v1/links`: estado e métricas anonimizadas por caminho.
- `GET /api/v1/sessions`: sessões redigidas, sem mostrar chaves ou IPs privados a utilizadores não autorizados.
Posteriormente comandos idempotentes autenticados: `POST /api/v1/actions/restart`, `POST /api/v1/policies`, `GET /api/v1/events` SSE com backpressure. Nunca expor shell arbitrário.
Protecções: HTTPS end-to-end, OAuth2/OIDC/PKCE, MFA preferencial, JWT verificável pelo manager, audience/scope, CORS com origins permitidas, CSP, rate limiting, CSRF para cookies, logs sem segredo, auditoria, perfis viewer/operator/admin.
Netlify entrega JS estático; autenticação e gateway são servidores confiáveis. Não inserir tokens permanentes no bundle web. A API de demonstração não deve abrir uma porta WAN; manter somente no loopback.

## 8. Segurança operacional e rollback
- Não alterar `bond0-server.service` existente nesta fase. Não desactivar adaptadores físicos, e não escrever rota default sem um ponto de recuperação.
- Firewall Oracle com `/etc/iptables/rules.v4` preservado, regras Bond0 antes do REJECT e cópias de segurança; não introduzir regra global ACCEPT.
- Guardar chaves preexistentes no PC, nunca no repo público, artifacts, logs, telemetria ou Netlify.
- Config temporária do protótipo contém a chave já existente no TOML: para versão de produção, substituir por pipe/API local autenticada com ACL/DPAPI e eliminar duplicados. **Não usar a POC em máquinas multiutilizador sem rever este ponto.**
- Action secrets: só no GitHub Actions, com permissão mínima. Nenhum workflow do Template Lab público deve publicar URLs privados, IPs de sessões, logs com secrets, backups ou ficheiros TOML.
- Backups e rollback instalados antes de todos os updates; restauração num clique; health gates antes de aplicar mudanças.

## 9. Etapas, gates e evidências
| Fase | Trabalho | Critério para avançar |
|---|---|---|
| M0 | Inventário e baseline (TUN, 2 WAN, NAT, firewall, configs, benchmark) | Reproduzir HTTP 200 e dados nas duas WAN; rollback documentado |
| M1 | Motor Rust N-WAN dinâmico com GUID, API local e scheduler seguro | 1/2/3 interfaces válidas, interface virtual excluída, failover sem bloquear |
| M2 | Desktop .NET com perfis dinâmicos, serviço, logs e bandeja | Windows CI build + integração real sem alterar WANs físicas |
| M3 | VPS Manager API, autenticação e telemetria | Testes unit/integration + fuzz de parser + permissões + HTTPS/OIDC |
| M4 | Dashboard Netlify responsivo, autenticação e monitorização | UI acessível + tests + E2E + nenhum segredo no JS |
| M5 | Partilha hotspot e Ethernet com fail-safe/rollback | Clientes navegam pelo IP VPS; teste de Wi-Fi Direct/ICS e falha simulada |
| M6 | Benchmarks, observabilidade e distribuição | 3+ repetições por cenário, p50/p95, TCP single-flow/multi-flow, throughput útil e utilização de dados |
| M7 | Releases Windows assinadas, update transaccional e documentação | ZIP e instalador auto-contido, SHA256, rollback, smoke em Windows 11 |

Não afirmar soma de velocidades até testar A, B e A+B nas mesmas condições (tempo, servidor, volume, perda, CPU). A distribuição de 1.520/1.521 datagramas pelo servidor prova stripe downstream, não ganho real.

## 10. GitHub Actions (Template Lab)
- Branch `lab/bond0-control-center`, sob `bond0/`, sem mudar `editor`.
- `.github/workflows/bond0-lab.yml`: checks README/estrutura, testes de API Python, frontend estático Node, compilação Windows `windows-latest` em .NET 8 `win-x64` self-contained; `sha256sum`, artifacts e manifest.
- Gates adicionais futuros: Rust clippy/fmt/tests e cross target, segurança do TOML, integração em VM Windows com Wintun real, teste de replay e fluxo, throughput WANs, Playwright screenshots com artefactos.
- Release só a partir de tag aprovada e validação do binário no Windows; build sem signing key é **preview**, nunca instalador confiável final.
- O Template Lab é **executor de CI/ambiente experimental**, não a casa definitiva de código/segredos do produto. Antes de pôr código sensível, criar repo privado de produto e usar o fluxo SHA fixado + read-token como nos builds anteriores.

## 11. Netlify
- Publicar apenas `bond0/web/` com build estático.
- Vincular site ao mesmo repo/branch com Base Directory `bond0/web` e Publish `.` (para UI HTML simples).
- Deployment preview até existir domínio/API protegida. Só tornar dashboard operacional com `https://` e sessão OIDC.
- Deploys e build não reiniciam o servidor Oracle nem modificam o data-plane.

## 12. Estado factual e próximos trabalhos
Concluído: branch criada, POC WinForms com perfis multi-WAN, HTML de pré-visualização, cliente actual compatível com whitelist por nome, testes do core Rust anteriores, e servidor de benchmark local na VPS.
Ainda pendente: CI do branch, validação Windows da POC, serviço Windows separado, pairing/autenticação, API operacional segura, ligação Netlify, hotspot e benchmarking comparativo.
**Fase de implementação actual: M0/M2 POC, não release.**
