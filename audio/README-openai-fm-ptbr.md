# Ponto Animado — vozes naturais OpenAI.fm (PT-BR)

Este workflow usa a **OpenAI Speech API** com o mesmo modelo demonstrado em https://www.openai.fm/: \`gpt-4o-mini-tts\`. Não tenta extrair áudio do site de demonstração.

## O que será gerado

- **Narrador:** Marin, Cedar e Coral — narração de mistério natural, expressiva e sem tom de anúncio.
- **Sussurro:** Cedar e Ash — instruções de sussurro soprado e humano, sem monstro ou alteração de pitch.
- **Mensagem de telefone:** Nova e Onyx — voz de mensagem de telemóvel natural; cada uma com versão filtrada a 300–3400 Hz, sem voz demoníaca.
- **00_comparativo.mp3:** junção sequencial das versões para ouvir e comparar.
- **manifest.json:** todos os textos, vozes, parâmetros e durações.

## Usar com GitHub Actions

1. Em \`MHGlobal/template-lab\`, branch \`editor\`, abrir **Settings → Secrets and variables → Actions**.
2. Adicionar o repository secret **OPENAI_API_KEY** (chave da OpenAI API, não credenciais do ChatGPT). Nunca enviar a chave por chat nem comitá-la.
3. Abrir **Actions → Ponto Animado - Vozes OpenAI.fm (PT-BR) → Run workflow**. Escolher \`all\` ou apenas \`narrator\`, \`whisper\`, \`phone\`.
4. Descarregar o artefacto **ponto-animado-openai-fm-vozes-ptbr-N** na página da execução.

A primeira tentativa é iniciada também quando o workflow é criado na branch \`editor\`. **Sem OPENAI_API_KEY o Action falha de forma segura** — não finge ter produzido áudio. O uso da API tem faturação/créditos separados do ChatGPT Plus.

Nota técnica: conforme a documentação atual da OpenAI, o modelo \`gpt-4o-mini-tts\` será desativado em **2027-01-06**. Para produção contínua, será necessário migrar o backend antes dessa data. As vozes geradas devem ser identificadas ao público como vozes de IA.

Documentação: https://developers.openai.com/api/docs/guides/text-to-speech
