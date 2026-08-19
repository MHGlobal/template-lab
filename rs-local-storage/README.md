# RS Local Storage v3

Servidor local Android para hotspot com dois perfis:

- **Admin**: acesso ao armazenamento partilhado completo, download e upload.
- **Cliente**: acesso apenas a `/RS Media/Filmes` e `/RS Media/Series` numa interface de streaming.
- Até **5 contas de cliente** e até **5 streams simultâneos**.
- Streaming HTTP com Range Requests para seek/avanço.
- Thumbnails automáticos de vídeo.
- Apenas IPv4 privado/local; sem publicação na Internet.

Estrutura recomendada:

```
/RS Media/
  Filmes/
    Filme.mp4
  Series/
    Nome da Serie/
      Temporada 01/
        Episodio 01.mp4
```

Para máxima compatibilidade no navegador, prefira MP4 (H.264/AAC) ou WebM.
