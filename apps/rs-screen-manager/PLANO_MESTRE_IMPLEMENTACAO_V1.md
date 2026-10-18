# RS SCREEN MANAGER — PLANO MESTRE DE IMPLEMENTAÇÃO V1
**Produto:** RS Screen Manager — connect+  
**Base auditada:** branch feature/rs-screen-manager, preview v0.3.1-alpha, 18/10/2026  
**Destino:** Windows 11 x64 (WinUI 3/C++20), Android autorizado por USB ou rede, scrcpy/ADB como base  
**Objetivo:** transformar um gestor experimental de processos scrcpy numa aplicação coesa, funcional, de alta qualidade visual, com ecrãs virtuais, Gaming real, ligação por hotspot, clipboard, áudio e gestão completa de sessões.

> Documento de execução. Nenhuma função incompleta pode ser apresentada como pronta; uma compilação verde não substitui testes de uso num Windows e Android reais. Manter o nome connect+, logomarca abstrata exclusiva, azul #007BFF, fundo #090B10, laranja #FF6B35 exclusivo para Gaming e Liquid Glass integral no dashboard. Preservar todas as funções existentes.

---

## A. FONTES, PRECEDÊNCIA, ESTADOS E VERIFICAÇÃO

### A.1 Fontes de verdade
1. Requisitos expressos pelo utilizador para este produto e correções posteriores (prevalecem).
2. DESIGN.md do projeto e decisões de identidade imutáveis.
3. Implementação observável em MainWindow.xaml/.cpp, core, testes e workflows na branch.
4. Documentação técnica oficial da versão *efetivamente distribuída* de scrcpy, ADB/Android, WinUI, WLAN/Windows.
5. Propostas deste plano apenas onde faltam especificações e com validação técnica posterior.

### A.2 Regra de estado funcional
Usar as categorias IMPLEMENTADO E TESTADO NO DISPOSITIVO, IMPLEMENTADO MAS NÃO TESTADO NO DISPOSITIVO, PARCIAL, NÃO IMPLEMENTADO, INDISPONÍVEL PELO SISTEMA. Um botão com um handler não significa funcionalidade aprovada. Atualizar uma tabela de rastreabilidade por PR e por build.

### A.3 Estado de partida verificado
- **Existem:** enumeração ADB device/unauthorized/offline; pair/connect IP:porta; início de scrcpy em janelas separadas; --new-display e --start-app; opções de qualidade; várias sessões e encerramento; gravação MP4; screenshot do ecrã físico; catálogo simples; estado de mapeamento de toques testado sem injeção; valores de clipboard aplicados a sessões novas; configurações locais; primeira experiência e UI PT parcial.
- **Não existem de forma integral:** hotspot Android como fluxo próprio; galeria de vídeo dentro da aplicação; descodificação/renderização embebida; editor de mapeamento real com injeção de multitoque; ícones e nomes legíveis das apps Android; switching instantâneo da política de clipboard em sessões existentes; pesquisa/organização avançada de multimédia; estados/telemetria de FPS/latência; localização automática PT/EN; associação automática robusta app↔display; lançamento de apps filtrado por launchability; testes de UX no Windows real.
- **Problemas de arquitetura:** a classe MainWindow mistura UI, processos, ADB, filesystem, controlo de sessões e perfis; leituras ADB têm esperas síncronas até vários segundos; estado de sessão ainda depende de um vector de handles de processo; o executável scrcpy externo não oferece o canal de injeção multitoque usado pelo estado de mapeamento; a opção automática de dimensão não garante adaptação de todas as apps.

### A.4 Regras de produto
- Não introduzir root como requisito, bypass de permissões, instalação silenciosa de companion nem gravar áudio/vídeo sem opção explícita.
- Não destruir, redesenhar indiscriminadamente ou regredir funcionalidades comprovadas; manter fallback nativo até substituição validada.
- Software completamente funcional sem Internet externa; hotspot/Wi-Fi/USB devem funcionar por rede local quando suportados.
- Problemas de compatibilidade devem ser comunicados claramente, com recuperação/fallback, e nunca mascarados como sucesso.
- Usar o scrcpy oficial e verificar licenças, versões, hashes e diferenças de flags; não copiar dependências de fontes não oficiais.

---

## B. RESULTADO UX/UI DEFINITIVO — APLICAÇÃO INTUITIVA

### B.1 Modelo mental
A aplicação responde sempre a quatro perguntas: **Que Android está ligado? O que posso abrir? O que está a acontecer agora? Onde posso ajustar uma opção sem perder o que faço?** Nenhuma tela deve exigir ler textos longos para descobrir o próximo passo.

### B.2 Arquitetura de informação proposta
Navegação lateral compacta, recolhível, com 6 entradas principais e labels sempre disponíveis com expansão; preservar o acesso por teclado. Cabeçalho leve com dispositivo selecionado, transporte USB/Wi-Fi/hotspot, qualidade de ligação, número de sessões e ação de reconectar.
- **Início**: estado geral, último Android, CTA "Ligar Android", "Espelhar" e "Criar ecrã"; miniaturas reais somente após existir renderizador.
- **Dispositivos & Conexões**: USB; Wi-Fi da mesma rede; **Hotspot do telemóvel**; Wi-Fi/Hotspot do PC (se suportado); estado e diagnóstico.
- **Ecrãs & Sessões**: ecrã físico, ecrãs virtuais, aplicações, janelas abertas, organização e controlos por sessão.
- **Gaming**: biblioteca de perfis, iniciar modo Gaming, editor visual, inputs, overlays e estatísticas.
- **Biblioteca**: capturas, gravações, histórico persistente, filtros, destinos e exportação.
- **Definições/Ajuda**: básico por defeito, painel avançado separado, diagnósticos, atalhos, idioma, acessibilidade e suporte.
Os módulos existentes de perfis, editor, diagnóstico e ajuda permanecem acessíveis, mas deixam de dominar a navegação principal.

### B.3 Design system obrigatório
- **Marcas**: RS Screen Manager e connect+; logomarca própria, iconografia Segoe Fluent *consistente* em janelas, taskbar, instalador, notificações, sobreposição e assistentes. Não usar emojis nem caracteres de texto como ícones.
- **Cor**: #090B10 de fundo; #007BFF em CTA/foco; laranja #FF6B35 somente dentro de Gaming; sem cores meramente decorativas para status; texto de leitura em contraste testado.
- **Superfícies**: Liquid Glass completo no dashboard; vidro moderado apenas em chrome compartilhado; superfícies opacas leves no vídeo/Gaming ativos; sombra moderada e sem blur sobre frames.
- **Tipografia**: Segoe UI; 3 hierarquias principais, escalas 12/14/16/20/28/32 DIP, sem títulos gigantes repetidos; regular para explicações, semibold para ações e títulos.
- **Grid**: base 8 DIP; gaps 8/12/16/24/32; cantos 8–14 DIP; 44 DIP de alvo mínimo nos controlos, botões de ícone com tooltip e AutomationProperties.Name.
- **Estados**: default, hover, foco de teclado, pressionado, desativado, loading, success, warning, error, empty, skeleton e offline. Usar indicador textual + ícone + cor; nunca apenas cor.
- **Movimento**: 120–220 ms para trocas pequenas, easing discreto, respeito por reduced-motion; animações desligadas na área Gaming sob baixa potência.
- **Responsividade**: largura mínima útil documentada e testada; nav colapsa, cards reorganizam-se, drawers nunca saem do ecrã, listas scrollam internamente quando adequado; nada deve ficar cortado em 125/150/175/200% DPI.
- **Acessibilidade**: navegação Tab/Shift+Tab previsível, Esc para fechar drawer/dialog, foco devolvido ao botão que abriu, leitores de ecrã, nomes/descrições, estado de seleção, contraste, touch targets; não roubar foco inesperadamente.
- **Reutilização**: componentes implementados como templates/estilos/resources/converters e viewmodels, sem repetição de centenas de HEX ou margens fixas por página.

