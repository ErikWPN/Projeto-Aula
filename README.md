# Primeiro Commit: site e reservas da mentoria

Site da mentoria de TI básica e lógica de programação. Mostra as turmas, faz a reserva, gera o Pix com o valor e o código da reserva e oferece um painel para o mentor conferir pagamentos e cuidar das turmas.

- **Backend:** Java 21 e Spring Boot 4.1 (API, banco, Pix, painel protegido por senha).
- **Frontend:** React 19, Vite e TypeScript (página pública, página da reserva, painel).
- **Entrega:** um único `.jar` com tudo dentro, ou uma imagem Docker com PostgreSQL.

## O que o site faz

**Para o aluno**

1. Escolhe a turma. Turmas encerradas ou esgotadas aparecem desabilitadas e dizem o motivo.
2. Preenche nome, e-mail, WhatsApp, nível e como conheceu a mentoria. A validação explica como corrigir cada campo, e o que foi digitado fica salvo se a página recarregar.
3. Recebe o Pix: QR code, "copia e cola", resumo e um botão que abre o WhatsApp com a mensagem pronta (código, turma, nome e valor).
4. Acompanha a reserva em `/reserva/CODIGO`. A página mostra se o pagamento está pendente, se a vaga foi confirmada ou se a reserva venceu.

**Para o mentor** (em `/admin`)

- Números do dia: reservas aguardando Pix, pagas, receita, vagas livres.
- Lista de reservas com busca e filtros. Um botão confirma o pagamento e já oferece a mensagem de confirmação para o aluno no WhatsApp.
- Cancelamento com confirmação.
- Exportação para planilha (CSV que abre no Excel e no Google Sheets).
- Criação e edição de turmas: datas, horário, vagas, preço, selo e se a turma aparece no site.

**Regras de vaga**

- Uma reserva segura a vaga por 24 horas (configurável). Se o pagamento não for confirmado nesse prazo, a vaga volta para a turma.
- Duas pessoas não conseguem pegar a mesma última vaga, porque o servidor trava a turma no momento da reserva.
- As inscrições fecham no dia do primeiro encontro.

**Modo demonstração.** Enquanto a chave Pix tiver a palavra `exemplo`, o site avisa que é demonstração e põe o selo "não pague" sobre o QR code.

## Rodar no seu computador

Pré-requisitos: Java 21, Maven 3.9 e Node 20 ou mais novo.

```bash
./build.sh                                   # testa e gera backend/target/mentoria-1.0.0.jar
ADMIN_SENHA=uma-senha java -jar backend/target/mentoria-1.0.0.jar
```

Abra http://localhost:8080. O painel fica em http://localhost:8080/admin (usuário `admin`).

Sem `ADMIN_SENHA`, o servidor cria uma senha provisória e a mostra no log ao iniciar. Sem `DATABASE_URL`, os dados ficam num banco H2 na pasta `data/`.

### Desenvolvimento com recarga automática

Em dois terminais:

```bash
cd backend && ADMIN_SENHA=dev mvn spring-boot:run   # API em :8080
cd frontend && npm install && npm run dev          # site em :5173, com /api apontando para :8080
```

## Configurar

**Dados sensíveis e de contato** ficam em variáveis de ambiente. Copie `.env.example` para `.env` e preencha:

| Variável | Para que serve |
| --- | --- |
| `ADMIN_SENHA` | senha do painel `/admin` (usuário `admin`, ou `ADMIN_USUARIO`) |
| `PIX_CHAVE`, `PIX_NOME`, `PIX_CIDADE` | conta que recebe. O nome vai como aparece no banco (até 25 letras) e a cidade até 15 letras |
| `MENTORIA_WHATSAPP` | número que recebe os comprovantes: 55 + DDD + número, só dígitos |
| `MENTORIA_LINK_CARTAO` | opcional: link de pagamento com cartão (Mercado Pago, InfinitePay…) |
| `DATABASE_URL` | banco PostgreSQL em produção. Aceita a connection string do Neon, Render ou Supabase (`postgresql://usuario:senha@host/banco`) ou o formato JDBC com `DATABASE_USER` e `DATABASE_PASSWORD` |
| `PORT` | porta HTTP (padrão 8080) |
| `FORWARD_HEADERS` | `framework` quando o site roda atrás de um proxy (Render, Railway, Nginx); `none` quando exposto direto |

**Textos do site** (título, chamada, mentor, ementa, perguntas frequentes, opções de nível e de origem) ficam em `backend/src/main/resources/application.yml`, na seção `mentoria:`. Antes de divulgar, troque `cargo` do mentor, que ainda está como `[Cargo do Anderson], [anos] anos em TI`. Para usar foto, coloque a imagem em `frontend/public/` (ex.: `anderson.jpg`) e escreva `foto: /anderson.jpg`.

**Turmas, vagas e preços** são editados no painel, sem mexer em código. As três turmas iniciais vêm de `backend/src/main/resources/db/migration/V2__turmas_iniciais.sql`.

**Teste o Pix antes de divulgar:** crie uma turma de teste com preço R$ 1,00, faça uma reserva e pague pelo app do banco. Confira se o nome do recebedor aparece certo.

## Publicar

