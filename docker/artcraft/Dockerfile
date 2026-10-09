# ArtCraft Studio: verified upstream binaries, packaged for headless Linux workflows.
# Releases and SHA256 hashes are pinned. Multi-stage build excludes download tools.
FROM ubuntu:24.04 AS fetch
ARG PHOTOCRAFT_VERSION=0.5.0
ARG VECTORCRAFT_VERSION=0.7.0
ARG FILMCRAFT_VERSION=0.4.0
ARG EFFECTCRAFT_VERSION=0.6.0
ARG PHOTOCRAFT_SHA256=f54d863807053bbdfcffa0d624ef7e49d3fd41310c7bb1ede48536f69929d22f
ARG VECTORCRAFT_SHA256=f6928f9adf423ad0a145ebfe3b142a95d3d26f550b05249c2012145701f98b60
ARG FILMCRAFT_SHA256=d8410dea7b2b064ede1ead87dd894bca3537a4dfda1a44297158849f56ba2d4c
ARG EFFECTCRAFT_SHA256=8f352e4efe01b8e576e4808b9631f68a08effdf05d9229c26c6a0561c1fbe0b8
ARG WORDCRAFT_VERSION=0.3.0
ARG WORDCRAFT_SHA256=f25698266107f3d93800069990b6951096c7463690260dc01a87f09839d710ed
ARG GRIDCRAFT_VERSION=0.3.0
ARG GRIDCRAFT_SHA256=ae1c38dd468d464f749e1514ee86afb087c9ff77bd50c47e647cdb18f1532db1
ARG DECKCRAFT_VERSION=0.3.0
ARG DECKCRAFT_SHA256=d42f5e4d320b7e58d6b860f33327b94b7762df801ab0edd7c8773594ac6146a8
ARG PDFCRAFT_VERSION=0.4.0
ARG PDFCRAFT_SHA256=e21ce7de49910acc8f032a4b906141da42b39002383fb9ef33a9d86dbbec05d6
ARG DESIGNCRAFT_VERSION=0.4.0
ARG DESIGNCRAFT_SHA256=bfd27f59e0a7e9b8d40fc64aa60b6fdd91269987623226f759afd4d7cbc64fbe
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /tmp/crafting
RUN set -eux; \
  curl -fL --retry 3 -o photocraft.AppImage "https://github.com/storytold/photocraft/releases/download/v${PHOTOCRAFT_VERSION}/photocraft-${PHOTOCRAFT_VERSION}-linux-x86_64.AppImage"; \
  echo "${PHOTOCRAFT_SHA256}  photocraft.AppImage" | sha256sum -c -; \
  chmod +x photocraft.AppImage; \
  mkdir -p photocraft; \
  (cd photocraft && ../photocraft.AppImage --appimage-extract >/dev/null); \
  curl -fL --retry 3 -o vectorcraft.AppImage "https://github.com/storytold/vectorcraft/releases/download/v${VECTORCRAFT_VERSION}/vectorcraft-${VECTORCRAFT_VERSION}-linux-x86_64.AppImage"; \
  echo "${VECTORCRAFT_SHA256}  vectorcraft.AppImage" | sha256sum -c -; \
  chmod +x vectorcraft.AppImage; \
  mkdir -p vectorcraft; \
  (cd vectorcraft && ../vectorcraft.AppImage --appimage-extract >/dev/null); \
  test -x photocraft/squashfs-root/usr/bin/photocraft-cli; \
  test -x vectorcraft/squashfs-root/usr/bin/vectorcraft-cli; \
  curl -fL --retry 3 -o filmcraft.AppImage "https://github.com/storytold/filmcraft/releases/download/v${FILMCRAFT_VERSION}/filmcraft-${FILMCRAFT_VERSION}-linux-x86_64.AppImage"; \
  echo "${FILMCRAFT_SHA256}  filmcraft.AppImage" | sha256sum -c -; \
  chmod +x filmcraft.AppImage; \
  mkdir -p filmcraft; \
  (cd filmcraft && ../filmcraft.AppImage --appimage-extract >/dev/null); \
  curl -fL --retry 3 -o effectcraft.AppImage "https://github.com/storytold/effectcraft/releases/download/v${EFFECTCRAFT_VERSION}/effectcraft-${EFFECTCRAFT_VERSION}-linux-x86_64.AppImage"; \
  echo "${EFFECTCRAFT_SHA256}  effectcraft.AppImage" | sha256sum -c -; \
  chmod +x effectcraft.AppImage; \
  mkdir -p effectcraft; \
  (cd effectcraft && ../effectcraft.AppImage --appimage-extract >/dev/null); \
  test -x filmcraft/squashfs-root/usr/bin/filmcraft-cli; \
  test -x effectcraft/squashfs-root/usr/bin/effectcraft-cli

