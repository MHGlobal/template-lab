# Teste de voz PT-BR: Chatterbox Multilingual V3 × Gemini 3.8 Flash TTS

Workflow: [Ponto Animado - Comparar Chatterbox vs Gemini TTS](https://github.com/MHGlobal/template-lab/actions/workflows/ponto-animado-chatterbox-gemini.yml)

## Comparação

A mesma narração e o mesmo texto de suspense são produzidos pelos dois motores.
O Gemini também produz um recado de telefone natural e uma cópia com EQ telefónico
(300–3400 Hz), sem alterar a frequência/pitch da voz.

- **Chatterbox**: gratuito, modelo público `ResembleAI/chatterbox`,
  `ChatterboxMultilingualTTS.from_pretrained(device="cpu", t3_model="v3")`,
  `language_id="pt"`; frases curtas para limitar a duração na CPU.
  O idioma `pt` não fixa sotaque PT-BR: ouvir para confirmar.
  Componente emocional `exaggeration` e `cfg_weight`, sem capacidade garantida
  de gerar sussurro físico verdadeiro.
- **Gemini**: `gemini-3.8-flash-tts`, com vozes Charon/Enceladus/Algieba,
  instruções de atuação e a tag `[whispers]` para a cena de suspense.
  A qualidade final deve ser avaliada pelo ouvido; sussurro não é garantido.
  Disponibilidade gratuita depende do plano, região, limites e faturação da conta.

## Instruções

1. Abre [Google AI Studio / API Keys](https://aistudio.google.com/api-keys).
2. Se decidires testar via API, cria uma chave no projeto que pretendias usar.
3. Em [Segredos do template-lab](https://github.com/MHGlobal/template-lab/settings/secrets/actions),
   adiciona o secret **GEMINI_API_KEY**. Não publiques nem envies a chave no chat.
4. Reexecuta o workflow, no menu **Run workflow**, escolhendo **both**.
5. Abre a página da execução e descarrega os artefactos do Chatterbox e do Gemini.
6. Ouve a mesma frase nos dois MP3, comparando naturalidade, sotaque, pausas,
   inteligibilidade, sussurro e ausência de voz monstruosa.

A criação do workflow aciona uma primeira execução automaticamente. Se a chave
Gemini não existir, o respetivo job falha explicitamente. O Chatterbox continua
independentemente: um erro do Gemini não cancela o trabalho do Chatterbox.

**As vozes são sintéticas e devem ser identificadas como tal nas publicações.**

## Referências

- https://github.com/resemble-ai/chatterbox
- https://ai.google.dev/gemini-api/docs/speech-generation
- https://ai.google.dev/gemini-api/docs/pricing