O site precisa de um servidor Java. Por isso o GitHub Pages, que só hospeda páginas estáticas, não serve mais.

### De graça: Render + Neon

O **Render** roda o site e o **Neon** guarda o banco. Os dois têm plano gratuito e entram com a conta do GitHub. O banco fica no Neon porque o disco do servidor gratuito do Render é apagado a cada reinício.

**1. Crie o banco no Neon**

1. Entre em [neon.tech](https://neon.tech) com o GitHub e crie um projeto com nome `mentoria` e região **AWS US East 2 (Ohio)**. O Render não tem servidor no Brasil e o site fica em Ohio (`render.yaml`). Com site e banco na mesma região, as consultas ficam rápidas. Deixe os opcionais (Realtime, Better Auth) desligados.
2. Em **Connect**, copie a *connection string*. Ela começa com `postgresql://` e já tem usuário e senha.

**2. Crie o site no Render**

1. Entre em [render.com](https://render.com) com o GitHub e autorize o acesso ao repositório `Projeto-Aula`.
2. Clique em **New → Blueprint** e escolha o repositório. O Render lê o `render.yaml` e monta tudo no plano gratuito.
3. Preencha as variáveis que ele pede:
   - `DATABASE_URL`: a connection string do Neon.
   - `PIX_CHAVE`, `PIX_NOME`: sua chave Pix e o nome como aparece no banco. Para testar antes, use `chave-pix@exemplo.com`, que mantém o modo demonstração.
   - `MENTORIA_WHATSAPP`: 55 + DDD + número, só dígitos.
4. Clique em **Apply**. O primeiro build leva alguns minutos. Depois o site fica em `https://primeiro-commit.onrender.com` (ou um nome parecido, se esse já existir).
5. A senha do painel foi gerada pelo Render. Ela aparece em **Environment → ADMIN_SENHA**, e o usuário é `admin`.

A cada merge na `main`, o Render publica a versão nova sozinho.

**Limites do plano gratuito**

- O site "dorme" depois de cerca de 15 minutos sem visitas. A próxima visita espera em torno de um minuto para ele acordar. Para não deixar um aluno esperando no meio da divulgação, abra o site um pouco antes de postar o link.
- Os planos e limites mudam com o tempo. Confira as páginas de preço do Render e do Neon antes de depender deles.

### Docker (VPS ou outras plataformas)

```bash
cp .env.example .env    # preencha
docker compose up -d --build
```

Isso sobe o site na porta 8080 e um PostgreSQL com os dados num volume. Em plataformas que constroem a partir do `Dockerfile` (Render, Railway, Fly.io), aponte para este repositório, crie um PostgreSQL na própria plataforma e configure as variáveis da tabela acima.

### Só o jar

Qualquer máquina com Java 21: `java -jar mentoria-1.0.0.jar`, com as variáveis de ambiente definidas. Coloque um proxy com HTTPS na frente (Caddy, Nginx ou o da plataforma) e defina `FORWARD_HEADERS=framework`, para o app enxergar o IP real de cada visitante.

## Testes

```bash
cd backend && mvn test            # 25 testes: Pix (inclui o exemplo do manual do Banco Central), reservas, vagas, expiração, painel
cd frontend && npm test           # máscaras, validação, datas e mensagem do WhatsApp
./e2e/rodar.sh                    # ponta a ponta no navegador: fluxo do aluno, painel, temas, 360 px a 1280 px
```

No GitHub, o workflow `.github/workflows/ci.yml` roda tudo isso a cada pull request.

O teste ponta a ponta usa Playwright em Python (`pip install playwright`) e o helper da skill `webapp-testing` para subir o servidor. Ele salva screenshots em `e2e/screenshots/`. Para rodar contra PostgreSQL, passe `DATABASE_URL`, `DATABASE_USER` e `DATABASE_PASSWORD` antes do comando.

## Estrutura

```
backend/    Spring Boot: api/ (controllers e respostas), reserva/ (regras, expiração),
            turma/, pix/ (BR Code e CRC16), config/ (segurança, conteúdo)
frontend/   React: pages/ (Início, Reserva, Admin), components/ (Agendamento, Fluxograma,
            PixPainel), lib/ (API, formatação), styles/ (tokens e telas)
e2e/        teste ponta a ponta e revisão visual
docs/       especificação de design
.claude/    skills do projeto (webapp-testing, brainstorming, frontend-design)
```

## Segurança

- Só `/api/admin/**` exige login (HTTP Basic, enviado pelo app a cada chamada, sem cookie de sessão).
- No máximo 10 reservas por IP a cada 10 minutos, contra robôs (com folga para uma turma reservando do mesmo Wi-Fi).
- Cabeçalhos de segurança, incluindo Content Security Policy sem scripts de terceiros. A fonte é servida pelo próprio site.
- O CSV exportado protege contra fórmulas maliciosas em planilhas.

## Limites

- **O pagamento é conferido à mão.** O Pix estático não avisa o site quando é pago. O comprovante chega pelo WhatsApp e o mentor confirma no painel. Para confirmação automática seria preciso um provedor com API e webhook (Mercado Pago, Asaas, Efí).
- **E-mail.** O site não envia e-mail. Os avisos ao aluno saem pelo WhatsApp, com mensagens prontas.