### B.4 Dashboard refeito (wireframe funcional em texto)
Barra superior: [logomarca RS connect+] [Android selecionado + estado] [USB / LAN / Hotspot] [Reconectar] [Definições].
Hero compacto, em uma frase: "Liga o teu Android e escolhe o que fazer".
Fila 1: cartão de **Ligação** (estado / causa / próximo passo), cartão **Ecrãs ativos** (quantidade, nome e miniaturas se reais), cartão **Ação rápida** (Espelhar, Criar ecrã).
Fila 2: última sessão (Retomar após revalidar autorização), aplicações favoritas e predefinição de desempenho.
Fila 3: atalhos discretos para Gaming, Gravações e Diagnóstico. Nenhuma caixa vazia com texto de marketing. O dashboard não deve parecer uma página de documentação. A primeira ação muda conforme o estado (desligado, não autorizado, pronto, sessão ativa, erro).
Em janela estreita, os cartões passam para uma única coluna; o primeiro CTA continua acessível sem scroll horizontal.

### B.5 Painel Gaming e opções avançadas — UMA identidade
Gaming não é outra aplicação. Mesmas grelhas, radius, fontes, navegação, tokens, elevação, ícones e comportamento dos botões. O laranja é **um pequeno realce semântico**, nunca uma mudança total de tema para preto/laranja agressivo.
- Centro Gaming: sessão/dispositivo selecionado, jogo/perfil, preview real, estado dos inputs, botões Iniciar/Editar/Terminar e diagnósticos.
- Editor separado: ecrã real ao centro; ferramentas à esquerda; propriedades do controlo selecionado à direita; barra contextual com guardar, desfazer, refazer, testar, reset, importar/exportar; zero painéis decorativos.
- Avançadas de Gaming: um drawer uniforme com separadores Inputs, Sensibilidade, Mira, Multitoque, Desempenho, Acessibilidade/Atalhos; search e defaults; avançado não muda a identidade gráfica.
- Esc fecha; alterações não guardadas pedem confirmação; botão de reset apenas com aviso; perfil ativo aparece no header.
- Sem conteúdo simulado: quando um motor não está conectado, mostrar "Ainda não disponível", não um editor falso.

### B.6 Qualidade visual comprovada
Executar ciclos de captura real em Windows (não mockups), comparando 100% / 125% / 150% / 200% DPI, ecrã 1366×768, 1920×1080 e janelas pequenas. Recolher screenshots de Início, Dispositivos, Ecrãs, Gaming, Editor, Avançadas, Biblioteca, 4 estados vazios/erro. Reprovar qualquer truncagem, overflow, controlos sem ícone/nome, contraste ou fluxo confuso. Manter relatório por revisão e screenshots de antes/depois.

---

## C. CONECTIVIDADE — USB, LAN, HOTSPOT DO TELEFONE E RECUPERAÇÃO

### C.1 Arquitetura
Separar **transporte de rede** (USB, LAN Wi-Fi, hotspot Android, hotspot Windows) do **ADB autorizado** e da **sessão scrcpy**. Estar na rede não é equivalente a ter permissão ADB. As três camadas devem emitir estados e erros distintos.

Camada DeviceDiscoveryService: USB serial, tipo Android, friendly name, API/versão, produto, fabricante, autorização, transporte, lastSeen.
Camada NetworkInterfaceService: interfaces Windows, Wi-Fi disponível/conectado, SSID autorizado, gateway/interface/IP/máscara, event notifications, sem modificar a rede silenciosamente.
Camada AdbConnectionService: pair/connect/tcpip/list/disconnect, timeout/cancel, estado e erros normalizados.
Camada SessionCoordinator: observa Device/Network/ADB e reconecta sessões consentidas quando a autorização se mantiver.

### C.2 Assistente "Conectar via hotspot do telemóvel"
**Requisito central ecrã dedicado**, não esconder em "Ligação sem fios" genérica.
1. Selecionar dispositivo USB se conhecido, ou "Não tenho cabo" (só tentar wireless debugging se Android realmente permitir).
2. Explicar o modo offline: Internet externa não é necessária para espelhar; PC e Android precisam de comunicação IP local.
3. No Android, ativar **Ponto de acesso/Hotspot pessoal**; mostrar instruções adaptadas ao idioma do Windows, sem assumir nomes de menus idênticos em HyperOS/Samsung/Pixel.
4. No Windows, descobrir adaptadores Wi-Fi e redes disponíveis via WLAN API autorizada; apresentar SSID; botão "Abrir definições Wi-Fi do Windows" como fallback para permissões/privacidade.
5. Só conectar ao SSID indicado depois de confirmação do utilizador; nunca guardar senha em texto claro nem alterar a prioridade de redes à revelia; perfis WLAN do Windows podem gerir segredos.
6. Verificar IP local, gateway e rota pelo adaptador associado ao hotspot (GetAdaptersAddresses / tabela de rotas); **não fixar** gateway 192.168.43.1, 192.168.1.1 ou porta 5555 sem confirmação do método.
7. **Caminho A, USB autorizado primeiro (prioritário e robusto):** mostrar USB autorizado; pedir consentimento explícito para habilitar adb tcpip (porta escolhida/documentada, tipicamente 5555), executar via serial correto, verificar listener e endereço do Android, permitir retirar cabo, tentar adb connect no IP confirmado pela interface USB/rede/hotspot e verificar nova entrada device autorizada.
8. **Caminho B, wireless debugging Android 11+:** oferecer pareamento PIN/IP:porta quando a funcionalidade está habilitada e disponível; endereço de pairing e endereço de connection podem diferir; verificar que o Android permite Wireless Debugging no cenário de hotspot — certos aparelhos interrompem ou impedem esta combinação. Sem promessa de garantia.
9. Mostrar estados separados: "PC ligado ao hotspot", "Android identificado na rede", "ADB a aguardar autorização", "ADB autorizado", "scrcpy pronto".
10. Botões Repetir, Alterar método (USB, Wi-Fi, hotspot), Ver diagnóstico e Esquecer ligação. Não exigir Internet/cloud.
11. Ao cair a rede ou mudar o gateway, interromper tentativas, não insistir em IP obsoleto; propor nova deteção e recuperar com backoff e máximo de tentativas limitado.
12. Ao desligar, fechar túneis/sessões apenas quando solicitado; nunca desativar o hotspot Android ou trocar a rede Wi-Fi do PC silenciosamente.

**Aviso técnico:** "O computador está ligado ao hotspot" não garante "Depuração sem fios suportada". Alguns Android apenas expõem wireless debugging estando ligados como cliente a um ponto Wi-Fi; nesses casos, o método USB inicial com adb TCP/IP pode funcionar, sujeito ao sistema e autorização; se falhar, explicar e oferecer ligação USB. Testar no dispositivo real; não tentar bypass.

