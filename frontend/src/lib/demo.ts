// Modo apresentação: a mesma API do servidor, rodando no navegador.
// Os dados ficam no localStorage de quem está vendo. Nada é enviado nem cobrado.
import type {
  AdminReserva,
  AdminTurma,
  NovaReserva,
  Reserva,
  Resumo,
  Site,
  Situacao,
  StatusReserva,
  TurmaForm,
} from "./api";
import { ApiError } from "./erro";
import { validarDados, somenteDigitos } from "./format";
import { gerarPix } from "./pix";

export const SENHA_DEMO = "demo";
const CHAVE = "pc-apresentacao";
const HORAS_RESERVA = 24;
const PIX = { chave: "chave-pix@exemplo.com", nome: "Anderson Exemplo", cidade: "Sao Paulo" };

const CONTEUDO: Omit<Site, "turmas" | "precoMinimo"> = {
  nome: "Primeiro Commit",
  titulo: "Entenda o computador e escreva seu primeiro programa sem decoreba.",
  chamada: "TI básica e lógica de programação do zero, ao vivo e em turma pequena.",
  formato: "Online e ao vivo pelo Google Meet",
  publico: "Calouros de cursos de TI e quem está migrando de área",
  whatsapp: "5511900000000",
  linkCartao: "",
  demo: true,
  reservaHoras: HORAS_RESERVA,
  mentor: {
    nome: "Anderson",
    cargo: "[Cargo do Anderson], [anos] anos em TI",
    bio: "Trabalha com tecnologia todos os dias e já ajudou muita gente a dar os primeiros passos. Nas aulas, explica o porquê de cada coisa antes de mostrar o código.",
    foto: "",
  },
  ementa: [
    {
      titulo: "Como o computador funciona",
      topicos: "Processador, memória, armazenamento, dispositivos de entrada e saída, sistema operacional, arquivos e pastas.",
    },
    {
      titulo: "Redes e internet",
      topicos: "O que acontece quando você abre um site: IP, DNS, navegador e servidor. Cuidados básicos de segurança.",
    },
    {
      titulo: "Lógica de programação",
      topicos: "Algoritmos, variáveis, tipos de dados, entrada e saída e condições (se / senão), com exercícios em Portugol.",
    },
    {
      titulo: "Repetição e seu primeiro programa",
      topicos: "Laços, funções e um programa completo do zero, primeiro em Portugol e depois em Python.",
    },
  ],
  faq: [
    {
      pergunta: "Preciso saber alguma coisa antes?",
      resposta: "Não. A mentoria começa do zero. Se você sabe ligar o computador e usar o navegador, já pode participar.",
    },
    {
      pergunta: "O que eu preciso ter?",
      resposta: "Um computador com internet. Pelo celular dá para assistir, mas não para fazer os exercícios.",
    },
    {
      pergunta: "Como confirmo minha vaga?",
      resposta:
        "Pague o Pix gerado no fim do agendamento e envie o comprovante pelo WhatsApp. A vaga fica segura enquanto o Pix não vence e é confirmada quando o pagamento é conferido. Você acompanha tudo pelo link da sua reserva.",
    },
    {
      pergunta: "E se eu desistir?",
      resposta:
        "Você pode desistir em até 7 dias depois do pagamento e recebe o valor de volta (direito de arrependimento, art. 49 do Código de Defesa do Consumidor).",
    },
  ],
  niveis: ["Nunca programei", "Já tentei sozinho", "Estou no começo da faculdade"],
  origens: ["Faculdade", "Indicação de amigo", "Instagram ou TikTok", "WhatsApp", "Outro"],
};