RUN set -eux; \
  curl -fL --retry 3 -o wordcraft.AppImage "https://github.com/storytold/wordcraft/releases/download/v${WORDCRAFT_VERSION}/wordcraft-${WORDCRAFT_VERSION}-linux-x86_64.AppImage"; \
  echo "${WORDCRAFT_SHA256}  wordcraft.AppImage" | sha256sum -c -; \
  chmod +x wordcraft.AppImage; \
  mkdir -p wordcraft; \
  (cd wordcraft && ../wordcraft.AppImage --appimage-extract >/dev/null); \
  test -x wordcraft/squashfs-root/usr/bin/wordcraft-cli
RUN set -eux; \
  curl -fL --retry 3 -o gridcraft.AppImage "https://github.com/storytold/gridcraft/releases/download/v${GRIDCRAFT_VERSION}/gridcraft-${GRIDCRAFT_VERSION}-linux-x86_64.AppImage"; \
  echo "${GRIDCRAFT_SHA256}  gridcraft.AppImage" | sha256sum -c -; \
  chmod +x gridcraft.AppImage; \
  mkdir -p gridcraft; \
  (cd gridcraft && ../gridcraft.AppImage --appimage-extract >/dev/null); \
  test -x gridcraft/squashfs-root/usr/bin/gridcraft-cli
RUN set -eux; \
  curl -fL --retry 3 -o deckcraft.AppImage "https://github.com/storytold/deckcraft/releases/download/v${DECKCRAFT_VERSION}/deckcraft-${DECKCRAFT_VERSION}-linux-x86_64.AppImage"; \
  echo "${DECKCRAFT_SHA256}  deckcraft.AppImage" | sha256sum -c -; \
  chmod +x deckcraft.AppImage; \
  mkdir -p deckcraft; \
  (cd deckcraft && ../deckcraft.AppImage --appimage-extract >/dev/null); \
  test -x deckcraft/squashfs-root/usr/bin/deckcraft-cli
RUN set -eux; \
  curl -fL --retry 3 -o pdfcraft.AppImage "https://github.com/storytold/pdfcraft/releases/download/v${PDFCRAFT_VERSION}/pdfcraft-${PDFCRAFT_VERSION}-linux-x86_64.AppImage"; \
  echo "${PDFCRAFT_SHA256}  pdfcraft.AppImage" | sha256sum -c -; \
  chmod +x pdfcraft.AppImage; \
  mkdir -p pdfcraft; \
  (cd pdfcraft && ../pdfcraft.AppImage --appimage-extract >/dev/null); \
  test -x pdfcraft/squashfs-root/usr/bin/pdfcraft-cli
RUN set -eux; \
  curl -fL --retry 3 -o designcraft.AppImage "https://github.com/storytold/designcraft/releases/download/v${DESIGNCRAFT_VERSION}/designcraft-${DESIGNCRAFT_VERSION}-linux-x86_64.AppImage"; \
  echo "${DESIGNCRAFT_SHA256}  designcraft.AppImage" | sha256sum -c -; \
  chmod +x designcraft.AppImage; \
  mkdir -p designcraft; \
  (cd designcraft && ../designcraft.AppImage --appimage-extract >/dev/null); \
  test -x designcraft/squashfs-root/usr/bin/designcraft-cli