### C.3 Fluxos adicionais
- **USB normal**: plug/unplug, RSA prompt, cabo só carga/ADB indisponível, conflito drivers, vários dispositivos, nunca escolher arbitrariamente se há mais de um.
- **LAN Wi-Fi existente**: depuração wireless PIN/port, USB→TCPIP, SSID/gateway, descoberta mDNS onde suportada, IPv4 e IPv6 se aplicáveis, firewall/perfil de rede Windows.
- **Hotspot Windows**: documentar fluxo inverso onde o PC partilha rede e Android é cliente; hardware e perfil da rede podem impedir. Não depender desta opção para o requisito hotspot Android.
- **USB tethering**: detetar e distinguir partilha de Internet USB de transporte ADB USB; suportar comunicação IP apenas se houver rota e autorização, não confundir com conexão ADB.
- **Vários Wi-Fi/adaptadores**: escolher interface e rota corretas sem conflitar com ligação ativa/Internet do PC; permitir exibir adaptadores internos e USB.
- **Reconexão**: memorizar dispositivo, método, IP validado por rede, última autorização, retries; nunca memorizar PIN temporário; rejeitar serial trocado ou dispositivo não autorizado; restauro de sessões sem duplicações.
- **Segurança**: não abrir listeners TCP/IP externos no PC, não expor ADB além da rede local conscientemente escolhida, explicar risco de adb tcpip ligado e oferecer desligar modo TCP/IP quando possível.

### C.4 Critérios de aceitação da conexão
C-HOT-01: PC liga-se ao SSID de hotspot do Android após ação explícita e mostra SSID/interface.
C-HOT-02: se ADB não escutar, estado específico e solução (USB primeiro/depuração sem fios) sem falso sucesso.
C-HOT-03: com ADB autenticado, scrcpy inicia sem Internet externa e o touchscreen pode ser controlado.
C-HOT-04: Wi-Fi cai e regressa — UI não bloqueia, reconecta se permitido, evita sessões duplicadas.
C-HOT-05: PC com dois adaptadores utiliza a interface escolhida; não assume gateway fixo.
C-HOT-06: Android rejeita wireless debugging durante hotspot — UI explica e oferece fallback correto.
C-USB-01: USB unauthorized não lança scrcpy; o utilizador vê instrução de autorização.
C-SEC-01: nenhuma palavra-passe/PIN/clipboard é registado em logs em claro.

---

## D. ECRÃS VIRTUAIS, ORIENTAÇÃO, LAUNCHER E APLICAÇÕES

### D.1 Criar ecrã — fluxo guiado
Passo A: selecionar Android autorizado, mostrar capacidade real de ecrãs virtuais após probe.
Passo B: escolher "Ecrã inicial/launcher", "Aplicação instalada" ou "Sem app, ecrã vazio" somente se suportado. Mostrar nome, ícone real quando obtível e fallback coerente quando não.
Passo C: mostrar orientação "Automática/seguir app", "Retrato", "Paisagem (forçar)", "Personalizada" com preview de proporção e warning.
Passo D: escolher perfil Eco, Equilibrado, Qualidade ou Gaming, com detalhes em drawer; sem parâmetros técnicos na experiência básica.
Passo E: pré-visualizar o plano, lançar, aguardar primeiro frame/ready, só então marcar como pronto.

### D.2 Suporte real a apps instaladas
- Descobrir packages por ADB do dispositivo exato (não misturar lista de dois Android), validar package id, detetar atividade iniciável com PackageManager/resolve-activity ou alternativa robusta.
- Apresentar nome, ícone e categoria apenas quando houver fonte real. Se não houver, usar package ID e ícone neutro e uma nota; não simular metadados.
- Para nomes/ícones sem Companion, avaliar extração local de resources APK usando bibliotecas adequadas (aapt2/resource parser incluído/licenciado) e cache por versionCode/Android; falhar graciosamente em split APK, apps protegidas ou ausentes.
- Companion Android **opcional, consentido** poderá expor metadados oficiais via PackageManager, caso seja a abordagem necessária; sem ele, a função base ainda deve listar/largar apps.
- Busca por nome/pacote, favoritos, recentes e apps do sistema quando opção explícita; não listar apps que não podem ser lançadas como se fossem launchable.
- Definir comportamento para app não instalada, não launchable, app bloqueada pelo sistema, ecrã virtual recusado, app já aberta no ecrã físico.
- Permitir reabrir app, mudar app sem perder as outras sessões quando possível, abrir configurações da app, voltar ao launcher e fechar apenas a atividade da sessão.

### D.3 Orientação e resize sem dividir ecrãs
- NÃO forçar landscape por omissão, nem definir 1920×1080 como fallback universal.
- Distinguir **orientação do display Android**, **orientação da janela no Windows** e **orientação permitida pela app**; não inferir uma da outra.
- Detectar display density/tamanho/orientação real e preparar dimensões iniciais apropriadas. O scrcpy --new-display sem parâmetros usa a dimensão/densidade nativa; isso **não é prova de adaptação dinâmica a cada app**.
- Pesquisar/validar suporte a --flex-display conforme versão: esse modo ajusta virtual display ao tamanho da janela, logo NÃO ativá-lo cegamente; redimensionar uma janela paisagem pode forçar uma app retrato a letterboxing.
- Política de orientação: **Auto seguro = preservar aspecto base e aceitar rotação suportada pela app; não reformatar display enquanto app fixa estiver ativa**. Landscape manual apenas após confirmação com warning visível.
- Quando app não suporta landscape, manter viewport retrato centralizado com black bars proporcionais **dentro da janela**, sem dividir o vídeo nem duplicar painéis; jamais esticar ou cortar imagem sem escolha.
- Ao rodar: atualizar transformações de toque, overlays, coordenadas e pré-visualização; preservar estado e não enviar toques durante a reconciliação.
- A virtual display pode não ter system launcher/decorations em alguns Android; apresentar escolha de app. Não confundir com "Segundo Espaço" do HyperOS.
- Teclado IME/entrada de texto: verificar política do teclado do display virtual; oferecer opção local quando scrcpy suportar, sem prometer isolamento absoluto.
- Destroy/resume: comportamento explícito ao fechar ecrã virtual, destruir conteúdo, transferir atividade ao físico apenas se suportado; não deixar displays órfãos.

### D.4 Multijanela real
Grelha de sessões em WinUI com live thumbnails, mover/destacar/fixar, vista mosaico, tabs, janela flutuante independente, fullscreen, always-on-top, snaps, zoom (sem alterar aspect automaticamente), minimizar sem matar sessão e layouts salvos. Selecionar uma sessão principal afeta teclado/clipboard/áudio/controles; outra sessão não recebe inputs inadvertidamente. Múltiplos dispositivos e displays do mesmo Android permanecem independentes.

### D.5 Critérios
V-01: app só retrato mantém apresentação utilizável mesmo após redimensionar janela larga.
V-02: jogo landscape escolhido manualmente inicia em paisagem sem duplicar ecrã.
V-03: app incompatível dá erro compreensível e sessão revertida sem ficar órfã.
V-04: lista exibida com nome/ícone quando disponível; fallback correto e pesquisa.
V-05: 2 displays num Android e +1 noutro não confundem controlos ou vida útil.
V-06: fechar uma janela não termina outra nem destrói conteúdo sem política.
V-07: teclado/touch coordenam-se corretamente em 0/90/180/270 graus.

---

## E. VÍDEO EMBEBIDO E MOTOR DE SESSÕES

### E.1 Regra arquitetural
A janela scrcpy externa é um fallback provisório, **não** uma solução definitiva para grid de vídeos, Games overlays, foco/contexto, screenshots virtuais e multitoque. Não "colar" uma janela de terceiro no WinUI com hacks de SetParent fingindo integração.

