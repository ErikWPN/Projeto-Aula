import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, api, type Reserva, type Site, type Turma } from "../lib/api";
import { brl, mascaraWhatsapp, periodo, validarDados, type Dados } from "../lib/format";
import { CHAVES, gravar, ler } from "../lib/storage";
import { PixPainel } from "./PixPainel";

type Passo = 1 | 2 | 3;
type Erros = Partial<Record<keyof Dados, string>>;

interface Props {
  site: Site;
  nivelSugerido: string | null;
  onAtualizarTurmas: () => Promise<void>;
}

const VAZIO: Dados = { nome: "", email: "", whatsapp: "", nivel: "", origem: "" };

const PASSOS: { n: Passo; titulo: string; forma: "losango" | "paralelogramo" | "retangulo" }[] = [
  { n: 1, titulo: "Turma", forma: "losango" },
  { n: 2, titulo: "Seus dados", forma: "paralelogramo" },
  { n: 3, titulo: "Pagamento", forma: "retangulo" },
];

function Forma({ tipo }: { tipo: "losango" | "paralelogramo" | "retangulo" }) {
  return (
    <svg className={`forma forma--${tipo}`} viewBox="0 0 36 24" aria-hidden="true">
      {tipo === "losango" && <polygon points="18,1 35,12 18,23 1,12" />}
      {tipo === "paralelogramo" && <polygon points="9,2 35,2 27,22 1,22" />}
      {tipo === "retangulo" && <rect x="2" y="2" width="32" height="20" rx="2" />}
    </svg>
  );
}

function rotuloVagas(t: Turma) {
  if (t.situacao === "ENCERRADA") return "Inscrições encerradas";
  if (t.situacao === "ESGOTADA") return "Vagas esgotadas";
  if (t.vagasLivres <= 3) return t.vagasLivres === 1 ? "Resta 1 vaga" : `Restam ${t.vagasLivres} vagas`;
  return `${t.vagasLivres} de ${t.vagas} vagas livres`;
}

