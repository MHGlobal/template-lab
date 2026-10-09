# ArtCraft Studio: verified upstream binaries, packaged for headless Linux workflows.
# Releases and SHA256 hashes are pinned. Multi-stage build excludes download tools.
FROM ubuntu:24.04 AS fetch
ARG PHOTOCRAFT_VERSION=0.5.0
ARG VECTORCRAFT_VERSION=0.7.0
ARG PHOTOCRAFT_SHA256=f54d863807053bbdfcffa0d624ef7e49d3fd41310c7bb1ede48536f69929d22f
ARG VECTORCRAFT_SHA256=f6928f9adf423ad0a145ebfe3b142a95d3d26f550b05249c2012145701f98b60
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
  test -x vectorcraft/squashfs-root/usr/bin/vectorcraft-cli

FROM ubuntu:24.04
LABEL org.opencontainers.image.title="ArtCraft Studio" \
      org.opencontainers.image.description="PhotoCraft 0.5.0 and VectorCraft 0.7.0 in Linux with CLI and MCP stdio" \
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
RUN ln -s /opt/artcraft/photocraft/usr/bin/photocraft /usr/local/bin/photocraft \
 && ln -s /opt/artcraft/photocraft/usr/bin/photocraft-cli /usr/local/bin/photocraft-cli \
 && ln -s /opt/artcraft/vectorcraft/usr/bin/vectorcraft /usr/local/bin/vectorcraft \
 && ln -s /opt/artcraft/vectorcraft/usr/bin/vectorcraft-cli /usr/local/bin/vectorcraft-cli \
 && useradd --uid 10001 --create-home --shell /usr/sbin/nologin artcraft \
 && mkdir /workspace && chown artcraft:artcraft /workspace
WORKDIR /workspace
USER artcraft
CMD ["vectorcraft-cli", "--help"]