### E.2 Implementação planeada
1. Auditar a versão scrcpy fixada e documentar protocolo vídeo/áudio/controlo/canais, lifecycle e compatibilidade de licenças.
2. Escolher abordagem entre cliente embebido derivado da implementação scrcpy (com manutenção e licenças auditadas) ou transporte/decoder controlado com protocolo oficial comprovado; prova de conceito isolada.
3. Conectar/desconectar streams por DeviceId+DisplayId+SessionId; separar decode e render da UI thread.
4. Decodificação por hardware preferencial quando disponível (FFmpeg/DXVA/D3D11, conforme arquitetura testada) e fallback software com orçamento CPU.
5. Render via SwapChainPanel ou superfície nativa equivalente D3D, sincronização de frame/present, sem blur no caminho de vídeo.
6. Recuperação do stream em reset de encoder, mudança de orientação, suspend/resume, queda de USB/Wi-Fi e reconexão.
7. Calcular transform viewport (letterbox/crop/rotation/DPI) partilhada com Gaming, screenshot, pointer injection.
8. Implementar frame metrics, frame drops, decode queue e backpressure; não guardar frames indefinidamente em memória.
9. Encerrar recursos com cancelamento e RAII, sem threads/zombies, sockets ou pipes órfãos.
10. Só remover botão "Abrir janela externa" depois de o embed passar nos testes; manter fallback disponível em caso de GPU/driver incompatível.

### E.3 Qualidade/benchmark
Perfis Eco, Equilibrado, Qualidade, Gaming; resolução máx, FPS, codecs H.264/H.265/AV1 apenas onde suporte confirmado, bitrate, audio, encoder/device capabilities. "60/90/120 FPS" são **alvos de perfil**, não garantias universais. Medir cold start, latência, CPU/GPU/memória, dropped frames por dispositivo/transporte/resolução. Sob alto uso, reduzir efeitos na superfície de vídeo sem alterar o dashboard.

### E.4 Critérios
E-01: o Android aparece como frame real no WinUI, não screenshot estática.
E-02: rato e teclado interagem com o display correto e sem falsos toques em barras.
E-03: 2 ou mais streams não congelam UI, não trocam dispositivos, não crescem memória ilimitadamente.
E-04: janela externa scrcpy continua como fallback selecionável.
E-05: erro de decoder/driver oferece recuperação visível.

---

## F. GAMING — EDITOR VISUAL E MULTITOQUE VERDADEIRO

### F.1 Objetivo e invariante
**WASD, rato, botões e gamepad do computador produzem eventos táctis genuínos no Android**, com contacto independente DOWN/MOVE/UP e mapeamento de coordenadas correto. Nunca oferecer controlo decorativo apenas com toggles ou enviar simplesmente W/A/S/D como teclado Android quando foi solicitado joystick táctil.

### F.2 Arquitetura
- InputCaptureService: Raw Input Win32 (teclado/rato), Windows gamepad API / XInput, eventos com timestamp e dispositivo de origem. Ignorar inputs quando outra aplicação tem foco (salvo modo explicitamente autorizado).
- MappingEngine: evolução de core/game_mapping.hpp; múltiplos ponteiros estáveis, ações, zonas e gestos; configurado por perfil; sem acoplamento a WinUI.
- TouchTransport: canal autorizado compatível com scrcpy control protocol da mesma versão do servidor; serial/display certo, backpressure/rate limit, recuperação e validação de permissões. Companion opcional para capacidades excepcionais, nunca obrigatório.
- TransformService: pixéis da janela -> viewport efetivo -> rotação -> densidade -> pontos físicos display Android; detetar letterboxing e monitores Windows com diferentes DPI.
- ProfileStore: JSON versionado com game package, device model opcional, resolution/aspect, layout, sensitivity, shortcuts, video profile, mapper version e migração.
- GamingSessionController: ativa/desativa captura apenas na sessão focada; ao perder foco, desconectar, mudar orientação, abrir diálogo ou sair, **enviar UP para todos os ponteiros** e restaurar rato/teclado. Não deixar joystick preso.

### F.3 Funcionalidades de controlo pedidas
- WASD -> stick virtual com normalização diagonal, deadzone e raio configuráveis.
- Mira FPS por rato relativo: bloqueio/libertação do cursor, sensibilidade horizontal/vertical, aceleração opcional, smoothing configurável, invert Y, reset/recenter e limite de movimento.
- Clique esquerdo -> disparo/ação; clique direito -> ADS / mira; botões extra do rato atribuíveis.
- Botões individuais e repetição controlada; pressionar/soltar; toque longo; swipe; arrastar; dupla ação; combos de teclado quando configurados.
- Multitoque simultâneo de pelo menos dois controlos, e testes com três ou mais; pointer-id alocado sem colisões.
- Gamepad Xbox/XInput/Windows.Gaming.Input quando disponível: detetar, testar ecrã de botões/eixos, sticks, triggers, deadzone, curvas, vibração somente se suportada, perfis e desconexão segura.
- Teclas personalizáveis, conflitos detetados, combinações/macro de sequência com limites de duração e cancelamento imediato; não prometê-las em jogos que bloqueiam inputs sintéticos.
- Overlay editável: arrastar/soltar controlos sobre o **vídeo real** (não imagem fictícia), editar posição/propriedades, duplicar, apagar, undo/redo, snapping, alinhamentos, zoom e teste ao vivo.
- Modo "Mostrar zonas de toque" útil para calibração e aviso de compatibilidade.
- Perfis por jogo e dispositivo, import/export com validação de schema e versão, favorito, quick-switch; proteção contra importação maliciosa (nada de comandos externos).
- Modo janela, fullscreen e borderless; hotkey universal apenas quando explicitamente configurada, sem conflitos com atalhos do Windows.
- FPS/latência/CPU/GPU e estado de Gamepad visível durante testes reais; stop de emergência para soltar todos os controlos.

### F.4 UX do editor
Editor em 3 áreas: barra de ferramentas (esquerda), viewport Android real (centro), propriedades detalhadas (direita). "Básico" mostra apenas Mapear/Editar/Testar/Guardar; "Avançado" surge em drawer *do mesmo sistema*, com grupos Mira, Inputs, Multi-touch, Perfis, Desempenho e Acessibilidade. Azul é ação; laranja Gaming realça as ferramentas específicas, sem trocar toda a app de tema. Controlo selecionado tem alças, legenda e indicação do atalho vinculado. HUD não cobre jogo fora do modo editor.

### F.5 Compatibilidade e segurança
Controlos Android podem depender de "USB debugging (Security Settings)" em fabricantes como Xiaomi e de permissões do sistema. Explicar quando injeção for rejeitada; nunca tentar contornar protections/anti-cheat, proteções de aplicações bancárias, privacidade ou APIs de segurança. Nenhum keylogger global oculto. Não injetar toques em chats ou apps fora da sessão pretendida.

### F.6 Critérios
G-01: WASD produz movimento de joystick real no Android, inclusive diagonal.
G-02: disparo e mira simultâneos sem soltar joystick.
G-03: mudança de foco/desconexão interrompe todos os contactos em até um ciclo de evento do motor.
G-04: Editor drag/drop salva e restaura pontos no mesmo jogo e em DPI diferente.
G-05: gamepad desconectado não deixa tecla/touch preso.
G-06: orientação e letterbox preservam touch preciso.
G-07: 2 sessões não recebem simultaneamente input não destinado.
G-08: importar perfil malformado retorna erro e não danifica perfis existentes.

---

## G. CLIPBOARD COMPARTILHADO — SESSÕES COM FOCO

