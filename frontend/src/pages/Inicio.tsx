import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { ApiError, MODO_APRESENTACAO, api, type Site } from "../lib/api";
import { brl, telefoneLegivel } from "../lib/format";
import { CHAVES, ler } from "../lib/storage";
import { Fluxograma, type Caminho } from "../components/Fluxograma";
import { Agendamento } from "../components/Agendamento";
import { Marca } from "../components/Layout";

export function Inicio() {
  const [site, setSite] = useState<Site | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [caminho, setCaminho] = useState<Caminho>(null);
  const [ultima] = useState<string | null>(() => ler<string | null>(CHAVES.ultimaReserva, null));
  const { hash } = useLocation();

  const carregar = useCallback(async () => {
    try {
      const dados = await api.site();
      setSite(dados);
      setErro(null);
      document.title = `${dados.nome}: seu caminho para entrar na TI`;
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível carregar as turmas.");
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Ao abrir /#agendar vindo de outra página, rola até o agendamento quando ele existir.
  useEffect(() => {
    const alvo = hash || window.location.hash;
    if (site && alvo) document.getElementById(alvo.slice(1))?.scrollIntoView();
  }, [site, hash]);

  if (erro && !site) {
    return (
      <section className="wrap pagina-curta" aria-live="polite">
        <h1>As turmas não carregaram.</h1>
        <p className="lead">{erro}</p>
        <button type="button" className="btn" onClick={() => void carregar()}>
          Tentar de novo
        </button>
      </section>
    );
  }

  if (!site) {
    return (
      <div className="carregando" aria-live="polite">
        Carregando turmas…
      </div>
    );
  }

  const nivelSugerido =
    caminho === "nao" ? site.niveis[0] : caminho === "sim" ? site.niveis[site.niveis.length - 1] : null;

  return (
    <>
      {ultima && (
        <div className="faixa">
          <div className="wrap faixa__linha">
            <span>
              Você tem a reserva <span className="mono">{ultima}</span> em andamento.
            </span>
            <Link to={`/reserva/${ultima}`}>Ver reserva</Link>
          </div>
        </div>
      )}

      <section className="wrap heroi" aria-labelledby="titulo-principal">
        <div className="heroi__texto">
          <h1 id="titulo-principal">{site.titulo}</h1>
          <p className="lead">{site.chamada}</p>
          <div className="heroi__cta">
            <a className="btn" href="#agendar">
              Ver turmas e agendar
            </a>
            {site.precoMinimo !== null && (
              <p className="heroi__preco">
                a partir de <strong>{brl(site.precoMinimo)}</strong>
              </p>
            )}
          </div>
          <dl className="fatos">
            <div>
              <dt>Formato</dt>
              <dd>{site.formato}</dd>
            </div>
            <div>
              <dt>Conteúdo</dt>
              <dd>{site.ementa.length} blocos, ao vivo</dd>
            </div>
            <div>
              <dt>Para quem</dt>
              <dd>{site.publico}</dd>
            </div>
          </dl>
        </div>
        <div className="heroi__fluxo">
          <Fluxograma escolha={caminho} onEscolher={setCaminho} />
          <p className="fluxo__resposta" aria-live="polite">
            {caminho === "nao" && (
              <>
                Ótimo ponto de partida: a mentoria mostra cada área por dentro antes de você escolher. Já deixamos “
                {site.niveis[0]}” marcado no <a href="#agendar">agendamento</a>.
              </>
            )}
            {caminho === "sim" && (
              <>
                Você testa essa área na prática e compara com as outras antes de decidir. Já deixamos “
                {site.niveis[site.niveis.length - 1]}” marcado no <a href="#agendar">agendamento</a>.
              </>
            )}
          </p>
        </div>
      </section>

      <section className="bloco" id="ementa" aria-labelledby="titulo-ementa">
        <div className="wrap">
          <div className="bloco__cabeca">
            <h2 id="titulo-ementa">{site.ementaTitulo}</h2>
            {site.ementaIntro && <p>{site.ementaIntro}</p>}
          </div>
          <ol className="ementa">
            {site.ementa.map((e, i) => (
              <li key={e.titulo} className="ementa__item">
                <span className="ementa__n">Bloco {i + 1}</span>
                <h3>{e.titulo}</h3>
                <p>{e.topicos}</p>
              </li>
            ))}
            <li className="ementa__fim">
              Base pronta para qualquer área de TI
            </li>
          </ol>
        </div>
      </section>

      <section className="bloco" id="mentor" aria-labelledby="titulo-mentor">
        <div className="wrap mentor">
          <div className="mentor__foto" aria-hidden={!site.mentor.foto}>
            {site.mentor.foto ? (
              <img src={site.mentor.foto} alt={`Foto de ${site.mentor.nome}`} width="160" height="160" />
            ) : (
              <span>{site.mentor.nome.charAt(0)}</span>
            )}
          </div>
          <div className="mentor__texto">
            <p className="mentor__papel">Quem dá a aula</p>
            <h2 id="titulo-mentor">{site.mentor.nome}</h2>
            <p className="mentor__cargo">{site.mentor.cargo}</p>
            <p>{site.mentor.bio}</p>
          </div>
        </div>
      </section>

      <section className="bloco bloco--agenda" id="agendar" aria-labelledby="titulo-agendar">
        <div className="wrap">
          <div className="bloco__cabeca">
            <h2 id="titulo-agendar">Garanta sua vaga</h2>
            <p>
              Escolha a turma, preencha seus dados e pague com Pix. A vaga fica segura por {site.reservaHoras} horas enquanto o
              pagamento não é conferido.
            </p>
          </div>
          {site.demo && (
            <p className="aviso agenda__demo">
              <strong>Modo demonstração.</strong> A chave Pix ainda é de exemplo: o QR code gerado não deve ser pago. Configure a
              chave real antes de divulgar o site.
            </p>
          )}
          <Agendamento site={site} nivelSugerido={nivelSugerido} onAtualizarTurmas={carregar} />
        </div>
      </section>

      <section className="bloco" id="duvidas" aria-labelledby="titulo-duvidas">
        <div className="wrap">
          <div className="bloco__cabeca">
            <h2 id="titulo-duvidas">Perguntas frequentes</h2>
          </div>
          <div className="faq">
            {site.faq.map((f) => (
              <details key={f.pergunta}>
                <summary>{f.pergunta}</summary>
                <p>{f.resposta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="rodape">
        <div className="wrap rodape__linha">
          <p className="rodape__marca">
            <Marca />
            <span>
              {site.nome}: mentoria para quem quer entrar na TI
            </span>
          </p>
          <p>
            Dúvidas pelo WhatsApp: <span className="mono">{telefoneLegivel(site.whatsapp)}</span>
          </p>
          {MODO_APRESENTACAO && (
            <p>
              <Link to="/admin">Ver o painel do mentor</Link>
            </p>
          )}
        </div>
      </footer>
    </>
  );
}
