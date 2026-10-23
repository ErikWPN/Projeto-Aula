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
  nome: "TI para Leigos",
  titulo: "Entenda a TI, descubra a área que combina com você e entre com um plano.",
  chamada:
    "Mentoria ao vivo para quem está começando ou mudando de carreira. Tudo explicado do zero, sem precisar saber programar.",
  formato: "Online e ao vivo pelo Google Meet",
  publico: "Quem quer entrar na TI, está mudando de carreira ou não sabe que área escolher",
  whatsapp: "5511900000000",
  linkCartao: "",
  demo: true,
  reservaHoras: HORAS_RESERVA,
  mentor: {
    nome: "Anderson",
    cargo: "[Cargo do Anderson], [anos] anos em TI",
    bio: "Trabalha com tecnologia todos os dias e já ajudou muita gente a encontrar o próprio caminho na área. Nas aulas, mostra como a TI funciona por dentro, sem jargão e sem pressa.",
    foto: "",
  },
  ementa: [
    {
      titulo: "O mapa da TI",
      topicos:
        "Como a tecnologia funciona dentro de uma empresa: computadores, redes, internet, nuvem, dados e inteligência artificial, em linguagem simples.",
    },
    {
      titulo: "As áreas por dentro",
      topicos:
        "Suporte e infraestrutura, desenvolvimento, dados, segurança da informação, cloud, UX e produto, qualidade de software: a rotina, o perfil de quem se dá bem e por onde se começa em cada uma.",
    },
    {
      titulo: "Mão na massa",
      topicos:
        "Experimente antes de escolher: práticas guiadas e curtas de lógica de programação, análise de dados, redes e segurança e criação de telas.",
    },
    {
      titulo: "Seu plano de entrada",
      topicos:
        "A área escolhida, uma trilha de estudos com cursos gratuitos e certificações de entrada, o primeiro portfólio, currículo e LinkedIn para a primeira vaga ou a transição.",
    },
  ],
  faq: [
    {
      pergunta: "Preciso saber programar?",
      resposta: "Não. Programação é só uma das áreas da TI, e muitas carreiras começam sem escrever código. A mentoria parte do zero.",
    },
    {
      pergunta: "Trabalho em outra área há anos. Ainda dá tempo?",
      resposta:
        "A mentoria foi pensada para quem está mudando de carreira. O plano de entrada do último encontro leva em conta a sua experiência atual, que muitas vezes conta a favor na nova área.",
    },
    {
      pergunta: "Preciso de faculdade de TI?",
      resposta:
        "Para começar em várias áreas, não. Falamos de cursos livres, certificações e graduação, e de quando cada um faz sentido para o caminho que você escolher.",
    },
    {
      pergunta: "A mentoria garante emprego?",
      resposta:
        "Não. Você sai com uma área escolhida, um plano de estudos e um currículo pronto para começar a se candidatar. O resultado depende de você seguir o plano.",
    },
    {
      pergunta: "O que eu preciso ter?",
      resposta: "Um computador com internet. Pelo celular dá para assistir, mas as práticas pedem um computador.",
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
  niveis: ["Não sei por onde começar", "Estou mudando de carreira", "Já tenho uma área em mente"],
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
        whatsapp: "5511900000001", nivel: "Não sei por onde começar", origem: "Faculdade", valor: 97,
        criadoEm: iso(26 * 3_600_000), expiraEm: iso(2 * 3_600_000), pagoEm: iso(20 * 3_600_000), canceladoEm: null,
      },
      {
        codigo: "PCEXEMPLO3", status: "PENDENTE", turmaId: "piloto", nome: "Rafael Exemplo", email: "rafael@exemplo.com",
        whatsapp: "5521900000002", nivel: "Estou mudando de carreira", origem: "Instagram ou TikTok", valor: 97,
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
    const conflito = (msg: string) => new ApiError(409, msg, { turmaId: msg });
    if (s === "ENCERRADA") throw conflito(`As inscrições da ${t.nome} já fecharam. Escolha outra turma.`);
    if (s === "ESGOTADA") throw conflito(`A última vaga da ${t.nome} acabou de ser reservada. Escolha outra turma.`);

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
