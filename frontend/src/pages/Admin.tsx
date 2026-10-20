import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  adminApi,
  credenciais,
  type AdminReserva,
  type AdminTurma,
  type Resumo,
  type StatusReserva,
  type TurmaForm,
} from "../lib/api";
import { brl, diaHora, linkWhatsapp, periodo, telefoneLegivel } from "../lib/format";
import { useToast } from "../components/Toast";
import { CHAVES } from "../lib/storage";

const NOMES_STATUS: Record<StatusReserva, string> = {
  PENDENTE: "Aguardando Pix",
  PAGA: "Paga",
  EXPIRADA: "Vencida",
  CANCELADA: "Cancelada",
};

function lerSessao() {
  try {
    return sessionStorage.getItem(CHAVES.admin);
  } catch {
    return null;
  }
}

function gravarSessao(auth: string | null) {
  try {
    if (auth) sessionStorage.setItem(CHAVES.admin, auth);
    else sessionStorage.removeItem(CHAVES.admin);
  } catch {
    /* sessão vale só enquanto a página estiver aberta */
  }
}

export function Admin() {
  const [auth, setAuth] = useState<string | null>(lerSessao);

  function entrar(novo: string) {
    gravarSessao(novo);
    setAuth(novo);
  }

  function sair() {
    gravarSessao(null);
    setAuth(null);
  }

  return auth ? <Painel auth={auth} onSair={sair} /> : <Login onEntrar={entrar} />;
}

function Login({ onEntrar }: { onEntrar: (auth: string) => void }) {
  const [usuario, setUsuario] = useState("admin");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const auth = credenciais(usuario.trim(), senha);
    try {
      await adminApi(auth).sessao();
      onEntrar(auth);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="wrap login" aria-labelledby="titulo-login">
      <h1 id="titulo-login">Painel da mentoria</h1>
      <p className="lead">Entre para conferir pagamentos e cuidar das turmas.</p>
      <form className="login__form" onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="l-usuario">Usuário</label>
          <input id="l-usuario" className="entrada" autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
        </div>
        <div className="campo">
          <label htmlFor="l-senha">Senha</label>
          <input
            id="l-senha"
            className="entrada"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "l-erro" : undefined}
            required
          />
          {erro && (
            <span className="erro-campo" id="l-erro" role="alert">
              {erro}
            </span>
          )}
        </div>
        <button type="submit" className="btn" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </section>
  );
}

type Aba = "reservas" | "turmas";

