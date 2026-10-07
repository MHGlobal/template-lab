# Bond0 Control Center — laboratório

**Branch:** `lab/bond0-control-center` (separada de `editor`).
**Ambiente:** Projecto Bond0 Windows ↔ Oracle `mcpe-net` / Netlify.
**IA no produto:** nenhuma.

## Pastas
- [Plano completo](./PLAN.md): M0–M7, segurança, vários Wi-Fi, opções de partilha e testes.
- [Desktop .NET 8](./desktop/): POC WinForms, perfis A/B/A+B e múltiplos adaptadores; compilação win-x64 self-contained em GitHub Actions. Utiliza motor Rust existente em C:\Bond0.
- [Servidor na VPS](./server/): API HTTP só de leitura e só em loopback; **não** é endpoint público nem substitui o servidor UDP.
- [Site Netlify](./web/): dashboard responsivo de pré-visualização, ainda sem autenticação/API remota.

## GitHub Actions
Workflow: [Bond0 Lab](../../.github/workflows/bond0-lab.yml) — jobs Windows, Python, Node e gate de qualidade.
Compila `Bond0-ControlCenter.exe` sem exigir Rust ou .NET instalado no PC (self-contained, se os testes passarem).
Nunca carregar `bonding-client.toml`, `bonding-server.toml`, chaves/credenciais ou backups nos artefactos públicos.

## Segurança
Não activar hotspot, WinNAT, ICS, rotas default, firewall pública ou comandos administrativos pela interface web na POC.
O serviço de dados Rust continua funcional sem painel desktop, gestão ou Netlify.
Não é permitida exposição do manager directamente à Internet sem autenticação forte, TLS e autorização.

## Netlify
Projeto criado na conta: `bond0-control-center-preview`; requer associar a branch ao repo e fazer deploy.
- Repo Git: `MHGlobal/template-lab`
- Branch: `lab/bond0-control-center`
- Base directory: `bond0/web`
- Build command: vazio (website estático)
- Publish directory: `.`
- O ficheiro `netlify.toml` adiciona cabeçalhos de segurança e CSP.
A homepage indica claramente **Pré-visualização**. Não apresenta telemetria fictícia nem comunica com VPS enquanto não existir API autenticada.

## Estado
MVP estrutural entregue para validação, sem se declarar pronto para produção.
