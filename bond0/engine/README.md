Bond0 — CLIENTE RUST DE REORDENACAO v0.1.7-reorder-qa1
=======================================================

ESTADO: PRE-VISUALIZACAO TECNICA, NAO INSTALAR AUTOMATICAMENTE.

O arquivo bonding-client.exe foi compilado por GitHub Actions (Windows x64)
a partir do codigo publico Donovoi/Bonding no commit fixo:
d2587a46e097c4408144d6dc48d7cd096f83d00a

Patch auditavel:
bond0/engine/patches/0001-windows-client-reorder-timer.patch

MELHORIAS
- Timer de 25 ms no cliente para verificar o buffer mesmo sem novos datagramas.
- Skips apos 500 ms continuam permitidos; entregas estagnadas sao retomadas.
- Contadores de delivered, timer_delivered, gap_skipped, late_or_replay,
  duplicate, full, pending, next_seq, tun_queue_dropped.
- Preserva o filtro de interfaces, configuracao Wintun e protocolo anteriores.

IMPORTANTE
- NAO sao correcoes do servidor Oracle; nao reiniciar o bond0-server.
- NAO incluir em GitHub Actions a configuracao TOML ou chave de encriptacao.
- Nenhum ganho de velocidade ou reducao de perdas e afirmado antes dos
  testes no Windows real A/B/A+B.
- O desktop existente usa C:\Bond0\bonding-client.exe.

PLANO DE TESTE MANUAL APOS APROVACAO DE CI E BACKUP:
1. Guardar copia do executavel atual, do TOML e um registro da versao.
2. Fechar Bond0 pelo menu da bandeja (confirmar PID terminado).
3. Substituir APENAS o bonding-client.exe em C:\Bond0\ pelo novo binario.
   Manter o TOML e wintun.dll originais, NUNCA sobrescrever configuracoes.
4. Abrir desktop Bond0 e validar "Reorder diagnostics" nos logs.
5. Repetir ping -n 20 -w 1200 198.18.0.1 em tres sessoes,
   e teste privado de 4 MiB antes de testar upload.
6. Se houver piora, parar o motor via GUI e restaurar imediatamente o
   executavel anterior; nunca desativar adaptadores fisicos, alterar
   rotas default ou mexer no Firewall nesta etapa.

LIMITACOES
- Este artefacto e um MOTOR Rust; nao substitui a GUI Bond0 Control Center.
- Verificar que o driver Wintun e a configuracao existentes estao disponiveis.
- Compilacao e testes automatizados nao validam a rede fisica do computador.
