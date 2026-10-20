"""Screenshots por seção, em celular e computador, nos dois temas, para revisão de design."""

import os

from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8090")
SHOTS = os.environ.get("SHOTS", os.path.join(os.path.dirname(__file__), "screenshots"))
CHROMIUM = os.environ.get("CHROMIUM_PATH", "/opt/pw-browsers/chromium")
os.makedirs(SHOTS, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=CHROMIUM if os.path.exists(CHROMIUM) else None)
    for largura, altura in ((360, 760), (1280, 860)):
        for esquema in ("light", "dark"):
            page = browser.new_page(viewport={"width": largura, "height": altura}, color_scheme=esquema)
            page.goto(BASE + "/")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1800)
            nome = f"{largura}-{esquema}"
            page.screenshot(path=f"{SHOTS}/r-{nome}-heroi.png")
            if largura == 360:
                page.locator(".fluxo").scroll_into_view_if_needed()
                page.get_by_role("button", name="Ainda não").click()
                page.wait_for_timeout(400)
                page.locator(".heroi__fluxo").screenshot(path=f"{SHOTS}/r-{nome}-fluxo.png")
            page.locator("#ementa").screenshot(path=f"{SHOTS}/r-{nome}-ementa.png")
            page.locator(".agenda").scroll_into_view_if_needed()
            page.locator("label.turma").nth(1).click()
            page.locator(".agenda").screenshot(path=f"{SHOTS}/r-{nome}-passo1.png")
            page.get_by_role("button", name="Continuar com seus dados").click()
            page.get_by_role("button", name="Gerar Pix", exact=False).click()
            page.locator(".agenda").screenshot(path=f"{SHOTS}/r-{nome}-passo2.png")
            page.close()
    browser.close()
print("ok", SHOTS)