### G.1 Modos visíveis
- **Automático bidirecional:** política scrcpy padrão onde suportada; indica Android→PC em mudança e PC→Android mediante colagem.
- **Preferir PC:** manter o conteúdo do Windows sem substituição automática pelo Android; colar no Android quando o utilizador o solicitar.
- **Preferir Android:** ativar atualização do Windows a partir do Android quando suportada; também permitir colagem explícita PC→Android.
- **Manual:** dois botões explícitos "Enviar texto do PC ao Android" e "Trazer texto do Android ao PC" quando canal tiver acesso real; não simular cópia de conteúdos a que não temos acesso.
O texto de ajuda tem de coincidir com os atalhos efetivos da versão scrcpy distribuída (o atalho MOD pode diferir de Ctrl), testado no Windows.

### G.2 Switching com foco
- Sessão selecionada/focada decide destino de colagem; nunca enviar texto a uma outra sessão aberta.
- UI indica origem/destino e sincronização ativa por sessão.
- Quando integrado ao canal de controlo, alterar modo **sem relançar o stream**, quando tecnicamente suportado; caso contrário, manter modos por nova sessão e explicitar limitação.
- Evitar loop Android→PC→Android, last-writer wins ambíguo; armazenar sequência/origem de alterações apenas em memória e aplicar deduplicação/hash para texto sem guardar conteúdo.
- Suportar Unicode/UTF-8/emoji/acento em PT, texto grande dentro de limites; conteúdo sensível (senhas, OTP, clipboard privado) não deve ser sincronizado automaticamente sem consentimento, e não deve surgir em logs/diagnósticos.
- Visibilidade de permissões Android (apps bloqueiam clipboard em certas versões) e fallback de "colar" quando possível.
- O Companion continua opcional; sem Companion, imagens/ficheiros/clipboard binário não devem ser prometidos se o protocolo não suportar.

### G.3 Testes
CL-01: copiar texto PT com acentos Android→PC; colar dentro de editor Windows.
CL-02: PC→Android no display focado, enquanto segundo display permanece intacto.
CL-03: alternar política em sessão ativa sem corromper clipboard (após integração do canal); desativar autosync quando pedido.
CL-04: disconnect durante sincronização não congela UI nem vaza dados para novo dispositivo.
CL-05: copy/paste bloqueado por app Android exibe aviso real, sem alegar sucesso.

---

## H. ÁUDIO, CÂMARA, CAPTURA E GRAVAÇÕES

### H.1 Áudio
- Receber áudio Android quando Android/API/codec suportarem; saída Windows selecionável por dispositivo de áudio, master volume, mute por sessão.
- Opção de duplicar áudio Android/Windows **somente** onde o protocolo permitir; não duplicar indevidamente ou afirmar suporte universal.
- Sincronização A/V com timestamps e política ao pausar vídeo; seleção por sessão e mistura quando várias janelas, nunca canal duplicado não solicitado.
- Microfone PC→Android e modo conversação apenas após prova técnica explícita/permissão. Não confundir áudio de saída, microfone e transmissão do microfone da app.
- Reconfiguração segura quando altifalante/headset entra ou sai; fallback sem crash.

### H.2 Capturas e gravação
- Gravar ecrã físico ou virtual selecionado em MP4/MKV conforme opção disponível; start/stop seguro, pausa se suportada, indicador REC persistente.
- Screenshots reais do display selecionado: ADB screencap físico ou frame embebido do display virtual; incluir orientação correta e, quando escolhido, overlay/cursor.
- Biblioteca com thumbnail gerada localmente, metadata (display, dispositivo, data, duração, codec, tamanho, orientação), pesquisa, filtros, ordenação, favoritos, rename, exportar, abrir pasta e eliminar com confirmação.
- Histórico persistente sem logs sensíveis; rotatividade e limpeza opt-in por espaço; verificar integridade do ficheiro depois de finalizar.
- Gravação durante queda de energia/processo não pode garantir arquivo perfeito, mas deve preservar dados temporários e detetar recuperação quando possível.
- Screenshot pelo botão/atalho sem piscar UI, selecionando a sessão correta, incluindo ecrãs virtuais.

### H.3 Extras scrcpy sujeitos a validação
Ecrã Android ligado/desligado sem interromper espelhamento; janela always-on-top; teclado físico/HID; controlo-only; vídeo sem áudio; câmera mirroring onde suportado; drag&drop simples de ficheiros e instalação APK **apenas por ação explícita**, com indicador de progresso e aviso de segurança.

---

## I. PERFIS, AJUSTES, ATALHOS, AUTOMAÇÃO LOCAL

### I.1 Perfis
Perfis Eco/Equilibrado/Qualidade/Gaming ajustáveis; campos bitrate, FPS, codec, encoder, resolução, densidade, áudio, orientação, modo clipboard, gravação, foco, transporte preferido. Predefinições por Android e por app/jogo, com defaults que não forçam landscape.

### I.2 Personalização e persistência
- Config JSON/SQLite transacionada (investigar decisão, não misturar formatos ad hoc), schema versionado, migração da atual winui-settings.ini, cópia de segurança automática antes de migrar e rollback.
- Layout de janelas por display/monitor/DPI e restauro com clamp para monitor desconectado; lembrança do dispositivo/sessão apenas após reautorizar o Android.
- Tema automático Windows escuro/claro quando viável sem violar a identidade dark preferencial; manual escuro/claro conforme requisitos e acessibilidade, contrast mode, reduced motion.
- PT-MZ/pt-PT/en-US com detecção do Windows e seletor manual, fallback local consistente; jamais strings portuguesas hardcoded em handlers em produção.
- Atalhos locais/globais configuráveis para abrir gestor, alternar sessão, screenshot, parar gravação, alternar Gaming/overlay, fullscreen e clipboard; detectar conflitos, exigir opt-in para hotkeys globais.
- Notificações Windows para ligar/desligar, sessão perdida, ficheiro gravado, erro de autorização; sem mostrar texto copiado/secretos.

### I.3 Operação offline e manutenção
Funciona sem login nem cloud; atualizações manuais ou opcionais assinadas e verificadas; não fazer downloads automáticos em ligação cara/hotspot sem escolha. Sem auto-delete de configurações na atualização. Instalador e ZIP portátil com hashes SHA256 e verificação de integridade.

---

## J. DIAGNÓSTICOS E RESILIÊNCIA

### J.1 Pipeline observável
Estados de sessão explícitos: IDLE → DISCOVERING → NETWORK_CONNECTED → ADB_AUTHORIZED → STARTING → STREAMING → RECONNECTING → STOPPING → STOPPED/ERROR. Estados inválidos devem falhar com erro e recovery, não ativar botões enganadores.
- Logs estruturados por sessionId/correlationId com categoria USB/WLAN/ADB/scrcpy/video/audio/input/clipboard, timestamps e nível; redaction por defeito.
- Diagnóstico amigável: dispositivo, autorização, transporte, IP/gateway sem segredos, ADB/scrcpy versões, capabilities Android, codec, display, FPS, dropped frames, bitrate, latency estimada quando mensurável, uso CPU/GPU/RAM e disponibilidade de audio/multitoque.
- Botão "Copiar diagnóstico" **sanitizado**, sem password hotspot, PIN, clipboard, conteúdo de ecrã ou dados pessoais.
- Mensagens acionáveis: "USB não autorizado", "Porta ADB indisponível", "PC ligado ao hotspot mas depuração indisponível", "App não suporta ecrã virtual", "Falha no encoder", "Áudio não permitido".
- Reparação assistida: mudar transporte, reiniciar sessão selecionada, revarrer apps, fallback de decoder, ajustar qualidade, voltar USB, sem reiniciar todos os ecrãs.
- Timeout e cancelamento com futures/tasks; NUNCA usar WaitForSingleObject longo na UI thread em refresh/ADB/process start; mover I/O de disco/rede para background com dispatch de resultados à UI.

