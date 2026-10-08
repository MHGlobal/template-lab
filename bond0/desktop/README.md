# Bond0 Desktop v0.1 preview

C#/.NET 8 Windows Forms, compilado no GitHub Actions em `windows-latest`, modo `win-x64` self-contained.

## Pré-requisitos
- Windows 11 (prévia não testada em máquina real).
- Motor `bonding-client.exe` e `bonding-client.toml` já existentes em `C:\Bond0`.
- Direitos de administrador ao executar a aplicação.
- Os caminhos existentes para o motor Rust e a configuração não são incluídos no artifact. **Nenhuma chave de túnel deve ser enviada ao GitHub.**

## Funções implementadas na POC atual (necessitam teste em Windows real)

- Arrancar/parar o motor Bond0 existente, sem desligar os adaptadores físicos.
- Seleção de perfis A, B, A+B e Personalizado com 1..N interfaces físicas; o motor recebe a lista de interfaces ao iniciar.
- Configuração do IP virtual Bond0 `198.18.0.2/24` após deteção do adaptador.
- **Laboratório de velocidade:** download/upload HTTP com 1, 4 ou 8 MiB por direção; 6 pings; latência, jitter (variação média absoluta de RTT), perda percentual, histórico CSV validado e comparação preliminar A/B/A+B.
- **Assistente de hotspot virtual:** pré-verificação do adaptador Bond0, rádios Wi-Fi, rotas IPv4, compatibilidade reportada pelo `netsh`, exportação de diagnóstico e atalho para configurações de Mobile Hotspot. **Não ativa o hotspot combinado automaticamente**, ainda em desenvolvimento.
- Separador de diagnóstico: sockets UDP e registos depurados.
- Configuração temporária de perfil apagada após arranque bem-sucedido/erro de inicialização. Persiste risco residual se aplicação falhar abruptamente; solução de produção exige ACL/DPAPI e canal seguro.
- Executável Windows `win-x64` self-contained por GitHub Actions; nenhuma instalação de Rust necessária para o utilizador.

### Como testar

1. **Antes da POC:** fazer cópia de `C:\Bond0\bonding-client.exe` e `bonding-client.toml`.
2. Garantir que o motor Rust corrigido já está presente e funcionando (`allowed_interfaces` e TUN configurado).
3. Fechar a instância CLI existente antes de abrir a interface gráfica.
4. Abrir o executável do artefacto de CI da branch em Windows 11, confirmar permissões de administrador.
5. Selecionar A no painel, ligar o Bond0, abrir laboratório e medir; repetir B e A+B após desligar/ligar pelo próprio desktop. **A mudança automática e sequencial de perfis continua pendente.**
6. Abrir pré-verificação hotspot; conferir relatório. Não ativar ICS/NAT por script nesta revisão.
7. Enviar apenas números e logs depurados; não enviar TOML, chaves, backups nem credenciais.

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
