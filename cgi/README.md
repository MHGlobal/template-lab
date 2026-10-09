# 13GS CGI Render Studio

A GitHub Actions render farm for the 13 Graus Sul brand, based exclusively on non-generative **Blender Cycles + Python + FFmpeg**.

To run: GitHub > Actions > 13GS CGI Render Studio > Run workflow, choose editor branch, preview/final profile, duration and FPS.

- Smoke push: 360x640, 1 second, 8 samples.
- Preview: 540x960, 16 samples.
- Final: 1080x1920, 48 samples.

Four stages: source/privacy gate, scene creation, 3 parallel Cycles CPU frame jobs, MP4 assembly and rigorous output checks.

Download artifact 13gs-cgi-final-N, with video, poster PNG and JSON render manifest.

**Limitations:** The 3D T-shirt is original *demo geometry*; imprint '13°S / INSPIRED BY PEMBA / DEMO ONLY' is not the approved logo. Motion uses deterministic shape-key deformation, not sewn cloth simulation. No paid or generative video tools are used. Soundtrack not included. Full-resolution CPU rendering may take a long time. The repository is PUBLIC; do not commit licensed, private or official creative assets here. Use a private production repository for real branding materials.