### J.2 Robustez
- Processos filhos RAII, job objects Windows se aplicável, encerramento graceful de scrcpy/gravação, crash isolation, rollback da configuração.
- Scheduler com limites para scans de hotspot/reconexões e enumeração de apps; evitar tarefas duplicadas e race na seleção.
- Restaurar sessao com serial/authorization/display/app atual, validar compatibilidade, não duplicar em reconexão.
- Performance: sem memory growth indefinido após 100 ciclos start/stop; sem locks da UI em listas com milhares de apps.
- QA de segurança: argumentos de subprocess bem escapados, whitelist de parâmetros, caminho de gravação seguro, importação de perfis validada, sem execução shell baseada em dados da app.

---

## K. ARQUITETURA C++ PROPOSTA — FRONTEIRAS E CONTRATOS

### K.1 Separação de módulos
**App/UI**
- ShellView/NavigationService
- DashboardView + DashboardViewModel
- DevicesView + ConnectionWizardViewModel
- ScreensView + SessionGalleryViewModel
- GamingView + MapperEditorViewModel
- LibraryView + MediaLibraryViewModel
- SettingsView + AdvancedSettingsDrawerViewModel
- DiagnosticsView + DiagnosticsViewModel
- ComponentLibrary/ThemeResources/Localization/Accessibility

**Core independente da UI**
- DeviceRegistry/DeviceCapabilities
- NetworkInterfaceService/WlanManager/HotspotConnector
- AdbRunner/AdbAuthorization/DiscoveryService
- SessionCoordinator/SessionStateMachine
- AppCatalogService/PackageMetadataCache
- DisplayPolicy/OrientationManager
- StreamTransport/VideoDecoder/FramePresenter
- AudioService/RecordService/ScreenshotService
- InputCapture/TouchTransport/MapperEngine
- ClipboardBridge/ClipboardPolicy
- ProfileStore/HistoryStore/SettingsMigrator
- TelemetryDiagnostics/ErrorCatalog

### K.2 Modelos
DeviceRecord: deviceId, serial, label, AndroidApi, transport(s), currentInterface, authorization, capabilities, lastSeen.
ConnectionRecord: connectionId, mode=USB|LAN_WIFI|ANDROID_HOTSPOT|WINDOWS_HOTSPOT|USB_TETHER, interfaceGuid, endpoint, lastVerified, security state.
SessionRecord: stable SessionId, DeviceId, DisplayId, AppPackage, profileId, clipboardMode, audioMode, orientationPolicy, windowLayout, recorderState, videoStreamState.
InputContact: SessionId+DisplayId+PointerId, phase, normalizedPoint, timestamp, sourceAction, transformEpoch.
MediaRecord: fileId, sessionId, type, finalPath, codec, duration, size, createdAt, integrityStatus.
ErrorMessage: code, severity, summary, exact possible cause, resolution actions and sanitized diagnostic keys.

### K.3 Regras de concorrência
Serviços usam cancelamento, timeouts e bounded queues, enviam updates para UI DispatcherQueue. Input/video nunca aguardam draw de Glass. Versionar transformEpoch para rejeitar toques de layout anterior. No shutdown: release inputs → stop capture/recording → close stream → stop process → persist estado. Um SessionId não muda quando só o endpoint IP muda.

### K.4 Estratégia scrcpy/ADB
- Manter CLI scrcpy oficial como fallback comprovado para espelhamento e vídeo.
- Fazer spike documentado de integração de decoder e controlo; protocolos podem mudar entre versões — testar contra a versão exata do pacote, não copiar pseudoprotocolo da versão master.
- Separar compatibilidades de Android/HyperOS; gravar matriz em testes, nunca prometer flags sem verificar binário instalado.
- Decidir licença e dependências (FFmpeg, Windows App SDK, recursos do renderer) antes de incluir bibliotecas no instalador.

### K.5 Estrutura de diretórios de referência
apps/rs-screen-manager/{core,services,platform/windows,render,ui/winui,tests/unit,tests/integration,tests/ui,assets,docs,packaging}
Migração incremental dos ficheiros atuais para estes módulos sem reescrever o produto todo de uma só vez; manter os targets de build e fallback durante a transição.

---

## L. PLANO DE EXECUÇÃO — EPICS, TAREFAS E DEPENDÊNCIAS

Todos os entregáveis exigem código, testes, documentação do que foi comprovado e screenshots quando houver UI. Os números são IDs de rastreabilidade, não estimativas de prazo.

### ETAPA 00 — Congelar baseline e auditoria funcional (bloqueante)
- RS-0001: marcar commit/artefacto aprovado v0.3.1, criar backup de configurações e registar hashes.
- RS-0002: inventariar todas as páginas/botões e mapear handler→função real→teste.
- RS-0003: inventariar todo ADB/scrcpy/renderer/licenças/assets/perfis usados.
- RS-0004: criar tabela Compatibilidade Android 15/16, HyperOS, Win11; medir base em USB.
- RS-0005: estabelecer reprodutor e matriz de regressão, preservar fallback.
**GATE:** baseline reproduzível com testes no PC e Android, issues classificados por severidade.

### ETAPA 01 — Infraestrutura/estado/async (pré-requisito de todas as outras)
- RS-0101: extrair AdbRunner de MainWindow com futures/cancel/timeouts.
- RS-0102: DeviceRegistry e seleção multi-dispositivo reativa.
- RS-0103: SessionCoordinator + máquina de estados; stop/reconnect sem handles órfãos.
- RS-0104: Event bus/event callbacks com thread affinity correta.
- RS-0105: settings schema/migrator + logs sanitizados.
- RS-0106: teste reconnect/disconnect/race e 100 start-stop.
**GATE:** zero bloqueio da UI em scan, timeout, desconexão/reconexão; funções existentes passam.

### ETAPA 02 — Design system e navegação (em paralelo com etapa 01 após contratos)
- RS-0201: biblioteca única de tokens, componentes, ícones, foco, states e breakpoints.
- RS-0202: redesenhar o dashboard com ação adaptativa de ligar/espelhar/criar.
- RS-0203: nova shell/navegação e diálogos com escape/focus restore.
- RS-0204: aplicar o MESMO sistema ao Gaming e drawer avançado; realce laranja restrito.
- RS-0205: onboarding sem marketing, exemplos reais e ilustrações próprias úteis.
- RS-0206: screenshot regression em 3 larguras × 4 DPI; keyboard and screen reader smoke.
**GATE:** zero overflow, botões sem action falsa, contraste/teclas/painéis validados visualmente.

### ETAPA 03 — HOTSPOT Android + USB/Wi-Fi completo (alta prioridade visível)
- RS-0301: enumeração adaptadores WLAN, permissões e perfis do Windows.
- RS-0302: assistente hotspot Android completo; selecionar SSID/abrir Windows Wi-Fi.
- RS-0303: gateway/route/interface detection, teste conectividade local.
- RS-0304: USB autorizado → adb tcpip → desconectar cabo → connect por IP.
- RS-0305: Android 11+ wireless debugging pair + connect, documentação dos limites hotspot.
- RS-0306: reconexão/rescan/exceções firewall/portas, dois Wi-Fi adapters.
- RS-0307: estados UX e diagnósticos por método, sem passwords em logs.
- RS-0308: testes completos offline no Android alvo com hotspot ligado e sem Internet.
**GATE:** cenário hotspot + ADB autorizado controlável, e estados de falha explícitos onde Android bloquear.

