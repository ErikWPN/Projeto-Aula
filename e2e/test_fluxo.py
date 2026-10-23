"""
Teste ponta a ponta do site e do painel, com o servidor rodando (veja e2e/rodar.sh).

Uso: BASE_URL=http://localhost:8090 ADMIN_SENHA=teste python3 e2e/test_fluxo.py
Screenshots vão para SHOTS (padrão: e2e/screenshots).
"""

import os
import re
import sys

from playwright.sync_api import Page, expect, sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8090")
SENHA = os.environ.get("ADMIN_SENHA", "teste")
SHOTS = os.environ.get("SHOTS", os.path.join(os.path.dirname(__file__), "screenshots"))
CHROMIUM = os.environ.get("CHROMIUM_PATH", "/opt/pw-browsers/chromium")
os.makedirs(SHOTS, exist_ok=True)

resultados: list[tuple[str, bool, str]] = []


def caso(nome):
    def decorador(fn):
        def rodar(*args):
            try:
                fn(*args)
                resultados.append((nome, True, ""))
                print(f"  ok    {nome}")
            except Exception as e:  # noqa: BLE001 - relatório de teste
                resultados.append((nome, False, str(e).splitlines()[0][:300]))
                print(f"  FALHA {nome}: {str(e).splitlines()[0][:300]}")
                pg = next((a for a in args if isinstance(a, Page)), None)
                if pg:
                    pg.screenshot(path=os.path.join(SHOTS, f"falha-{re.sub(r'[^a-z0-9]+', '-', nome.lower())}.png"), full_page=True)

        return rodar

    return decorador


def crc16(dados: str) -> str:
    crc = 0xFFFF
    for b in dados.encode():
        crc ^= b << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if crc & 0x8000 else (crc << 1)
            crc &= 0xFFFF
    return f"{crc:04X}"


def sem_rolagem_horizontal(page: Page):
    larguras = page.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
    assert larguras[0] <= larguras[1], f"rolagem horizontal: {larguras}"


estado: dict[str, str] = {}


@caso("página inicial carrega conteúdo da API")
def t_inicio(page: Page):
    page.goto(BASE + "/")
    page.wait_for_load_state("networkidle")
    expect(page.locator("h1")).to_contain_text("descubra a área")
    expect(page.locator(".heroi__preco")).to_contain_text("R$ 97,00")
    expect(page.locator(".ementa__item")).to_have_count(5)
    expect(page.locator("#titulo-ementa")).to_have_text("Fundamentos inegociáveis da Computação")
    expect(page.locator(".turma")).to_have_count(3)
    expect(page.locator(".agenda__demo")).to_contain_text("Modo demonstração")
    expect(page.locator("#mentor h2")).to_have_text("Anderson")


@caso("fluxograma marca o caminho e pré-preenche o momento")
def t_fluxo(page: Page):
    page.get_by_role("button", name="Ainda não").click()
    expect(page.get_by_role("button", name="Ainda não")).to_have_attribute("aria-pressed", "true")
    expect(page.locator(".fluxo__resposta")).to_contain_text("cada área por dentro")
    assert page.locator(".fluxo__no.ativo").count() >= 4, "caminho não acendeu"
    assert page.locator(".fluxo__no.apagado").count() == 1, "o outro ramo deveria apagar"


@caso("passo 1: continuar só depois de escolher turma")
def t_passo1(page: Page):
    page.locator("#agendar").scroll_into_view_if_needed()
    continuar = page.get_by_role("button", name="Continuar com seus dados")
    expect(continuar).to_be_disabled()
    page.locator("label.turma", has_text="Turma piloto").click()
    expect(page.locator(".turma--marcada")).to_contain_text("Turma piloto")
    expect(continuar).to_be_enabled()
    page.screenshot(path=os.path.join(SHOTS, "passo1.png"))
    continuar.click()
    expect(page.get_by_role("heading", name="Seus dados")).to_be_focused()


@caso("passo 2: validação explica como corrigir")
def t_passo2_validacao(page: Page):
    expect(page.locator("#f-nivel")).to_have_value("Não sei por onde começar")
    page.get_by_role("button", name=re.compile("Gerar Pix")).click()
    expect(page.locator("#e-nome")).to_have_text("Escreva seu nome completo.")
    expect(page.locator("#f-nome")).to_be_focused()
    expect(page.locator("#f-nome")).to_have_attribute("aria-invalid", "true")
    page.fill("#f-nome", "Maria")
    page.fill("#f-email", "maria@")
    page.locator("#f-email").blur()
    expect(page.locator("#e-nome")).to_have_text("Escreva nome e sobrenome.")
    expect(page.locator("#e-email")).to_contain_text("Confira o e-mail")


