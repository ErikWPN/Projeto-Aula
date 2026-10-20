import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError, api, type Reserva, type Site } from "../lib/api";
import { brl, diaHora, linkWhatsapp, periodo } from "../lib/format";
import { CHAVES, gravar, ler } from "../lib/storage";
import { PixPainel } from "../components/PixPainel";

const TITULOS: Record<Reserva["status"], string> = {
  PENDENTE: "Falta pagar o Pix",
  PAGA: "Vaga confirmada",
  EXPIRADA: "O prazo desta reserva venceu",
  CANCELADA: "Reserva cancelada",
};

export function ReservaPagina() {
  const { codigo = "" } = useParams();
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [erro, setErro] = useState<ApiError | null>(null);
  const siteCarregado = useRef<Site | null>(null);

  // O conteúdo do site vem uma vez; a atualização periódica busca só a reserva.
  const carregar = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([api.reserva(codigo), siteCarregado.current ?? api.site()]);
      siteCarregado.current = s;
      setReserva(r);
      setSite(s);
      setErro(null);
      // Esquece a reserva lembrada na página inicial só se for esta e ela já tiver sido resolvida.
      if (r.status !== "PENDENTE" && ler<string | null>(CHAVES.ultimaReserva, null) === r.codigo) {
        gravar(CHAVES.ultimaReserva, null);
      }
    } catch (e) {
      setErro(e instanceof ApiError ? e : new ApiError(0, "Não foi possível carregar a reserva."));
    }
  }, [codigo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Enquanto o pagamento não é conferido, atualiza sozinho quando a aba volta a ficar visível e a cada minuto.
  useEffect(() => {
    if (reserva?.status !== "PENDENTE") return;
    const aoVoltar = () => document.visibilityState === "visible" && void carregar();
    const intervalo = window.setInterval(aoVoltar, 60_000);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [reserva?.status, carregar]);

  useEffect(() => {
    if (reserva) document.title = `${TITULOS[reserva.status]}: reserva ${reserva.codigo}`;
  }, [reserva]);

  if (erro) {
    return (
      <section className="wrap pagina-curta">
        <h1>{erro.status === 404 ? "Reserva não encontrada." : "A reserva não carregou."}</h1>
        <p className="lead">{erro.message}</p>
        <div className="acoes">
          {erro.status !== 404 && (
            <button type="button" className="btn" onClick={() => void carregar()}>
              Tentar de novo
            </button>
          )}
          <Link className={erro.status === 404 ? "btn" : "btn btn--claro"} to="/#agendar">
            Ver turmas
          </Link>
        </div>
      </section>
    );
  }

  if (!reserva || !site) {
    return (
      <div className="carregando" aria-live="polite">
        Carregando reserva…
      </div>
    );
  }

  const status = reserva.status;

  return (
    <section className="wrap reserva-pagina" aria-labelledby="titulo-reserva">
      <p className={`etiqueta etiqueta--${status.toLowerCase()}`}>
        Reserva <span className="mono">{reserva.codigo}</span>
      </p>
      <h1 id="titulo-reserva">{TITULOS[status]}</h1>

      {status === "PENDENTE" && (
        <>
          <p className="lead">
            Pague até {diaHora(reserva.expiraEm)} e envie o comprovante. Esta página atualiza sozinha quando o pagamento for
            conferido.
          </p>
          {reserva.demo && (
            <p className="aviso">
              <strong>Modo demonstração.</strong> Este Pix é de exemplo e não deve ser pago.
            </p>
          )}
          <div className="agenda">
            <div className="painel">
              <PixPainel
                reserva={reserva}
                mentoria={site.nome}
                whatsapp={site.whatsapp}
                linkCartao={site.linkCartao}
                mostrarLinkReserva={false}
              />
            </div>
          </div>
        </>
      )}

      {status === "PAGA" && (
        <div className="confirmada">
          <p className="lead">
            Pagamento de {brl(reserva.valor)} conferido{reserva.pagoEm ? ` em ${diaHora(reserva.pagoEm)}` : ""}. Até a aula,{" "}
            {reserva.nome.split(" ")[0]}!
          </p>
          <dl className="resumo">
            <div>
              <dt>Turma</dt>
              <dd>{reserva.turma.nome}</dd>
            </div>
            <div>
              <dt>Quando</dt>
              <dd>
                {periodo(reserva.turma.inicio, reserva.turma.fim)}
                <span className="resumo__detalhe">
                  {reserva.turma.dias}, {reserva.turma.horario}
                </span>
              </dd>
            </div>
            <div>
              <dt>Onde</dt>
              <dd>{site.formato}</dd>
            </div>
          </dl>
          <p>O link do grupo da turma chega pelo WhatsApp. Se não chegou, chame a mentoria:</p>
          <div className="acoes">
            <a
              className="btn"
              href={linkWhatsapp(site.whatsapp, `Olá! Minha reserva ${reserva.codigo} foi confirmada. Pode me mandar o link do grupo?`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Pedir o link do grupo
            </a>
          </div>
        </div>
      )}

      {status === "EXPIRADA" && (
        <>
          <p className="lead">
            O Pix não foi conferido até {diaHora(reserva.expiraEm)} e a vaga voltou para a turma. Se você já pagou, mande o
            comprovante que a mentoria confere e confirma a sua vaga.
          </p>
          <div className="acoes">
            <a
              className="btn"
              href={linkWhatsapp(site.whatsapp, `Olá! Paguei a reserva ${reserva.codigo}, mas ela aparece como vencida. Segue o comprovante.`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Já paguei, enviar comprovante
            </a>
            <Link className="btn btn--claro" to="/#agendar">
              Fazer nova reserva
            </Link>
          </div>
        </>
      )}

      {status === "CANCELADA" && (
        <>
          <p className="lead">Esta reserva foi cancelada pela mentoria. Se isso não era esperado, fale com a gente.</p>
          <div className="acoes">
            <a
              className="btn"
              href={linkWhatsapp(site.whatsapp, `Olá! Minha reserva ${reserva.codigo} aparece como cancelada. Pode me ajudar?`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Falar no WhatsApp
            </a>
            <Link className="btn btn--claro" to="/#agendar">
              Ver turmas
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