### ETAPA 04 — App catalog e orientação correta
- RS-0401: packages/launchable-activity por dispositivo, friendly labels/icons quando real.
- RS-0402: catálogo com search, favoritos, app system toggle, cache e atualização.
- RS-0403: dimensionamento nativo com portrait-first/auto; landscape opt-in.
- RS-0404: detectar capabilities, launcher vazio, display/IME policy.
- RS-0405: controle de letterbox/aspect sem crop forçado e transform de toque.
- RS-0406: salvar sessão por display, app, orientação e política de fecho.
- RS-0407: testes app portrait locked e jogo landscape em Android 15/16.
**GATE:** nenhum app retrato é automaticamente forçado a landscape; erro de app não iniciável é claro.

### ETAPA 05 — Renderer nativo e galeria de ecrãs (bloqueante para Gaming editor)
- RS-0501: spike e decisão registrada de transporte scrcpy/decoder/control.
- RS-0502: decodificação e apresentação WinUI com surface nativa.
- RS-0503: input mouse/keyboard por display; touch transform.
- RS-0504: multi-stream/multi-device/tabs/gallery/floating windows.
- RS-0505: pause/recovery/fallback to external scrcpy, medir CPU/GPU/latência.
- RS-0506: testes GPU/codec/driver e stress 2+ ecrãs.
**GATE:** vídeo funcional dentro da app; início/fecho e 2 streams com estabilidade demonstrada.

### ETAPA 06 — Clipboard e áudio por sessão
- RS-0601: mapear shortcuts reais do scrcpy e corrigir documentação/UI.
- RS-0602: ClipboardBridge com foco por SessionId, modos auto/PC/Android/manual.
- RS-0603: live switching real quando canal integrado, deduplicação/privacy.
- RS-0604: audio devices, per-session volume, mute, routing, sync e duplicação quando permitida.
- RS-0605: testes Unicode, 2 displays, desconexão, microfone apenas após validação técnica.
**GATE:** copiar e colar funciona no display correto; nenhum dado vaza entre sessões.

### ETAPA 07 — Gaming real (alta complexidade, sem mock funcional)
- RS-0701: captura RawInput/gamepad, multi-pointer touch sender integrado ao scrcpy.
- RS-0702: WASD stick, aim mouse, fire, ADS, simultâneo; releaseAll on blur.
- RS-0703: editor sobre live renderer com arrastar/soltar + propriedades.
- RS-0704: visual drag/snapping/undo/redo/duplicate/test mode e conflitos.
- RS-0705: perfis versionados por jogo/app, importar/exportar seguro.
- RS-0706: drawer avançado coerente, hotkeys, macro cancelável, gamepad calibration.
- RS-0707: testes físicos com Android/HyperOS e jogos distintos.
**GATE:** toque Android verdadeiro verificado; sem keymap falso, sem pointer preso, Gaming visualmente integrado.

### ETAPA 08 — Biblioteca, gravação e exportação
- RS-0801: recorder por sessão físico/virtual com indicador e graceful close.
- RS-0802: screenshot do display virtual via renderer, crop seguro.
- RS-0803: thumbnails reais, metadata, pesquisa/filtros/recents/favoritos.
- RS-0804: proteção ficheiros, rename/delete/export, limpeza opt-in.
- RS-0805: recuperação de gravações interrompidas onde formato suportar.
**GATE:** 2 gravações paralelas válidas, thumbnails e screenshots corretos por display.

### ETAPA 09 — Localização, acessibilidade, perfis e atalhos
- RS-0901: mover textos WinUI/C++ para recursos pt-MZ, pt-PT, en-US.
- RS-0902: idioma do Windows automático e troca manual persistente.
- RS-0903: acessibilidade: UI Automation, screen reader, teclado, zoom, reduce motion.
- RS-0904: perfis por app/dispositivo e restore layouts.
- RS-0905: atalhos configuráveis, conflitos e consentimento hotkeys globais.
- RS-0906: onboarding completo, help localizado, cobertura PT/EN.
**GATE:** fluxo integral PT/EN com foco/esc/interação verificados sem strings misturadas.

### ETAPA 10 — Diagnósticos/proteções/QA de produto
- RS-1001: métricas FPS/CPU/GPU/RAM/latência conforme fonte mensurável.
- RS-1002: testes automáticos unit/integration/UI + testes com hardware físico.
- RS-1003: logs sanitizados, import validation, ADB security review, rollback installer.
- RS-1004: memória/handles, multi-session race, hotplug e network churn.
- RS-1005: visual baseline com capturas, regressões de layout e audit accessibility.
- RS-1006: acceptance review por feature e matriz de compatibilidade.
**GATE:** nada marcado completo sem evidência/resultado testado.

### ETAPA 11 — Instalador e entrega
- RS-1101: Inno Setup/portable ZIP com recursos nativos/ícone/scrcpy/ADB verificados.
- RS-1102: update in-place sem apagar preferências/perfis/histórico; backup e migração.
- RS-1103: build Windows x64, testes Linux apenas quando aplicável, checksums e SBOM/licenças.
- RS-1104: GitHub Actions separa installer-only/full, nomes/versões claros, release notes.
- RS-1105: smoke test EXE num Windows limpo, com e sem Android; assinatura apenas se houver certificado válido (não alegar assinatura inexistente).
**GATE:** utilizador instala, liga hotspot/USB, abre sessões, opera controles e recupera configuração sem falhas críticas.

---

## M. CRITÉRIOS GLOBAIS DE QUALIDADE E MATRIZ

### M.1 Dispositivos/sistemas prioritários
Windows 11 Pro x64; ecrã 1366×768 e 1920×1080; DPI 100/125/150/200%; portátil com GPU integrada e recursos limitados; Android 15/16; HyperOS 3/Redmi Note 13 Pro e pelo menos um Android de outro fabricante na validação de compatibilidade. USB, Wi-Fi LAN, Android hotspot **sem Internet** e modo offline. Nenhum resultado deve ser inventado caso não exista o equipamento disponível.

### M.2 Cenários end-to-end de aprovação
1. Sem Android: iniciar em menos de um fluxo intuitivo, explicar conexão USB/hotspot, não abrir janelas vazias sem texto.
2. USB autorizado: selecionar, espelhar, mudar FPS, copiar/colar, screenshot e fechar.
3. USB não autorizado: avisar de RSA sem tentar bypass.
4. Hotspot Android: ligar PC à rede, obter IP, ativar ADB com caminho suportado, abrir scrcpy; testar falha/volta da rede.
5. Duas sessões (virtual e física) do mesmo Android: inputs, clipboard e áudio corretamente roteados.
6. Aplicação portrait-only com janela Windows landscape: proporção preservada, sem vídeo partido/deformado.
7. App launchable e não launchable: sucesso e erro real, com estado limpo.
8. Gaming: WASD+mouse+disparo simultâneos no ecrã correto; blur/libertar pointer.
9. Gamepad: configurar, jogar, desconectar durante contato e soltar toques.
10. Gravação/screenshot de ecrã virtual e físico, arquivos verificáveis.
11. Reduzir janela e mudar DPI enquanto grava e joga, sem corte de controles.
12. Fechar e reabrir Windows app: restaurar preferências sem iniciação não autorizada.
13. Iniciar app sem Internet: manter funcionalidades locais e avisar apenas dos recursos online opcionais.
14. Enviar clipboard contendo texto sensível: respeitar modo consentido e não logar.
15. PT/EN: 100% ecrãs/erros/ajuda traduzidos; ícones e labels legíveis.
16. Driver GPU incompatível: fallback sem crash e sem perder configurações.