function Painel({ auth, onSair }: { auth: string; onSair: () => void }) {
  const cliente = useMemo(() => adminApi(auth), [auth]);
  const [aba, setAba] = useState<Aba>("reservas");
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [reservas, setReservas] = useState<AdminReserva[] | null>(null);
  const [turmas, setTurmas] = useState<AdminTurma[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const toast = useToast();

  const tratar = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        onSair();
        return;
      }
      setErro(e instanceof Error ? e.message : "Algo deu errado.");
    },
    [onSair],
  );

  const recarregar = useCallback(async () => {
    try {
      const [r, l, t] = await Promise.all([cliente.resumo(), cliente.reservas(), cliente.turmas()]);
      setResumo(r);
      setReservas(l);
      setTurmas(t);
      setErro(null);
    } catch (e) {
      tratar(e);
    }
  }, [cliente, tratar]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  async function exportar() {
    try {
      const blob = await cliente.csv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reservas-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Planilha exportada");
    } catch (e) {
      tratar(e);
    }
  }

  return (
    <section className="wrap admin" aria-labelledby="titulo-admin">
      <div className="admin__topo">
        <h1 id="titulo-admin">Painel da mentoria</h1>
        <div className="acoes">
          <button type="button" className="btn btn--claro btn--pequeno" onClick={exportar}>
            Exportar planilha
          </button>
          <button type="button" className="link-botao" onClick={onSair}>
            Sair
          </button>
        </div>
      </div>

      {erro && (
        <p className="aviso aviso--erro" role="alert">
          {erro}
        </p>
      )}

      {resumo && (
        <dl className="numeros">
          <div>
            <dt>Aguardando Pix</dt>
            <dd>{resumo.pendentes}</dd>
            <dd className="numeros__extra">{brl(resumo.receitaPendente)} a receber</dd>
          </div>
          <div>
            <dt>Pagas</dt>
            <dd>{resumo.pagas}</dd>
            <dd className="numeros__extra">{brl(resumo.receitaConfirmada)} recebidos</dd>
          </div>
          <div>
            <dt>Vagas livres</dt>
            <dd>{resumo.vagasLivres}</dd>
            <dd className="numeros__extra">nas turmas abertas</dd>
          </div>
          <div>
            <dt>Vencidas ou canceladas</dt>
            <dd>{resumo.expiradas + resumo.canceladas}</dd>
            <dd className="numeros__extra">de {resumo.reservas === 1 ? "1 reserva" : `${resumo.reservas} reservas`}</dd>
          </div>
        </dl>
      )}
      {resumo?.demo && (
        <p className="aviso">
          <strong>Modo demonstração.</strong> Defina PIX_CHAVE, PIX_NOME e PIX_CIDADE para gerar o Pix de verdade.
        </p>
      )}

      <div className="abas" role="tablist" aria-label="Seções do painel">
        <button type="button" role="tab" id="aba-reservas" aria-controls="painel-reservas" aria-selected={aba === "reservas"} onClick={() => setAba("reservas")}>
          Reservas
        </button>
        <button type="button" role="tab" id="aba-turmas" aria-controls="painel-turmas" aria-selected={aba === "turmas"} onClick={() => setAba("turmas")}>
          Turmas
        </button>
      </div>

      <div role="tabpanel" id="painel-reservas" aria-labelledby="aba-reservas" hidden={aba !== "reservas"}>
        {reservas && turmas ? (
          <ListaReservas reservas={reservas} turmas={turmas} cliente={cliente} onMudou={recarregar} onErro={tratar} />
        ) : (
          <p className="carregando">Carregando reservas…</p>
        )}
      </div>
      <div role="tabpanel" id="painel-turmas" aria-labelledby="aba-turmas" hidden={aba !== "turmas"}>
        {turmas ? <ListaTurmas turmas={turmas} cliente={cliente} onMudou={recarregar} onErro={tratar} /> : <p className="carregando">Carregando turmas…</p>}
      </div>
    </section>
  );
}

type Cliente = ReturnType<typeof adminApi>;

