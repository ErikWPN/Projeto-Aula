import { useMemo, useRef } from "react";
import { Link } from "react-router";
import QRCode from "qrcode";
import type { Reserva } from "../lib/api";
import { brl, diaHora, linkWhatsapp, mensagemComprovante, periodo, telefoneLegivel } from "../lib/format";
import { useToast } from "./Toast";

interface Props {
  reserva: Reserva;
  mentoria: string;
  whatsapp: string;
  linkCartao?: string;
  mostrarLinkReserva?: boolean;
}

export function PixPainel({ reserva, mentoria, whatsapp, linkCartao, mostrarLinkReserva = true }: Props) {
  const campo = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const pix = reserva.pixCopiaECola ?? "";

  // O QR é desenhado direto como SVG do React: sem promessa e sem HTML injetado,
  // o que evita falhas em navegadores de celular como o Samsung Internet.
  const qr = useMemo(() => {
    try {
      const modulos = QRCode.create(pix, { errorCorrectionLevel: "M" }).modules;
      let caminho = "";
      for (let y = 0; y < modulos.size; y++) {
        for (let x = 0; x < modulos.size; x++) {
          if (modulos.get(y, x)) caminho += `M${x + 1} ${y + 1}h1v1h-1z`;
        }
      }
      return { lado: modulos.size + 2, caminho };
    } catch {
      return null;
    }
  }, [pix]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(pix);
      toast("Código Pix copiado");
    } catch {
      campo.current?.focus();
      campo.current?.select();
      const ok = document.execCommand?.("copy");
      toast(ok ? "Código Pix copiado" : "Código selecionado. Copie com Ctrl+C ou segure e copie.");
    }
  }

  const mensagem = mensagemComprovante({
    codigo: reserva.codigo,
    mentoria,
    turma: reserva.turma.nome,
    periodo: periodo(reserva.turma.inicio, reserva.turma.fim),
    nome: reserva.nome,
    valor: reserva.valor,
  });

  return (
    <div className="pix">
      <div className="pix__qr">
        <div className="pix__qr-moldura">
          {qr ? (
            <svg
              className="pix__qr-img"
              viewBox={`0 0 ${qr.lado} ${qr.lado}`}
              shapeRendering="crispEdges"
              role="img"
              aria-label="QR code do Pix"
            >
              <rect width={qr.lado} height={qr.lado} fill="#ffffff" />
              <path d={qr.caminho} fill="#1e2a26" />
            </svg>
          ) : (
            <p className="pix__qr-falha">Não deu para desenhar o QR. Use o Pix copia e cola.</p>
          )}
          {reserva.demo && (
            <p className="pix__demo" aria-label="Exemplo, não pague">
              <span>Exemplo</span>
              <span>não pague</span>
            </p>
          )}
        </div>
        <p className="pix__prazo">
          Vaga segura até <strong>{diaHora(reserva.expiraEm)}</strong>
        </p>
      </div>

      <div className="pix__lado">
        <dl className="resumo">
          <div>
            <dt>Reserva</dt>
            <dd className="mono resumo__codigo">{reserva.codigo}</dd>
          </div>
          <div>
            <dt>Turma</dt>
            <dd>
              {reserva.turma.nome}
              <span className="resumo__detalhe">
                {periodo(reserva.turma.inicio, reserva.turma.fim)}, {reserva.turma.dias.toLowerCase()}, {reserva.turma.horario}
              </span>
            </dd>
          </div>
          <div>
            <dt>Aluno</dt>
            <dd>{reserva.nome}</dd>
          </div>
          <div className="resumo__total">
            <dt>Total</dt>
            <dd>{brl(reserva.valor)}</dd>
          </div>
        </dl>

        <div className="campo">
          <label htmlFor="pix-copia">Pix copia e cola</label>
          <div className="copia">
            <input id="pix-copia" ref={campo} className="entrada mono" readOnly value={pix} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn btn--postit btn--pequeno" onClick={copiar}>
              Copiar código
            </button>
          </div>
        </div>

        <ol className="proximos">
          <li>Pague o Pix no app do seu banco.</li>
          <li>Envie o comprovante pelo WhatsApp com o código {reserva.codigo}.</li>
          <li>Quando o pagamento for conferido, sua vaga é confirmada e você recebe o link do grupo da turma.</li>
        </ol>

        <div className="acoes">
          <a className="btn" href={linkWhatsapp(whatsapp, mensagem)} target="_blank" rel="noopener noreferrer">
            Enviar comprovante no WhatsApp
          </a>
          {linkCartao && (
            <a className="btn btn--claro" href={linkCartao} target="_blank" rel="noopener noreferrer">
              Pagar com cartão
            </a>
          )}
        </div>
        <p className="nota">
          WhatsApp da mentoria: <span className="mono">{telefoneLegivel(whatsapp)}</span>
          {mostrarLinkReserva && (
            <>
              <br />
              Acompanhe a confirmação em <Link to={`/reserva/${reserva.codigo}`}>sua página de reserva</Link>.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