type TurmaSalva = Omit<AdminTurma, "ocupadas" | "situacao">;
interface ReservaSalva extends Omit<AdminReserva, "turmaNome" | "status"> {
  status: StatusReserva;
}
interface Estado {
  turmas: TurmaSalva[];
  reservas: ReservaSalva[];
}

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function hojeISO(deslocamentoDias = 0) {
  const d = new Date(Date.now() + deslocamentoDias * 86_400_000);
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

function maisTarde(iso: string, minimoDias: number) {
  const minimo = hojeISO(minimoDias);
  return iso < minimo ? minimo : iso;
}

function somarDias(iso: string, dias: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Turmas e reservas de exemplo. As datas andam junto com o calendário para a apresentação nunca mostrar turma vencida. */
function semente(): Estado {
  const piloto = maisTarde("2026-11-21", 21);
  const ferias = maisTarde("2027-01-11", 60);
  const fev = maisTarde("2027-02-22", 100);
  const agora = Date.now();
  const iso = (msAtras: number) => new Date(agora - msAtras).toISOString();
  return {
    turmas: [
      { id: "piloto", nome: "Turma piloto", inicio: piloto, fim: somarDias(piloto, 21), dias: "4 sábados", horario: "9h às 11h", vagas: 12, preco: 97, selo: "Preço de lançamento", ativa: true },
      { id: "ferias", nome: "Turma de férias", inicio: ferias, fim: somarDias(ferias, 11), dias: "Seg, qua e sex", horario: "19h30 às 21h30", vagas: 15, preco: 147, selo: "", ativa: true },
      { id: "fev27", nome: "Turma de fevereiro", inicio: fev, fim: somarDias(fev, 23), dias: "Seg e qua", horario: "19h30 às 21h30", vagas: 15, preco: 197, selo: "Começo do semestre", ativa: true },
    ],
    reservas: [
      {
        codigo: "PCEXEMPLO2", status: "PAGA", turmaId: "piloto", nome: "Joana Exemplo", email: "joana@exemplo.com",
        whatsapp: "5511900000001", nivel: "Nunca programei", origem: "Faculdade", valor: 97,
        criadoEm: iso(26 * 3_600_000), expiraEm: iso(2 * 3_600_000), pagoEm: iso(20 * 3_600_000), canceladoEm: null,
      },
      {
        codigo: "PCEXEMPLO3", status: "PENDENTE", turmaId: "piloto", nome: "Rafael Exemplo", email: "rafael@exemplo.com",
        whatsapp: "5521900000002", nivel: "Já tentei sozinho", origem: "Instagram ou TikTok", valor: 97,
        criadoEm: iso(3 * 3_600_000), expiraEm: new Date(agora + 21 * 3_600_000).toISOString(), pagoEm: null, canceladoEm: null,
      },
    ],
  };
}

let memoria: Estado | null = null;

function carregar(): Estado {
  if (memoria) return memoria;
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) memoria = JSON.parse(bruto) as Estado;
  } catch {
    /* sem armazenamento: usa só a memória */
  }
  if (!memoria) memoria = semente();
  return memoria;
}

function salvar(e: Estado) {
  memoria = e;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(e));
  } catch {
    /* segue só na memória */
  }
}

export function recomecarApresentacao() {
  memoria = semente();
  salvar(memoria);
}

const pausa = () => new Promise((r) => setTimeout(r, 180));

function statusEm(r: ReservaSalva, agora = Date.now()): StatusReserva {
  return r.status === "PENDENTE" && new Date(r.expiraEm).getTime() <= agora ? "EXPIRADA" : r.status;
}

function ocupadas(e: Estado, turmaId: string) {
  return e.reservas.filter((r) => r.turmaId === turmaId && (statusEm(r) === "PAGA" || statusEm(r) === "PENDENTE")).length;
}

function situacao(t: TurmaSalva, livres: number): Situacao {
  if (!t.ativa || hojeISO() > t.inicio) return "ENCERRADA";
  return livres <= 0 ? "ESGOTADA" : "ABERTA";
}

function paraReserva(e: Estado, r: ReservaSalva): Reserva {
  const t = e.turmas.find((x) => x.id === r.turmaId)!;
  const status = statusEm(r);
  return {
    codigo: r.codigo,
    status,
    turma: { id: t.id, nome: t.nome, inicio: t.inicio, fim: t.fim, dias: t.dias, horario: t.horario },
    nome: r.nome,
    valor: r.valor,
    pixCopiaECola: status === "PENDENTE" ? gerarPix(PIX.chave, PIX.nome, PIX.cidade, r.valor, r.codigo) : null,
    criadoEm: r.criadoEm,
    expiraEm: r.expiraEm,
    pagoEm: r.pagoEm,
    demo: true,
  };
}

function paraAdmin(e: Estado, r: ReservaSalva): AdminReserva {
  const t = e.turmas.find((x) => x.id === r.turmaId)!;
  return { ...r, status: statusEm(r), turmaNome: t.nome };
}

function paraAdminTurma(e: Estado, t: TurmaSalva): AdminTurma {
  const oc = ocupadas(e, t.id);
  return { ...t, ocupadas: oc, situacao: situacao(t, t.vagas - oc) };
}