@caso("passo 2: máscara do WhatsApp")
def t_mascara(page: Page):
    page.locator("#f-whatsapp").press_sequentially("11912345678")
    expect(page.locator("#f-whatsapp")).to_have_value("(11) 91234-5678")


@caso("passo 3: Pix com valor, código e CRC válidos")
def t_passo3(page: Page):
    page.fill("#f-nome", "Maria Souza")
    page.fill("#f-email", "maria@gmail.com")
    page.select_option("#f-origem", "Faculdade")
    page.get_by_role("button", name="Gerar Pix de R$ 97,00").click()
    expect(page.get_by_role("heading", name="Pague o Pix para garantir a vaga")).to_be_visible()
    codigo = page.locator(".resumo__codigo").inner_text().strip()
    assert re.fullmatch(r"PC[A-Z2-9]{8}", codigo), codigo
    estado["codigo"] = codigo
    pix = page.locator("#pix-copia").input_value()
    assert pix.startswith("000201"), pix
    assert "540597.00" in pix, "valor ausente no BR Code"
    assert f"05{len(codigo):02d}{codigo}" in pix, "txid ausente"
    assert pix[-4:] == crc16(pix[:-4]), "CRC inválido"
    expect(page.locator("svg.pix__qr-img")).to_be_visible()
    expect(page.locator(".pix__demo")).to_be_visible()
    href = page.get_by_role("link", name="Enviar comprovante no WhatsApp").get_attribute("href") or ""
    from urllib.parse import unquote

    texto = unquote(href)
    for pedaco in (codigo, "Turma piloto", "Maria Souza", "R$ 97,00"):
        assert pedaco in texto, f"mensagem do WhatsApp sem {pedaco!r}: {texto}"
    page.screenshot(path=os.path.join(SHOTS, "passo3.png"))


@caso("copiar código Pix mostra confirmação")
def t_copiar(page: Page):
    page.get_by_role("button", name="Copiar código").click()
    expect(page.locator(".toast")).to_have_text("Código Pix copiado")


@caso("vaga ocupada aparece nas turmas e a faixa lembra a reserva")
def t_faixa(page: Page):
    page.goto(BASE + "/")
    page.wait_for_load_state("networkidle")
    expect(page.locator(".faixa")).to_contain_text(estado["codigo"])
    expect(page.locator("label.turma", has_text="Turma piloto")).to_contain_text("11 de 12 vagas livres")


@caso("página da reserva mostra pendência")
def t_reserva_pendente(page: Page):
    page.goto(f"{BASE}/reserva/{estado['codigo']}")
    expect(page.get_by_role("heading", level=1)).to_have_text("Falta pagar o Pix")
    expect(page.locator("#pix-copia")).to_have_value(re.compile("^000201"))


@caso("reserva inexistente explica o problema")
def t_reserva_404(page: Page):
    page.goto(f"{BASE}/reserva/PCZZZZZZZZ")
    expect(page.get_by_role("heading", level=1)).to_have_text("Reserva não encontrada.")


@caso("admin recusa senha errada")
def t_admin_errado(page: Page):
    page.goto(BASE + "/admin")
    page.fill("#l-senha", "errada")
    page.get_by_role("button", name="Entrar").click()
    expect(page.locator("#l-erro")).to_have_text("Usuário ou senha incorretos.")


@caso("admin confirma o pagamento")
def t_admin_confirma(page: Page):
    page.fill("#l-senha", SENHA)
    page.get_by_role("button", name="Entrar").click()
    linha = page.locator("tr", has_text=estado["codigo"])
    expect(linha).to_be_visible()
    page.screenshot(path=os.path.join(SHOTS, "admin.png"), full_page=True)
    linha.get_by_role("button", name="Confirmar pagamento").click()
    expect(page.locator(".confirmacao")).to_contain_text("Maria Souza")
    expect(page.get_by_role("link", name="Avisar no WhatsApp")).to_have_attribute("href", re.compile("wa.me/5511912345678"))
    page.select_option("#b-status", "PAGA")
    expect(page.locator("tr", has_text=estado["codigo"])).to_contain_text("Paga")


@caso("admin edita turma e o site reflete as vagas")
def t_admin_turma(page: Page):
    page.get_by_role("tab", name="Turmas").click()
    page.get_by_role("button", name="Editar Turma piloto").click()
    expect(page.locator("dialog[open]")).to_be_visible()
    page.fill("#t-vagas", "1")
    page.get_by_role("button", name="Salvar turma").click()
    expect(page.locator("dialog[open]")).to_have_count(0)
    expect(page.locator(".lista-turmas li", has_text="Turma piloto")).to_contain_text("Esgotada")
    page.goto(BASE + "/")
    page.wait_for_load_state("networkidle")
    piloto = page.locator("label.turma", has_text="Turma piloto")
    expect(piloto).to_contain_text("Vagas esgotadas")
    expect(piloto.locator("input")).to_be_disabled()