### M.3 Metas operacionais a verificar (não promessas)
- Ações UI de navegação e seleção devem dar feedback visual no mesmo ciclo da UI, sem chamadas de I/O bloqueantes; controlar latências via instrumentação.
- Meta de resposta de comando local: feedback imediato e cancelamento para operações que demoram; timeouts documentados por ADB/stream.
- Monitorizar memória após 100 ciclos de sessão e depois de várias horas; critérios finais definidos com baseline do hardware.
- FPS reais comparados com perfil e suporte do device; 120 FPS não é meta obrigatória de aceitação universal.
- Latência medir localmente e sob hotspot/USB; limites de aceitação dependem de teste real de equipamento e codec.
- Sem credenciais no log; sem sessão duplicada; sem touches presos; sem fechamento de janelas não solicitadas.

### M.4 Gate de Definition of Done (obrigatório por item)
[ ] Código real no ramo de trabalho; [ ] feature flag quando incompleta; [ ] teste unitário/integration; [ ] teste hardware quando exige Android; [ ] screenshot real para UI; [ ] indicadores de acessibilidade; [ ] sem regressões nas features anteriores; [ ] documentação de capacidades/limites; [ ] logs sem dados sensíveis; [ ] build Windows e instalador; [ ] aprovação de aceite conforme caso.
Se algum item é impossível por limitação do Android, classificar INDISPONÍVEL PELO SISTEMA, documentar a prova e fornecer comportamento alternativo honesto.

---

## N. ESTRATÉGIA DE BRANCH/PR E FLUXO DO CODEX

- Partir da branch **feature/rs-screen-manager**, criar feature branches pequenas (core-async, hotspot, app-catalog, display, embedded-video, gaming-input, etc.); não reescrever main silenciosamente.
- Uma PR por módulo ou milestone; não eliminar branches do utilizador nem remover funções/skills sem ordem explícita.
- Antes de cada PR: diff, teste, regressões relevantes, screenshot antes/depois para UI.
- CI: compile WinUI C++ x64, teste core, teste policy, scan XAML/eventos, fail se botão “ready” sem handler real, empacotar apenas após aprovação.
- Integração em release/v0.x quando todos gates desse milestone passam; instalar localmente e testar com Android **pelo utilizador** quando ele assim preferir.
- Documentar em cada build o que efetivamente está testado e o que é pendente. Preferir release notes concretos; não usar “implementado tudo” de forma prematura.
- Após terminar as etapas, avaliar se os artefactos e UX permitem designar v1.0; número de versão sozinho não representa qualidade.

### N.1 Primeira PR recomendada
**PR 01 — HOTSPOT + CORE ASYNC + UX SHELL (sem fingir embeddeds).**
1. Consolidar baseline e snapshots da UI.
2. Extrair ADB runner assíncrono e state machine de conexão.
3. Adicionar ação principal “Ligar por hotspot do telemóvel”.
4. Implementar leitura segura de adaptadores, SSID, gateway, escolha de rede e as duas formas de ativar ADB com autorização.
5. Dar feedback por etapas sem bloquear UI, preservar ligações USB existentes e revalidar autorização.
6. Validar offline no Android alvo; screenshots das quatro telas/estados.
7. Sem testes de hardware concluídos, não etiquetar como “hotspot aprovado”, apenas “implementado, pendente de teste físico”.

### N.2 Segunda e terceira PRs recomendadas
**PR 02 — app chooser + orientações + UI Gaming coerente:** nomes/ícones verdadeiros quando viáveis, filtro launchable, auto/portrait, drawer unificado, testes de orientação e visual QA.  
**PR 03 — renderer integrado + canal de controlo:** base do vídeo no WinUI para viabilizar as etapas Gaming e clipboard avançado.

### N.3 Prompt de execução pronto para o Codex / OpenCode
> Trabalha no repositório MHGlobal/template-lab, branch feature/rs-screen-manager. Lê integralmente apps/rs-screen-manager/PLANO_MESTRE_IMPLEMENTACAO_V1.md e DESIGN.md, audita os ficheiros atuais antes de alterar. Implementa as etapas pela dependência e por PR pequenas, preservando todas as funcionalidades confirmadas, fallback Win32, identidade connect+ (cores imutáveis), Liquid Glass no dashboard e baixa latência em Gaming. Não cries botões falsos, não simules resultados, não contornes permissões Android, não instales Companion sem aprovação. Começa pela Etapa 00 e PR 01 de hotspot do telemóvel, ADB assíncrono e estados de ligação, mantendo USB/Wi-Fi. Compila Windows x64 em GitHub Actions, executa testes, cria instalador-only e ZIP e documenta honestamente os testes de Android que só o utilizador pode fazer. Para cada feature, regista estado e acceptance evidence. Não pares após um mockup.

---

## O. REFERÊNCIAS TÉCNICAS E QUESTÕES DE COMPATIBILIDADE

1. scrcpy — repositorio oficial: https://github.com/Genymobile/scrcpy
2. scrcpy — conexão e ADB TCP/IP: https://github.com/Genymobile/scrcpy/blob/master/doc/connection.md
3. scrcpy — ecrãs virtuais/--new-display/--flex-display/--start-app: https://github.com/Genymobile/scrcpy/blob/master/doc/virtual-display.md
4. scrcpy — copiar/colar/controlos: https://github.com/Genymobile/scrcpy/blob/master/doc/control.md
5. scrcpy — atalhos: https://github.com/Genymobile/scrcpy/blob/master/doc/shortcuts.md
6. Android Developers — ADB/depuração sem fios: https://developer.android.com/tools/adb
7. Microsoft Learn — WLAN API/WlanConnect: https://learn.microsoft.com/en-us/windows/win32/api/wlanapi/nf-wlanapi-wlanconnect
8. Microsoft Learn — Native Wi-Fi APIs: https://learn.microsoft.com/en-us/windows/win32/api/_nwifi/

**Importante:** as referências scrcpy acima podem descrever o master atual; ao implementar, verificar as flags e o protocolo da versão scrcpy **realmente empacotada**, em vez de assumir compatibilidade total. Hotspot Android e wireless debugging possuem restrições dependentes do fabricante e exigem prova no dispositivo.

---

## P. RESULTADO FINAL ESPERADO / CRITÉRIO DE SAÍDA

A versão final só poderá ser designada como pronta quando o utilizador conseguir, sem comandos manuais num terminal, **ligar USB/Wi-Fi/hotspot**, selecionar Android e app, criar displays virtuais sem distorcer apps retrato, espelhar dentro de um gestor coeso, trabalhar com clipboard e áudio por sessão, gerir várias janelas, gravar e capturar, executar controlos Gaming reais, configurar o editor/launcher/perfis, recuperar sessões autorizadas, mudar idioma e usar o produto a diferentes DPI e resoluções. Todas as funções devem ter estado/erros úteis, testes em hardware e compilação/instalador verificados.

**Não há prioridade descartável:** todas as áreas permanecem no backlog de execução. A sequência apenas respeita dependências técnicas, experiência segura e prevenção de regressões.

**Documento de planeamento, não implementação concluída.**