function buscar(e: Estado, codigo: string) {
  const limpo = codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const r = e.reservas.find((x) => x.codigo === limpo);
  if (!r) throw new ApiError(404, `Não encontramos a reserva ${limpo}. Confira o código.`);
  return r;
}

export const demoApi = {
  async site(): Promise<Site> {
    await pausa();
    const e = carregar();
    const turmas = e.turmas
      .filter((t) => t.ativa)
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
      .map((t) => {
        const livres = Math.max(0, t.vagas - ocupadas(e, t.id));
        return { ...t, vagasLivres: livres, situacao: situacao(t, livres) };
      });
    const abertas = turmas.filter((t) => t.situacao === "ABERTA").map((t) => t.preco);
    return { ...CONTEUDO, turmas, precoMinimo: abertas.length ? Math.min(...abertas) : null };
  },

  async reservar(d: NovaReserva): Promise<Reserva> {
    await pausa();
    const e = carregar();
    const erros = validarDados(d) as Record<string, string>;
    if (!CONTEUDO.niveis.includes(d.nivel)) erros.nivel = "Escolha uma das opções da lista.";
    if (!CONTEUDO.origens.includes(d.origem)) erros.origem = "Escolha uma das opções da lista.";
    if (Object.keys(erros).length) throw new ApiError(400, "Confira os campos destacados.", erros);
    const t = e.turmas.find((x) => x.id === d.turmaId);
    if (!t) throw new ApiError(400, "Confira os campos destacados.", { turmaId: "Essa turma não existe mais. Escolha outra." });
    const s = situacao(t, t.vagas - ocupadas(e, t.id));
    if (s === "ENCERRADA") throw new ApiError(409, `As inscrições da ${t.nome} já fecharam. Escolha outra turma.`);
    if (s === "ESGOTADA") throw new ApiError(409, `A última vaga da ${t.nome} acabou de ser reservada. Escolha outra turma.`);

    let codigo = "";
    do {
      codigo = "PC" + Array.from({ length: 8 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join("");
    } while (e.reservas.some((r) => r.codigo === codigo));
    const agora = Date.now();
    const fone = somenteDigitos(d.whatsapp);
    const nova: ReservaSalva = {
      codigo,
      status: "PENDENTE",
      turmaId: t.id,
      nome: d.nome.trim().replace(/\s+/g, " "),
      email: d.email.trim().toLowerCase(),
      whatsapp: fone.length <= 11 ? "55" + fone : fone,
      nivel: d.nivel,
      origem: d.origem,
      valor: t.preco,
      criadoEm: new Date(agora).toISOString(),
      expiraEm: new Date(agora + HORAS_RESERVA * 3_600_000).toISOString(),
      pagoEm: null,
      canceladoEm: null,
    };
    salvar({ ...e, reservas: [nova, ...e.reservas] });
    return paraReserva(carregar(), nova);
  },

  async reserva(codigo: string): Promise<Reserva> {
    await pausa();
    const e = carregar();
    return paraReserva(e, buscar(e, codigo));
  },
};

export const demoAdminApi = (auth: string) => {
  const exigirLogin = () => {
    let decodificado = "";
    try {
      decodificado = new TextDecoder().decode(Uint8Array.from(atob(auth), (c) => c.charCodeAt(0)));
    } catch {
      /* credencial ilegível */
    }
    if (decodificado.split(":").slice(1).join(":") !== SENHA_DEMO) {
      throw new ApiError(401, `Usuário ou senha incorretos. Na apresentação, a senha é ${SENHA_DEMO}.`);
    }
  };

  function mudar(codigo: string, f: (r: ReservaSalva, e: Estado) => ReservaSalva) {
    const e = carregar();
    const r = buscar(e, codigo);
    const nova = f(r, e);
    salvar({ ...e, reservas: e.reservas.map((x) => (x.codigo === r.codigo ? nova : x)) });
    return paraAdmin(carregar(), nova);
  }

  function validarTurma(t: TurmaForm, nova: boolean, e: Estado) {
    const erros: Record<string, string> = {};
    if (nova && !/^[a-z0-9-]{2,40}$/.test(t.id)) erros.id = "Use de 2 a 40 letras minúsculas, números ou hífen.";
    if (nova && e.turmas.some((x) => x.id === t.id)) erros.id = "Já existe uma turma com esse identificador.";
    if (!t.nome.trim()) erros.nome = "Dê um nome para a turma.";
    if (!t.inicio) erros.inicio = "Informe a data do primeiro encontro.";
    if (!t.fim) erros.fim = "Informe a data do último encontro.";
    else if (t.inicio && t.fim < t.inicio) erros.fim = "O último encontro precisa ser depois do primeiro.";
    if (!t.dias.trim()) erros.dias = "Informe os dias, por exemplo Seg e qua.";
    if (!t.horario.trim()) erros.horario = "Informe o horário, por exemplo 19h30 às 21h30.";
    if (!(t.vagas >= 0 && t.vagas <= 500)) erros.vagas = "Use de 0 a 500 vagas.";
    if (!(t.preco >= 1)) erros.preco = "O preço mínimo é R$ 1,00.";
    if (Object.keys(erros).length) throw new ApiError(400, "Confira os campos destacados.", erros);
  }

  return {
    async sessao() {
      await pausa();
      exigirLogin();
      return { usuario: "admin" };
    },
    async resumo(): Promise<Resumo> {
      exigirLogin();
      const e = carregar();
      const lista = e.reservas.map((r) => ({ ...r, status: statusEm(r) }));
      const conta = (s: StatusReserva) => lista.filter((r) => r.status === s);
      const soma = (s: StatusReserva) => conta(s).reduce((t, r) => t + r.valor, 0);
      const vagasLivres = e.turmas
        .map((t) => paraAdminTurma(e, t))
        .filter((t) => t.situacao === "ABERTA")
        .reduce((t, x) => t + Math.max(0, x.vagas - x.ocupadas), 0);
      return {
        reservas: lista.length,
        pendentes: conta("PENDENTE").length,
        pagas: conta("PAGA").length,
        expiradas: conta("EXPIRADA").length,
        canceladas: conta("CANCELADA").length,
        receitaConfirmada: soma("PAGA"),
        receitaPendente: soma("PENDENTE"),
        vagasLivres,
        demo: true,
      };
    },
    async reservas(): Promise<AdminReserva[]> {
      exigirLogin();
      const e = carregar();
      return [...e.reservas].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).map((r) => paraAdmin(e, r));
    },
    async confirmar(codigo: string) {
      await pausa();
      exigirLogin();
      return mudar(codigo, (r, e) => {
        const status = statusEm(r);
        if (status === "PAGA" || status === "CANCELADA") throw new ApiError(409, "Só dá para confirmar reservas pendentes ou expiradas.");
        const t = e.turmas.find((x) => x.id === r.turmaId)!;
        if (status === "EXPIRADA" && ocupadas(e, t.id) >= t.vagas) {
          throw new ApiError(409, `A ${t.nome} está cheia. Aumente as vagas da turma antes de confirmar.`);
        }
        return { ...r, status: "PAGA", pagoEm: new Date().toISOString() };
      });
    },
    async cancelar(codigo: string) {
      await pausa();
      exigirLogin();
      return mudar(codigo, (r) => {
        if (r.status === "CANCELADA") throw new ApiError(409, "Esta reserva já está cancelada.");
        return { ...r, status: "CANCELADA", canceladoEm: new Date().toISOString() };
      });
    },
    async turmas(): Promise<AdminTurma[]> {
      exigirLogin();
      const e = carregar();
      return [...e.turmas].sort((a, b) => a.inicio.localeCompare(b.inicio)).map((t) => paraAdminTurma(e, t));
    },
    async criarTurma(t: TurmaForm) {
      await pausa();
      exigirLogin();
      const e = carregar();
      validarTurma(t, true, e);
      const nova: TurmaSalva = { ...t, nome: t.nome.trim(), selo: t.selo.trim() };
      salvar({ ...e, turmas: [...e.turmas, nova] });
      return paraAdminTurma(carregar(), nova);
    },
    async editarTurma(t: TurmaForm) {
      await pausa();
      exigirLogin();
      const e = carregar();
      validarTurma(t, false, e);
      if (!e.turmas.some((x) => x.id === t.id)) throw new ApiError(404, "Turma não encontrada.");
      const nova: TurmaSalva = { ...t, nome: t.nome.trim(), selo: t.selo.trim() };
      salvar({ ...e, turmas: e.turmas.map((x) => (x.id === t.id ? nova : x)) });
      return paraAdminTurma(carregar(), nova);
    },
    async csv(): Promise<Blob> {
      throw new ApiError(0, "A exportação da planilha funciona na versão publicada do site, não na apresentação.");
    },
  };
};
