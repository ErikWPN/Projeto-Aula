# Primeiro Commit: site e sistema de reservas da mentoria

Data: 2026-10-20. Status: aprovado por delegação. O dono pediu para não parar com perguntas e deixou a stack a cargo do builder. As decisões marcadas como **(decisão do builder)** podem ser revistas.

## Intenção

A mentoria "Primeiro Commit" ensina TI básica e lógica de programação, do zero e ao vivo, para calouros de TI e para quem está migrando de área. O site existe para uma coisa: transformar quem chega por indicação, faculdade ou redes sociais em uma reserva paga, com o mínimo de atrito e sem passar insegurança. Também precisa ser fácil para o mentor operar sozinho.

A versão anterior era um HTML estático no GitHub Pages. Ela gerava o Pix, mas tinha três limites que o próprio README admitia:

1. As vagas eram contadas à mão no `config.js`.
2. O pagamento era conferido à mão, sem histórico.
3. Não havia onde o aluno consultasse a reserva depois.

Esta versão resolve os três.

## Objetivos

- Página pública com chamada, ementa, mentor, turmas, agendamento em 3 passos e FAQ.
- Reserva real no servidor: o código é único, a vaga fica segura por um prazo (24 h por padrão) e as vagas restantes são calculadas a partir das reservas.
- Pix estático (BR Code, CRC16-CCITT) gerado no servidor, com o código da reserva como txid, mais QR code e copia e cola.
- Página da reserva (`/reserva/:codigo`) que o aluno pode reabrir para ver o status e pagar de novo.
- Painel do mentor (`/admin`), protegido por senha: lista e filtra reservas, confirma pagamento, cancela, exporta CSV e cria ou edita turmas.
- Atalho para o WhatsApp com mensagem pronta (código, turma, nome, valor).
- Modo demonstração enquanto a chave Pix contiver "exemplo": aviso na página e selo "não pague" sobre o QR.
- Tema claro e escuro, responsivo até 360 px, acessível (labels, foco visível, contraste AA, `prefers-reduced-motion`).

## Fora do escopo

- Confirmação automática de pagamento, que exigiria PSP ou API Pix com certificado. O campo `link-cartao` continua aceitando um checkout externo.
- Contas de aluno e login de aluno: o código da reserva é a "senha" da página de status.
- Envio de e-mail.

## Anti-objetivos (falharia mesmo funcionando)

- Parecer template de SaaS ou de "curso de programação genérico".
- Exigir que o mentor edite código para mudar preço, vagas ou datas.
- O aluno perder o que digitou ao voltar de passo ou recarregar.

## Arquitetura (decisão do builder)

- **Backend:** Spring Boot 4.1 com Java 21 e Maven. Usa Spring MVC, Data JPA, Validation, Security (Basic só em `/api/admin/**`), Flyway, H2 em arquivo por padrão e PostgreSQL por perfil. Os textos do site ficam em `application.yml` (`mentoria.*`), as turmas no banco (seed inicial via migration).
- **Frontend:** React 19, Vite e TypeScript, com react-router. Sem kit de UI: CSS próprio com tokens. QR gerado no navegador (`qrcode`).
- **Entrega:** um único jar. O build do Vite vai para `static/` do Spring, com fallback de SPA. Dockerfile multi-stage e docker-compose com Postgres.
- **Concorrência de vagas:** lock pessimista na turma ao criar a reserva. Vagas livres = `vagas - (pendentes não expiradas + pagas)`. Um job a cada 5 min marca as pendentes vencidas como `EXPIRADA`.
- **Limite de abuso:** no máximo 5 reservas por IP a cada 10 min, em memória.

### API

| Método | Rota | Uso |
| --- | --- | --- |
| GET | `/api/site` | conteúdo, turmas com vagas livres e situação, flag demo |
| POST | `/api/reservas` | cria reserva (400 com erros por campo, 409 se sem vaga) |
| GET | `/api/reservas/{codigo}` | status e dados de pagamento |
| GET | `/api/admin/resumo` | contagens e receita confirmada |
| GET | `/api/admin/reservas?status=&turma=&q=` | lista |
| POST | `/api/admin/reservas/{codigo}/confirmar` · `/cancelar` | muda status |
| GET | `/api/admin/reservas.csv` | exporta |
| GET/POST/PUT | `/api/admin/turmas` | gestão de turmas |