function ListaReservas({
  reservas,
  turmas,
  cliente,
  onMudou,
  onErro,
}: {
  reservas: AdminReserva[];
  turmas: AdminTurma[];
  cliente: Cliente;
  onMudou: () => Promise<void>;
  onErro: (e: unknown) => void;
}) {
  const [status, setStatus] = useState<StatusReserva | "">("PENDENTE");
  const [turma, setTurma] = useState("");
  const [busca, setBusca] = useState("");
  const [cancelando, setCancelando] = useState<AdminReserva | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [recemConfirmada, setRecemConfirmada] = useState<AdminReserva | null>(null);
  const toast = useToast();

  const filtradas = reservas.filter((r) => {
    if (status && r.status !== status) return false;
    if (turma && r.turmaId !== turma) return false;
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    const digitos = q.replace(/\D/g, "");
    return (
      r.nome.toLowerCase().includes(q) ||
      r.email.includes(q) ||
      r.codigo.toLowerCase().includes(q) ||
      (digitos.length > 0 && r.whatsapp.includes(digitos))
    );
  });

  async function confirmar(r: AdminReserva) {
    setOcupado(r.codigo);
    try {
      const nova = await cliente.confirmar(r.codigo);
      setRecemConfirmada(nova);
      toast(`Pagamento de ${r.nome.split(" ")[0]} confirmado`);
      await onMudou();
    } catch (e) {
      onErro(e);
    } finally {
      setOcupado(null);
    }
  }

  async function cancelar(r: AdminReserva) {
    setOcupado(r.codigo);
    try {
      await cliente.cancelar(r.codigo);
      toast(`Reserva ${r.codigo} cancelada`);
      setCancelando(null);
      await onMudou();
    } catch (e) {
      onErro(e);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      <div className="filtros">
        <div className="campo">
          <label htmlFor="b-busca">Buscar</label>
          <input
            id="b-busca"
            className="entrada"
            type="search"
            placeholder="Nome, e-mail, código ou telefone"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="campo">
          <label htmlFor="b-status">Situação</label>
          <select id="b-status" className="entrada" value={status} onChange={(e) => setStatus(e.target.value as StatusReserva | "")}>
            <option value="">Todas</option>
            {(Object.keys(NOMES_STATUS) as StatusReserva[]).map((s) => (
              <option key={s} value={s}>
                {NOMES_STATUS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="b-turma">Turma</label>
          <select id="b-turma" className="entrada" value={turma} onChange={(e) => setTurma(e.target.value)}>
            <option value="">Todas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {recemConfirmada && (
        <div className="aviso confirmacao" role="status">
          <p>
            Vaga de <strong>{recemConfirmada.nome}</strong> confirmada. Avise o aluno e mande o link do grupo.
          </p>
          <div className="acoes">
            <a
              className="btn btn--pequeno"
              target="_blank"
              rel="noopener noreferrer"
              href={linkWhatsapp(
                recemConfirmada.whatsapp,
                `Olá, ${recemConfirmada.nome.split(" ")[0]}! Recebi o pagamento da reserva ${recemConfirmada.codigo}. Sua vaga na ${recemConfirmada.turmaNome} está confirmada.`,
              )}
            >
              Avisar no WhatsApp
            </a>
            <button type="button" className="link-botao" onClick={() => setRecemConfirmada(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}

      <p className="nota" aria-live="polite">
        {filtradas.length === 1 ? "1 reserva" : `${filtradas.length} reservas`}
        {status ? ` com situação “${NOMES_STATUS[status]}”` : ""}
      </p>

      {filtradas.length === 0 ? (
        <p className="vazio">
          {reservas.length === 0
            ? "Nenhuma reserva ainda. Quando alguém agendar pelo site, ela aparece aqui."
            : "Nenhuma reserva com esses filtros. Mude a situação ou limpe a busca."}
        </p>
      ) : (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Aluno</th>
                <th scope="col">Turma</th>
                <th scope="col">Valor</th>
                <th scope="col">Situação</th>
                <th scope="col">Criada</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((r) => (
                <tr key={r.codigo}>
                  <td data-rotulo="Código" className="mono">
                    {r.codigo}
                  </td>
                  <td data-rotulo="Aluno">
                    <strong>{r.nome}</strong>
                    <span className="tabela__sub">{r.email}</span>
                    <a className="tabela__sub" href={linkWhatsapp(r.whatsapp, `Olá, ${r.nome.split(" ")[0]}! Aqui é da mentoria, sobre a reserva ${r.codigo}.`)} target="_blank" rel="noopener noreferrer">
                      {telefoneLegivel(r.whatsapp)}
                    </a>
                  </td>
                  <td data-rotulo="Turma">{r.turmaNome}</td>
                  <td data-rotulo="Valor">{brl(r.valor)}</td>
                  <td data-rotulo="Situação">
                    <span className={`etiqueta etiqueta--${r.status.toLowerCase()}`}>{NOMES_STATUS[r.status]}</span>
                    {r.status === "PENDENTE" && <span className="tabela__sub">vence {diaHora(r.expiraEm)}</span>}
                  </td>
                  <td data-rotulo="Criada">{diaHora(r.criadoEm)}</td>
                  <td className="tabela__acoes">
                    {(r.status === "PENDENTE" || r.status === "EXPIRADA") && (
                      <button type="button" className="btn btn--pequeno" disabled={ocupado === r.codigo} onClick={() => void confirmar(r)}>
                        Confirmar pagamento
                      </button>
                    )}
                    {r.status !== "CANCELADA" && (
                      <button type="button" className="link-botao" disabled={ocupado === r.codigo} onClick={() => setCancelando(r)}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialogo aberto={cancelando !== null} titulo="Cancelar reserva?" onFechar={() => setCancelando(null)}>
        {cancelando && (
          <>
            <p>
              A reserva <span className="mono">{cancelando.codigo}</span> de {cancelando.nome} será cancelada e a vaga volta para a{" "}
              {cancelando.turmaNome}.
              {cancelando.status === "PAGA" && " Ela já está paga: combine a devolução do valor com o aluno."}
            </p>
            <div className="acoes">
              <button type="button" className="btn btn--perigo" disabled={ocupado !== null} onClick={() => void cancelar(cancelando)}>
                Cancelar reserva
              </button>
              <button type="button" className="btn btn--claro" onClick={() => setCancelando(null)}>
                Manter reserva
              </button>
            </div>
          </>
        )}
      </Dialogo>
    </>
  );
}

const TURMA_VAZIA: TurmaForm = { id: "", nome: "", inicio: "", fim: "", dias: "", horario: "", preco: 0, selo: "", vagas: 12, ativa: true };

function ListaTurmas({
  turmas,
  cliente,
  onMudou,
  onErro,
}: {
  turmas: AdminTurma[];
  cliente: Cliente;
  onMudou: () => Promise<void>;
  onErro: (e: unknown) => void;
}) {
  const [editando, setEditando] = useState<{ form: TurmaForm; nova: boolean } | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  function abrir(t: AdminTurma | null) {
    setErros({});
    setEditando(t ? { form: { ...t }, nova: false } : { form: { ...TURMA_VAZIA }, nova: true });
  }

  function campo<K extends keyof TurmaForm>(k: K, v: TurmaForm[K]) {
    setEditando((e) => (e ? { ...e, form: { ...e.form, [k]: v } } : e));
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    if (!editando) return;
    setSalvando(true);
    try {
      if (editando.nova) await cliente.criarTurma(editando.form);
      else await cliente.editarTurma(editando.form);
      toast(editando.nova ? "Turma criada" : "Turma salva");
      setEditando(null);
      await onMudou();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.campos).length) setErros(e.campos);
      else onErro(e);
    } finally {
      setSalvando(false);
    }
  }

  const err = (k: string) =>
    erros[k] ? (
      <span className="erro-campo" id={`te-${k}`}>
        {erros[k]}
      </span>
    ) : null;
  const inv = (k: string) => (erros[k] ? { "aria-invalid": true as const, "aria-describedby": `te-${k}` } : {});
  const f = editando?.form;

  return (
    <>
      <div className="acoes admin__acoes-turmas">
        <button type="button" className="btn btn--pequeno" onClick={() => abrir(null)}>
          Criar turma
        </button>
      </div>
      <ul className="lista-turmas">
        {turmas.map((t) => {
          const pct = t.vagas ? Math.min(100, Math.round((t.ocupadas / t.vagas) * 100)) : 100;
          return (
            <li key={t.id}>
              <div className="lista-turmas__cabeca">
                <h3>{t.nome}</h3>
                <span className={`etiqueta etiqueta--${t.situacao.toLowerCase()}`}>
                  {!t.ativa ? "Oculta do site" : t.situacao === "ABERTA" ? "Aberta" : t.situacao === "ESGOTADA" ? "Esgotada" : "Encerrada"}
                </span>
              </div>
              <p className="nota">
                {periodo(t.inicio, t.fim)}, {t.dias}, {t.horario}. {brl(t.preco)}.
              </p>
              <div className="ocupacao">
                <span className="ocupacao__barra" style={{ "--pct": `${pct}%` } as React.CSSProperties} aria-hidden="true" />
                <span>
                  {t.ocupadas} de {t.vagas} vagas ocupadas
                </span>
              </div>
              <button type="button" className="link-botao" onClick={() => abrir(t)}>
                Editar {t.nome}
              </button>
            </li>
          );
        })}
      </ul>

      <Dialogo aberto={editando !== null} titulo={editando?.nova ? "Criar turma" : "Editar turma"} onFechar={() => setEditando(null)}>
        {f && (
          <form className="form-turma" onSubmit={salvar} noValidate>
            {editando?.nova && (
              <div className="campo campo--inteiro">
                <label htmlFor="t-id">Identificador</label>
                <input id="t-id" className="entrada mono" value={f.id} onChange={(e) => campo("id", e.target.value.toLowerCase())} {...inv("id")} />
                <span className="ajuda">Aparece só no painel. Letras minúsculas, números e hífen, por exemplo turma-marco.</span>
                {err("id")}
              </div>
            )}
            <div className="campo campo--inteiro">
              <label htmlFor="t-nome">Nome</label>
              <input id="t-nome" className="entrada" value={f.nome} onChange={(e) => campo("nome", e.target.value)} {...inv("nome")} />
              {err("nome")}
            </div>
            <div className="campo">
              <label htmlFor="t-inicio">Primeiro encontro</label>
              <input id="t-inicio" className="entrada" type="date" value={f.inicio} onChange={(e) => campo("inicio", e.target.value)} {...inv("inicio")} />
              {err("inicio")}
            </div>
            <div className="campo">
              <label htmlFor="t-fim">Último encontro</label>
              <input id="t-fim" className="entrada" type="date" value={f.fim} onChange={(e) => campo("fim", e.target.value)} {...inv("fim")} />
              {err("fim")}
            </div>
            <div className="campo">
              <label htmlFor="t-dias">Dias</label>
              <input id="t-dias" className="entrada" placeholder="Seg e qua" value={f.dias} onChange={(e) => campo("dias", e.target.value)} {...inv("dias")} />
              {err("dias")}
            </div>
            <div className="campo">
              <label htmlFor="t-horario">Horário</label>
              <input id="t-horario" className="entrada" placeholder="19h30 às 21h30" value={f.horario} onChange={(e) => campo("horario", e.target.value)} {...inv("horario")} />
              {err("horario")}
            </div>
            <div className="campo">
              <label htmlFor="t-vagas">Vagas</label>
              <input id="t-vagas" className="entrada" type="number" min={0} max={500} value={f.vagas} onChange={(e) => campo("vagas", Number(e.target.value))} {...inv("vagas")} />
              {err("vagas")}
            </div>
            <div className="campo">
              <label htmlFor="t-preco">Preço (R$)</label>
              <input id="t-preco" className="entrada" type="number" min={1} step="0.01" value={f.preco || ""} onChange={(e) => campo("preco", Number(e.target.value))} {...inv("preco")} />
              {err("preco")}
            </div>
            <div className="campo campo--inteiro">
              <label htmlFor="t-selo">Selo (opcional)</label>
              <input id="t-selo" className="entrada" placeholder="Preço de lançamento" value={f.selo} onChange={(e) => campo("selo", e.target.value)} {...inv("selo")} />
              {err("selo")}
            </div>
            <label className="caixa campo--inteiro">
              <input type="checkbox" checked={f.ativa} onChange={(e) => campo("ativa", e.target.checked)} />
              Mostrar no site
            </label>
            <div className="acoes campo--inteiro">
              <button type="submit" className="btn" disabled={salvando}>
                {salvando ? "Salvando…" : editando?.nova ? "Criar turma" : "Salvar turma"}
              </button>
              <button type="button" className="btn btn--claro" onClick={() => setEditando(null)}>
                Descartar
              </button>
            </div>
          </form>
        )}
      </Dialogo>
    </>
  );
}

function Dialogo({
  aberto,
  titulo,
  onFechar,
  children,
}: {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog ref={ref} className="dialogo" aria-labelledby="dialogo-titulo" onClose={onFechar} onCancel={onFechar}>
      <div className="dialogo__cabeca">
        <h2 id="dialogo-titulo">{titulo}</h2>
        <button type="button" className="dialogo__fechar" aria-label="Fechar" onClick={onFechar}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