FROM ubuntu:24.04
LABEL org.opencontainers.image.title="ArtCraft Studio" \
      org.opencontainers.image.description="PhotoCraft 0.5.0, VectorCraft 0.7.0, FilmCraft 0.4.0, EffectCraft 0.6.0, WordCraft 0.3.0, GridCraft 0.3.0, DeckCraft 0.3.0, PdfCraft 0.4.0, DesignCraft 0.4.0" \
      org.opencontainers.image.source="https://github.com/MHGlobal/template-lab" \
      org.opencontainers.image.licenses="MIT OR Apache-2.0"
ENV DEBIAN_FRONTEND=noninteractive \
    PHOTOCRAFT_NO_DESKTOP_INTEGRATION=1 \
    XDG_CACHE_HOME=/tmp/artcraft-cache \
    XDG_CONFIG_HOME=/tmp/artcraft-config
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates fontconfig fonts-dejavu-core libgcc-s1 libgl1 libegl1 \
  libx11-6 libxext6 libxcb1 libxkbcommon0 libxkbcommon-x11-0 libxcursor1 \
  libxrandr2 libxi6 libxrender1 libfontconfig1 libfreetype6 \
  libvulkan1 libwayland-client0 libgtk-3-0t64 libasound2t64 \
  xvfb xauth \
  && rm -rf /var/lib/apt/lists/*
COPY --from=fetch /tmp/crafting/photocraft/squashfs-root/ /opt/artcraft/photocraft/
COPY --from=fetch /tmp/crafting/vectorcraft/squashfs-root/ /opt/artcraft/vectorcraft/
COPY --from=fetch /tmp/crafting/filmcraft/squashfs-root/ /opt/artcraft/filmcraft/
COPY --from=fetch /tmp/crafting/effectcraft/squashfs-root/ /opt/artcraft/effectcraft/
COPY --from=fetch /tmp/crafting/wordcraft/squashfs-root/ /opt/artcraft/wordcraft/
COPY --from=fetch /tmp/crafting/gridcraft/squashfs-root/ /opt/artcraft/gridcraft/
COPY --from=fetch /tmp/crafting/deckcraft/squashfs-root/ /opt/artcraft/deckcraft/
COPY --from=fetch /tmp/crafting/pdfcraft/squashfs-root/ /opt/artcraft/pdfcraft/
COPY --from=fetch /tmp/crafting/designcraft/squashfs-root/ /opt/artcraft/designcraft/
RUN ln -s /opt/artcraft/photocraft/usr/bin/photocraft /usr/local/bin/photocraft \
 && ln -s /opt/artcraft/photocraft/usr/bin/photocraft-cli /usr/local/bin/photocraft-cli \
 && ln -s /opt/artcraft/vectorcraft/usr/bin/vectorcraft /usr/local/bin/vectorcraft \
 && ln -s /opt/artcraft/vectorcraft/usr/bin/vectorcraft-cli /usr/local/bin/vectorcraft-cli \
 && ln -s /opt/artcraft/filmcraft/usr/bin/filmcraft /usr/local/bin/filmcraft \
 && ln -s /opt/artcraft/filmcraft/usr/bin/filmcraft-cli /usr/local/bin/filmcraft-cli \
 && ln -s /opt/artcraft/effectcraft/usr/bin/effectcraft /usr/local/bin/effectcraft \
 && ln -s /opt/artcraft/effectcraft/usr/bin/effectcraft-cli /usr/local/bin/effectcraft-cli \
 && ln -s /opt/artcraft/wordcraft/usr/bin/wordcraft-cli /usr/local/bin/wordcraft-cli \
 && ln -s /opt/artcraft/gridcraft/usr/bin/gridcraft-cli /usr/local/bin/gridcraft-cli \
 && ln -s /opt/artcraft/deckcraft/usr/bin/deckcraft-cli /usr/local/bin/deckcraft-cli \
 && ln -s /opt/artcraft/pdfcraft/usr/bin/pdfcraft-cli /usr/local/bin/pdfcraft-cli \
 && ln -s /opt/artcraft/designcraft/usr/bin/designcraft-cli /usr/local/bin/designcraft-cli \
 && useradd --uid 10001 --create-home --shell /usr/sbin/nologin artcraft \
 && mkdir /workspace && chown artcraft:artcraft /workspace
WORKDIR /workspace
USER artcraft
CMD ["vectorcraft-cli", "--help"]
