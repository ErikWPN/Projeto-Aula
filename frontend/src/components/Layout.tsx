import { useEffect, useState } from "react";
import { Link, Outlet, ScrollRestoration, useLocation } from "react-router";
import { ToastProvider } from "./Toast";
import { CHAVES } from "../lib/storage";

type Tema = "light" | "dark";

function temaAtual(): Tema {
  const definido = document.documentElement.getAttribute("data-theme");
  if (definido === "light" || definido === "dark") return definido;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function BotaoTema() {
  const [tema, setTema] = useState<Tema>(temaAtual);

  function alternar() {
    const novo: Tema = tema === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", novo);
    try {
      localStorage.setItem(CHAVES.tema, novo);
    } catch {
      /* sem armazenamento, vale só nesta visita */
    }
    setTema(novo);
  }

  const escuro = tema === "dark";
  return (
    <button
      type="button"
      className="botao-tema"
      onClick={alternar}
      aria-pressed={escuro}
      aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"}
      title={escuro ? "Usar tema claro" : "Usar tema escuro"}
    >
      {escuro ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
        </svg>
      )}
    </button>
  );
}

export function Marca() {
  return (
    <svg className="marca" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3 29 16 16 29 3 16Z" />
    </svg>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  const naHome = pathname === "/";
  const noAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (noAdmin) document.title = "Painel da mentoria";
  }, [noAdmin]);

  return (
    <ToastProvider>
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="topo">
        <div className="wrap topo__linha">
          <Link to="/" className="logo">
            <Marca />
            <span>Primeiro Commit</span>
          </Link>
          <nav aria-label="Principal" className="topo__nav">
            {naHome && (
              <>
                <a href="#ementa" className="topo__link">
                  Ementa
                </a>
                <a href="#mentor" className="topo__link">
                  Mentor
                </a>
                <a href="#duvidas" className="topo__link">
                  Dúvidas
                </a>
              </>
            )}
            <BotaoTema />
            {!noAdmin &&
              (naHome ? (
                <a className="btn btn--pequeno" href="#agendar">
                  Agendar
                </a>
              ) : (
                <Link className="btn btn--pequeno" to="/#agendar">
                  Agendar
                </Link>
              ))}
          </nav>
        </div>
      </header>
      <main id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
      <ScrollRestoration />
    </ToastProvider>
  );
}
