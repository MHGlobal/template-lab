# Editja - Template Lab

Este projeto é o núcleo do editor visual da plataforma **Editja**. Ele foi implementado seguindo as especificações de funcionalidades, UX e validações detalhadas no documento `editor informacao.md`.

## 🚀 Tecnologias
- **Framework:** Next.js 14 (App Router)
- **Editor Canvas:** Fabric.js 6
- **Estilização:** Tailwind CSS
- **Ícones:** Lucide React
- **Validação:** Zod + Custom Validator Logic

## 🛠️ Funcionalidades Implementadas
- **Desenho Vetorial:** Criação de formas (retângulos, círculos) e modo de desenho livre.
- **Manipulação de Objetos:** Redimensionamento, rotação, arraste e exclusão.
- **Gestão de Camadas:** Trazer para frente e enviar para o fundo.
- **Edição de Texto:** Inserção de caixas de texto editáveis.
- **Mídia:** Upload de imagens locais para o canvas.
- **Histórico (Undo/Redo):** Sistema completo de desfazer e refazer ações.
- **Exportação:** Exportação nativa para PNG e exportação do estado do projeto em JSON.
- **Validação por Categoria:** Sistema de regras que verifica zonas de segurança (Instagram), DPI para impressão e legibilidade.

## 📁 Estrutura do Projeto
- `src/hooks/useEditor.ts`: Hook principal que encapsula toda a lógica do Fabric.js.
- `src/components/editor/Editor.tsx`: Interface do usuário do editor com barras de ferramentas.
- `src/lib/validators/templateValidator.ts`: Lógica de validação de templates por categoria.

## 📝 Como usar
1. Mova esta pasta para o seu diretório de desenvolvimento preferido (ex: `C:\1-IA\template-lab`).
2. Execute `npm install` para instalar as dependências.
3. Execute `npm run dev` para iniciar o servidor de desenvolvimento.
4. Acesse `http://localhost:3000` para ver o editor em ação.

---
Implementado com foco em **Impeccable Design** e **Performance Optimization**.