@caso("aluno vê a vaga confirmada")
def t_confirmada(page: Page):
    page.goto(f"{BASE}/reserva/{estado['codigo']}")
    expect(page.get_by_role("heading", level=1)).to_have_text("Vaga confirmada")


@caso("tema escuro alterna e persiste")
def t_tema(page: Page):
    page.goto(BASE + "/")
    page.get_by_role("button", name="Usar tema escuro").click()
    expect(page.locator("html")).to_have_attribute("data-theme", "dark")
    page.reload()
    expect(page.locator("html")).to_have_attribute("data-theme", "dark")
    page.get_by_role("button", name="Usar tema claro").click()


@caso("teclado: link de pular conteúdo e foco visível")
def t_teclado(page: Page):
    page.goto(BASE + "/")
    pular = page.get_by_role("link", name="Pular para o conteúdo")
    # O React desenha a página depois do carregamento: o Tab só vale quando o link já existe.
    pular.wait_for(state="attached")
    page.keyboard.press("Tab")
    expect(pular).to_be_focused()
    estilo = page.evaluate("getComputedStyle(document.activeElement).outlineStyle")
    assert estilo != "none", "sem contorno de foco"


@caso("página inexistente")
def t_404(page: Page):
    page.goto(BASE + "/qualquer-coisa")
    expect(page.get_by_role("heading", level=1)).to_have_text("Esta página não existe.")


def telas(browser):
    """Screenshots de revisão de design e checagem de rolagem horizontal."""
    for largura, esquema in ((360, "light"), (360, "dark"), (768, "light"), (1280, "light"), (1280, "dark")):
        ctx = browser.new_context(viewport={"width": largura, "height": 860}, color_scheme=esquema)
        page = ctx.new_page()
        nome = f"telas {largura}px {esquema}"

        @caso(nome)
        def t(page: Page):
            for caminho in ("/", f"/reserva/{estado.get('codigo', 'PCZZZZZZZZ')}", "/admin"):
                page.goto(BASE + caminho)
                page.wait_for_load_state("networkidle")
                page.wait_for_timeout(1600)
                sem_rolagem_horizontal(page)
                slug = caminho.strip("/").split("/")[0] or "inicio"
                page.screenshot(path=os.path.join(SHOTS, f"{slug}-{largura}-{esquema}.png"), full_page=True)

        t(page)
        ctx.close()


def preparar_turma_piloto():
    """Põe a turma piloto no futuro, para o teste não depender da data em que roda."""
    import base64
    import datetime
    import json
    import urllib.request

    hoje = datetime.date.today()
    turma = {
        "id": "piloto", "nome": "Turma piloto", "dias": "4 sábados", "horario": "9h às 11h",
        "inicio": (hoje + datetime.timedelta(days=30)).isoformat(),
        "fim": (hoje + datetime.timedelta(days=51)).isoformat(),
        "vagas": 12, "preco": 97, "selo": "Preço de lançamento", "ativa": True,
    }
    auth = base64.b64encode(f"admin:{SENHA}".encode()).decode()
    req = urllib.request.Request(BASE + "/api/admin/turmas/piloto", data=json.dumps(turma).encode(), method="PUT",
                                 headers={"Content-Type": "application/json", "Authorization": "Basic " + auth})
    urllib.request.urlopen(req).read()


def main():
    preparar_turma_piloto()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=CHROMIUM if os.path.exists(CHROMIUM) else None)
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
        page = ctx.new_page()
        erros_console: list[str] = []
        page.on("console", lambda m: m.type == "error" and erros_console.append(m.text))
        page.on("pageerror", lambda e: erros_console.append(str(e)))

        print("Fluxo do aluno e do mentor")
        for t in (t_inicio, t_fluxo, t_passo1, t_passo2_validacao, t_mascara, t_passo3, t_copiar, t_faixa,
                  t_reserva_pendente, t_reserva_404, t_admin_errado, t_admin_confirma, t_admin_turma, t_confirmada,
                  t_tema, t_teclado, t_404):
            t(page)

        # 401 do login errado e 404 da reserva inexistente são esperados no console.
        inesperados = [e for e in erros_console if "401" not in e and "404" not in e]
        resultados.append(("console sem erros inesperados", not inesperados, "; ".join(inesperados)[:300]))
        print(f"  {'ok   ' if not inesperados else 'FALHA'} console sem erros inesperados {inesperados[:3] if inesperados else ''}")
        ctx.close()

        print("Telas")
        telas(browser)
        browser.close()

    falhas = [r for r in resultados if not r[1]]
    print(f"\n{len(resultados) - len(falhas)}/{len(resultados)} casos passaram. Screenshots em {SHOTS}")
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