export function Agendamento({ site, nivelSugerido, onAtualizarTurmas }: Props) {
  const [passo, setPasso] = useState<Passo>(1);
  const [turmaId, setTurmaId] = useState<string>(() => ler<{ turmaId?: string }>(CHAVES.rascunho, {}).turmaId ?? "");
  const [dados, setDados] = useState<Dados>(() => ({ ...VAZIO, ...ler<Partial<Dados>>(CHAVES.rascunho, {}) }));
  const [erros, setErros] = useState<Erros>({});
  const [tocados, setTocados] = useState<Partial<Record<keyof Dados, boolean>>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const primeiraRenderizacao = useRef(true);
  const caixaAviso = useRef<HTMLDivElement>(null);

  const turma = site.turmas.find((t) => t.id === turmaId && t.situacao === "ABERTA") ?? null;

  // A resposta do fluxograma do topo vira o nível pré-marcado.
  useEffect(() => {
    if (nivelSugerido) setDados((d) => ({ ...d, nivel: nivelSugerido }));
  }, [nivelSugerido]);

  // Rascunho: quem volta ou recarrega a página não perde o que digitou.
  useEffect(() => {
    if (passo !== 3) gravar(CHAVES.rascunho, { ...dados, turmaId });
  }, [dados, turmaId, passo]);

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    caixa.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    titulo.current?.focus({ preventScroll: true });
  }, [passo]);

  // O aviso fica no topo da caixa; quem clicou no botão lá embaixo precisa ver a mensagem.
  useEffect(() => {
    if (aviso) caixaAviso.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [aviso]);

  function alterar<K extends keyof Dados>(campo: K, valor: string) {
    const novo = { ...dados, [campo]: campo === "whatsapp" ? mascaraWhatsapp(valor) : valor };
    setDados(novo);
    if (tocados[campo]) setErros((e) => ({ ...e, [campo]: validarDados(novo)[campo] }));
  }

  function sair(campo: keyof Dados) {
    setTocados((t) => ({ ...t, [campo]: true }));
    setErros((e) => ({ ...e, [campo]: validarDados(dados)[campo] }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const encontrados = validarDados(dados);
    setErros(encontrados);
    setTocados({ nome: true, email: true, whatsapp: true, nivel: true, origem: true });
    const primeiro = (Object.keys(encontrados) as (keyof Dados)[])[0];
    if (primeiro) {
      document.getElementById(`f-${primeiro}`)?.focus();
      return;
    }
    if (!turma) {
      setPasso(1);
      return;
    }

    setEnviando(true);
    setAviso(null);
    try {
      const nova = await api.reservar({ turmaId: turma.id, ...dados, nome: dados.nome.trim(), email: dados.email.trim() });
      setReserva(nova);
      gravar(CHAVES.ultimaReserva, nova.codigo);
      gravar(CHAVES.rascunho, null);
      setPasso(3);
      void onAtualizarTurmas();
    } catch (err) {
      const erro = err instanceof ApiError ? err : new ApiError(0, "Algo deu errado. Tente de novo.");
      // Só volta para a escolha de turma quando o problema é a turma (encerrada, esgotada, removida).
      if (erro.campos.turmaId) {
        await onAtualizarTurmas();
        setTurmaId("");
        setAviso(erro.campos.turmaId);
        setPasso(1);
      } else if (Object.keys(erro.campos).length) {
        setErros(erro.campos as Erros);
        const campo = Object.keys(erro.campos)[0];
        document.getElementById(`f-${campo}`)?.focus();
      } else {
        setAviso(erro.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  function recomecar() {
    setReserva(null);
    setTurmaId("");
    setDados((d) => ({ ...VAZIO, nivel: d.nivel }));
    setErros({});
    setTocados({});
    setPasso(1);
  }

  const erroDe = (campo: keyof Dados) =>
    erros[campo] ? (
      <span className="erro-campo" id={`e-${campo}`}>
        {erros[campo]}
      </span>
    ) : null;

  const propsCampo = (campo: keyof Dados) => ({
    id: `f-${campo}`,
    name: campo,
    className: "entrada",
    value: dados[campo],
    "aria-invalid": erros[campo] ? true : undefined,
    "aria-describedby": erros[campo] ? `e-${campo}` : undefined,
    onBlur: () => sair(campo),
  });

  return (
    <div className="agenda" ref={caixa}>
      <ol className="passos" aria-label="Etapas do agendamento">
        {PASSOS.map((p) => (
          <li
            key={p.n}
            className={p.n < passo ? "feito" : undefined}
            aria-current={p.n === passo ? "step" : undefined}
          >
            <Forma tipo={p.forma} />
            <span>
              <span className="sr-only">Etapa {p.n} de 3: </span>
              {p.titulo}
              {p.n < passo && <span className="sr-only"> (concluída)</span>}
            </span>
          </li>
        ))}
      </ol>

      {aviso && (
        <div className="aviso aviso--erro agenda__aviso" role="alert" ref={caixaAviso}>
          {aviso}
        </div>
      )}

      {passo === 1 && (
        <div className="painel">
          <h3 ref={titulo} tabIndex={-1} className="painel__titulo">
            Escolha a turma
          </h3>
          <fieldset className="turmas">
            <legend className="sr-only">Turmas disponíveis</legend>
            {site.turmas.map((t) => {
              const fechada = t.situacao !== "ABERTA";
              const marcada = turmaId === t.id && !fechada;
              return (
                <label key={t.id} className={`turma${marcada ? " turma--marcada" : ""}${fechada ? " turma--fechada" : ""}`}>
                  <input
                    type="radio"
                    name="turma"
                    value={t.id}
                    checked={marcada}
                    disabled={fechada}
                    onChange={() => {
                      setTurmaId(t.id);
                      setAviso(null);
                    }}
                  />
                  <span className="turma__topo">
                    <strong className="turma__nome">{t.nome}</strong>
                    {t.selo && <span className="selo">{t.selo}</span>}
                  </span>
                  <span className="turma__quando">{periodo(t.inicio, t.fim)}</span>
                  <span className="turma__quando">
                    {t.dias}, {t.horario}
                  </span>
                  <span className="turma__base">
                    <span className="turma__preco">{brl(t.preco)}</span>
                    <span className={`turma__vagas turma__vagas--${t.situacao.toLowerCase()}${t.vagasLivres <= 3 ? " turma__vagas--poucas" : ""}`}>
                      {rotuloVagas(t)}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          {site.turmas.length === 0 && (
            <p className="aviso">
              Nenhuma turma aberta agora. Chame no WhatsApp para entrar na lista da próxima.
            </p>
          )}
          <div className="painel__pe">
            <p className="nota" aria-live="polite">
              {turma ? `${turma.nome}, ${brl(turma.preco)}` : "Nenhuma turma escolhida ainda."}
            </p>
            <button type="button" className="btn" disabled={!turma} onClick={() => setPasso(2)}>
              Continuar com seus dados
            </button>
          </div>
        </div>
      )}

      {passo === 2 && turma && (
        <form className="painel" noValidate onSubmit={enviar}>
          <h3 ref={titulo} tabIndex={-1} className="painel__titulo">
            Seus dados
          </h3>
          <p className="nota">
            {turma.nome}, {periodo(turma.inicio, turma.fim)}. Usamos estes dados só para confirmar sua vaga e mandar o link do grupo.
          </p>
          <div className="campos">
            <div className="campo campo--inteiro">
              <label htmlFor="f-nome">Nome completo</label>
              <input {...propsCampo("nome")} autoComplete="name" onChange={(e) => alterar("nome", e.target.value)} />
              {erroDe("nome")}
            </div>
            <div className="campo">
              <label htmlFor="f-email">E-mail</label>
              <input
                {...propsCampo("email")}
                type="email"
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                onChange={(e) => alterar("email", e.target.value)}
              />
              {erroDe("email")}
            </div>
            <div className="campo">
              <label htmlFor="f-whatsapp">WhatsApp com DDD</label>
              <input
                {...propsCampo("whatsapp")}
                type="tel"
                autoComplete="tel-national"
                inputMode="tel"
                placeholder="(11) 91234-5678"
                onChange={(e) => alterar("whatsapp", e.target.value)}
              />
              {erroDe("whatsapp")}
            </div>
            <div className="campo">
              <label htmlFor="f-nivel">Seu nível hoje</label>
              <select {...propsCampo("nivel")} onChange={(e) => alterar("nivel", e.target.value)}>
                <option value="">Escolha uma opção</option>
                {site.niveis.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              {erroDe("nivel")}
            </div>
            <div className="campo">
              <label htmlFor="f-origem">Como conheceu a mentoria</label>
              <select {...propsCampo("origem")} onChange={(e) => alterar("origem", e.target.value)}>
                <option value="">Escolha uma opção</option>
                {site.origens.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              {erroDe("origem")}
            </div>
          </div>
          <div className="painel__pe">
            <button type="button" className="btn btn--claro" onClick={() => setPasso(1)}>
              Voltar para turmas
            </button>
            <button type="submit" className="btn" disabled={enviando} aria-busy={enviando}>
              {enviando ? "Gerando Pix…" : `Gerar Pix de ${brl(turma.preco)}`}
            </button>
          </div>
        </form>
      )}

      {passo === 3 && reserva && (
        <div className="painel">
          <h3 ref={titulo} tabIndex={-1} className="painel__titulo">
            Pague o Pix para garantir a vaga
          </h3>
          <PixPainel reserva={reserva} mentoria={site.nome} whatsapp={site.whatsapp} linkCartao={site.linkCartao} />
          <div className="painel__pe">
            <button type="button" className="link-botao" onClick={recomecar}>
              Fazer outra reserva
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
