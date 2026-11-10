# Ponto Animado Studio — produção 2D por agentes
Este workflow complementa a MCPNet rs-vm (Linux, 1 GB RAM). A VM controla OpenCode, assets e vozes; o GitHub Actions renderiza versões mais pesadas.

## Implementação 2026-11-10
- Primeira renderização de 30 segundos concluída na própria VM.
- Estilo visual: apenas duas personagens oficiais, fornecidas pelo criador.
- Animação: Cutout 2D por código Python/Pillow e FFmpeg. Sem geração de vídeo por IA.
- Áudio: duas vozes TTS em português, sujeitas a avaliação das condições de utilização comercial; efeitos musicais originais.
- Este ramo não contém sprites nem ficheiros de voz. Não divulgar assets num repositório público sem aprovação.
- GitHub Actions requer URL segura de ZIP contendo a árvore de assets, scripts e áudios, com SHA256.

## Executar na VM
cd /var/lib/sentinelx/ponto-animado && python3 scripts/render_episode.py

## Publicação
TikTok ainda não está ligado via Composio. A publicação não é iniciada automaticamente.