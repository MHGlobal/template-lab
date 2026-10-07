# Bond0 Desktop v0.1 preview

C#/.NET 8 Windows Forms, compilado no GitHub Actions em `windows-latest`, modo `win-x64` self-contained.

## Pré-requisitos
- Windows 11 (prévia não testada em máquina real).
- Motor `bonding-client.exe` e `bonding-client.toml` já existentes em `C:\Bond0`.
- Direitos de administrador ao executar a aplicação.
- Os caminhos existentes para o motor Rust e a configuração não são incluídos no artifact. **Nenhuma chave de túnel deve ser enviada ao GitHub.**

## Funções já presentes na POC
- Iniciar/parar somente o motor lançado pela interface (não desativa adaptadores físicos).
- Modos A, B, A+B e perfil Personalizado com múltiplas interfaces reais enumeradas.
- Detectar endereço virtual `Bond0` e atribuir `198.18.0.2/24` se não estiver correto.
- Ping privado, health HTTP do túnel, download de 4 MiB, sockets do processo e logs.
- Separador Partilhar Internet: assistente para abrir definições do Mobile Hotspot; **não ativa ICS/NAT automaticamente**.
- Sem IA.

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
