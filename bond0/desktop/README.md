# Bond0 Desktop v0.2 preview

**Estado:** primeira implementação Windows que ainda requer testes reais no computador do utilizador.

## Executar a versão leve

1. Em GitHub Actions, descarregar o artefacto **Bond0-ControlCenter-Windows-x64-LIGHT-PREVIEW**.
2. Extrair o ficheiro ZIP numa pasta própria. Não colocar sobre o motor Rust existente em `C:\Bond0`.
3. Abrir **Bond0-Start.cmd** (não executar diretamente o `.exe` na primeira abertura).
4. O iniciador verifica a presença do **.NET Desktop Runtime 8 x64**. Se estiver ausente, pede autorização, descarrega-o a partir dos metadados oficiais Microsoft, compara o SHA-512 e verifica a assinatura Authenticode antes da instalação. O Windows pedirá UAC; nenhum instalador é executado sem autorização.
5. A interface abre, solicita privilégios para operar o túnel e deteta automaticamente as interfaces físicas. A janela mostra os motivos de falha: interface inexistente, sem DHCP/IPv4, outro processo cliente ativo, Wintun ou erro Rust.
6. Em **Minhas redes**, seleciona as interfaces atualmente válidas. Se aparecer um IP `169.254.x.x`, a WAN não está operacional; não force o início. Em **Diagnóstico**, vê mensagens do motor e registos depurados.
7. **Velocidade** abre o laboratório de download/upload/latência/perda/jitter, usando o endpoint privado na VPS.
8. Ao minimizar ou clicar X, a aplicação vai para a bandeja do Windows; o motor iniciado pela aplicação pode permanecer ativo. Para parar e sair, usa **Sair** no ícone da bandeja.

O runtime não é incluído no ZIP. O arranque por `.exe` diretamente ignora a verificação feita pelo lançador; recomenda-se usar `Bond0-Start.cmd`.

## Comunicação com a VPS e Netlify

- O servidor UDP do túnel é independente da interface.
- O `bond0-manager` já foi instalado na VPS e escuta apenas em `127.0.0.1:8870`; por enquanto está em modo somente leitura.
- A ligação administrativa desktop ↔ Manager **não está ativa**: ainda faltam HTTPS, autorização/autenticação e emparelhamento.
- O site Netlify foi criado, mas ainda não tem deploy confirmado nem acesso autenticado à VPS.
- Nenhum token, chave de túnel ou segredo de administrador pode ser enviado aos artefactos ou incluído no código da web.

## Segurança e limites

- Não desativa placas físicas, não cria NAT/ICS e não altera as rotas por defeito do Windows.
- A aplicação cria temporariamente um perfil TOML com a chave já existente para iniciar o motor, procurando eliminá-lo imediatamente após o início. É um **risco residual da POC**; a produção exige named pipe com ACL/DPAPI.
- Se o nome `Ethernet 3` não existir ou `Wi-Fi 2` tiver `169.254.x.x`, o início será bloqueado e será apresentada uma mensagem explicativa.
- Hotspot combinado A+B: apenas pré-verificação; ativação automática ainda depende de hardware real e do teste seguro de ICS/NAT, DHCP, DNS e reversão.
- Sem IA em runtime.

---

## Funcionalidades OBRIGATÓRIAS para release (a POC ainda não as concluiu)

- Dashboard com velocidades RX/TX por rede e agregada, saúde da Oracle, perda, latência e consumo.
- Inclusão de **qualquer número de adaptadores Wi-Fi, Wi-Fi USB, Ethernet e tethering** (com exclusão de Bond0, Wi-Fi Direct e gateways ICS da lista de WANs).
- Teste de velocidade gráfico com download/upload, ping/jitter/perda e comparativos A, B, A+B, A+B+C, N WANs; duração e volume seleccionáveis; histórico e resultados reais.
- **Hotspot virtual que partilha a Internet combinada do Bond0**, com SSID, senha, banda (quando suportada), estado de clientes, uso de dados, DHCP/DNS/NAT e restauro; não basta abrir as definições do Mobile Hotspot.
- Partilha por Ethernet/LAN separada, recuperação de falhas, bloqueio de fuga de tráfego e rotas físicas fixas até à VPS (evitar loop).
- Servidor VPS emparelhado de forma autenticada; opção de diagnósticos, relatórios e actualizações seguras.
- Aplicação autónoma, tray, perfis, arranque com Windows opcional, alertas, backups/restauro e português; **sem IA**.
- A partilha automática só será activada após prova num dispositivo real de que a saída é o IP público Oracle e os dois caminhos transportam dados.

Consultar `../PLAN.md` (secções 6.1–6.4) para engenharia detalhada e gates de aceite.

## Restrições antes de release
1. A POC escreve configuração TOML temporária contendo a chave simétrica preexistente em `%LOCALAPPDATA%\Bond0Control\Profiles`. A versão de produção tem de substituir isto por um canal local seguro/ACL/DPAPI sem duplicar segredo em disco. Não usar esta preview em PCs multiutilizador.
2. O sistema operativo e APIs Windows ainda precisam de smoke tests. A compilação CI não prova o funcionamento do Wintun/hotspot.
3. Um perfil Personalizado deve ser aplicado com o túnel parado; a escolha de N interfaces depende de os adaptadores estarem disponíveis e do motor Rust aceitar os seus aliases.
4. Esta POC não faz descoberta/configuração de servidor remoto, pairing OIDC, arranque automático, actualização de versão nem hotspot completo.
5. Nunca activar o full tunnel ou substituir rotas predefinidas nesta POC.
6. Se outro `bonding-client` já estiver em execução, fechá-lo normalmente (Ctrl+C) antes de usar a GUI.
7. Consultar `../PLAN.md` para a arquitectura definitiva, milestones e critérios de aceite.

**Preview / não distribuir como produto final.**