## UX

- Fluxo principal: hero, depois "Ver turmas", turma, dados, pagamento. O botão Agendar fica fixo no topo.
- O hero tem um fluxograma interativo com a pergunta "Você já programou?". A resposta destaca o caminho no fluxograma e pré-preenche o campo "nível" do formulário. É o momento memorável e também uma demonstração da própria matéria.
- **Passo 1:** cartões de turma como radio group. Encerrada e esgotada ficam desabilitadas e dizem o motivo. "Restam 3 vagas" aparece quando a turma tem 3 ou menos.
- **Passo 2:** validação ao sair do campo e no envio, máscara de WhatsApp e mensagens que dizem como corrigir. O rascunho fica salvo no `localStorage`.
- **Passo 3:** resumo, QR, copia e cola com feedback, prazo ("vaga segura até 22/10 às 14h"), WhatsApp e link permanente da reserva.
- Erros do servidor viram mensagens no campo (400) ou no passo 1 com recarga das turmas (409, "alguém pegou a última vaga").
- Admin: denso e quieto, com tabela filtrável, ações por linha e confirmação antes de cancelar.

## Design visual (skill frontend-design)

### Primeira passada e revisão

O primeiro rascunho saiu como "terminal escuro com verde", que é um padrão genérico. A versão estática anterior usava caneta azul em papel quadriculado, com rótulos monoespaçados em CAIXA ALTA e textos separados por pontos médios, todos padrões de template. **Revisão:** o vocabulário visual vem da primeira aula de lógica, o fluxograma desenhado com régua de gabarito na lousa. Cada forma do fluxograma tem um significado e por isso estrutura a interface:

- oval: início e fim
- paralelogramo: entrada de dados (formulário)
- retângulo: processamento (pagamento)
- losango: decisão (hero)

### Tokens

Tema claro, papel de caderno:

| Nome | Hex | Uso |
| --- | --- | --- |
| papel | `#EEF3EE` | fundo |
| giz | `#FFFFFF` | superfícies |
| grafite | `#1E2A26` | texto |
| lousa | `#1D5C4A` | ação primária e links |
| post-it | `#F4B63F` | destaque, decisão e seleção |
| linha | `#C9D6CD` | bordas |
| erro | `#B5303C` | erros |

Tema escuro: a página vira a lousa. O fundo é `#17322B`, as superfícies `#1F3E35`, o texto (giz) `#EAF2EC` e a ação primária troca para o âmbar `#F4C25B`, como giz amarelo.

**Tipografia:** uma família só, a Recursive, com eixos variáveis. Títulos usam `CASL 1`, peso 800, um traço casual de quem escreve na lousa. O corpo usa `CASL 0` com peso 400/600. Código usa `MONO 1`. Os rótulos ficam em caixa normal, nunca em caixa alta.

**Layout:**
- Coluna única alinhada à esquerda, com medida de até cerca de 68 caracteres. O hero divide em texto e fluxograma, empilhados no celular.
- O raio das bordas segue a hierarquia (pílula só em botões, formas do fluxograma onde houver passo) e não é aplicado igual em tudo.
- Sombras são duras e curtas (offset de 3 px, sem blur), como recorte de papel.

**Movimento:** um único momento orquestrado, o traçado do fluxograma desenhado no carregamento. O resto só responde a ações (seleção, cópia, troca de passo). Tudo é desligado com `prefers-reduced-motion`.

**Texto:** voz ativa e frases curtas. Botões dizem o que fazem ("Gerar Pix", "Copiar código") sem setas, e o toast repete o verbo ("Código copiado").

## Deixado para o builder

Nomes de classes, divisão em componentes, intervalo do job e detalhes de paginação do admin.
