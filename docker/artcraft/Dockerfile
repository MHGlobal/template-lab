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

FROM ubuntu:24.04
LABEL org.opencontainers.image.title="ArtCraft Studio" \
      org.opencontainers.image.description="PhotoCraft 0.5.0, VectorCraft 0.7.0, FilmCraft 0.4.0, EffectCraft 0.6.0" \
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
RUN ln -s /opt/artcraft/photocraft/usr/bin/photocraft /usr/local/bin/photocraft \
 && ln -s /opt/artcraft/photocraft/usr/bin/photocraft-cli /usr/local/bin/photocraft-cli \
 && ln -s /opt/artcraft/vectorcraft/usr/bin/vectorcraft /usr/local/bin/vectorcraft \
 && ln -s /opt/artcraft/vectorcraft/usr/bin/vectorcraft-cli /usr/local/bin/vectorcraft-cli \
 && ln -s /opt/artcraft/filmcraft/usr/bin/filmcraft /usr/local/bin/filmcraft \
 && ln -s /opt/artcraft/filmcraft/usr/bin/filmcraft-cli /usr/local/bin/filmcraft-cli \
 && ln -s /opt/artcraft/effectcraft/usr/bin/effectcraft /usr/local/bin/effectcraft \
 && ln -s /opt/artcraft/effectcraft/usr/bin/effectcraft-cli /usr/local/bin/effectcraft-cli \
 && useradd --uid 10001 --create-home --shell /usr/sbin/nologin artcraft \
 && mkdir /workspace && chown artcraft:artcraft /workspace
WORKDIR /workspace
USER artcraft
CMD ["vectorcraft-cli", "--help"]
