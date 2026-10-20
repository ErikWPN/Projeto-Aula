import { ApiError } from "./erro";
import { demoAdminApi, demoApi } from "./demo";

export { ApiError };

/** Modo apresentação: tudo roda no navegador, sem servidor (npm run build:demo). */
export const MODO_APRESENTACAO = import.meta.env.VITE_DEMO === "1";

export type Situacao = "ABERTA" | "ESGOTADA" | "ENCERRADA";
export type StatusReserva = "PENDENTE" | "PAGA" | "EXPIRADA" | "CANCELADA";

export interface Turma {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
  dias: string;
  horario: string;
  preco: number;
  selo: string;
  vagas: number;
  vagasLivres: number;
  situacao: Situacao;
}

export interface Site {
  nome: string;
  titulo: string;
  chamada: string;
  formato: string;
  publico: string;
  whatsapp: string;
  linkCartao: string;
  demo: boolean;
  reservaHoras: number;
  mentor: { nome: string; cargo: string; bio: string; foto: string };
  ementa: { titulo: string; topicos: string }[];
  faq: { pergunta: string; resposta: string }[];
  niveis: string[];
  origens: string[];
  turmas: Turma[];
  precoMinimo: number | null;
}

export interface Reserva {
  codigo: string;
  status: StatusReserva;
  turma: { id: string; nome: string; inicio: string; fim: string; dias: string; horario: string };
  nome: string;
  valor: number;
  pixCopiaECola: string | null;
  criadoEm: string;
  expiraEm: string;
  pagoEm: string | null;
  demo: boolean;
}

export interface NovaReserva {
  turmaId: string;
  nome: string;
  email: string;
  whatsapp: string;
  nivel: string;
  origem: string;
}

export interface AdminReserva {
  codigo: string;
  status: StatusReserva;
  turmaId: string;
  turmaNome: string;
  nome: string;
  email: string;
  whatsapp: string;
  nivel: string;
  origem: string;
  valor: number;
  criadoEm: string;
  expiraEm: string;
  pagoEm: string | null;
  canceladoEm: string | null;
}

export interface AdminTurma {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
  dias: string;
  horario: string;
  preco: number;
  selo: string;
  vagas: number;
  ocupadas: number;
  situacao: Situacao;
  ativa: boolean;
}

export interface Resumo {
  reservas: number;
  pendentes: number;
  pagas: number;
  expiradas: number;
  canceladas: number;
  receitaConfirmada: number;
  receitaPendente: number;
  vagasLivres: number;
  demo: boolean;
}

export type TurmaForm = Omit<AdminTurma, "ocupadas" | "situacao">;


async function pedir<T>(url: string, init: RequestInit = {}, auth?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body) headers["Content-Type"] = "application/json";
  if (auth) headers.Authorization = "Basic " + auth;
  let resp: Response;
  try {
    resp = await fetch(url, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  } catch {
    throw new ApiError(0, "Sem conexão com o servidor. Confira sua internet e tente de novo.");
  }
  if (!resp.ok) {
    let corpo: { mensagem?: string; campos?: Record<string, string> } = {};
    try {
      corpo = await resp.json();
    } catch {
      /* resposta sem JSON */
    }
    throw new ApiError(resp.status, corpo.mensagem ?? "Algo deu errado. Tente de novo em instantes.", corpo.campos ?? {});
  }
  return resp.json() as Promise<T>;
}

const servidorApi = {
  site: () => pedir<Site>("/api/site"),
  reservar: (dados: NovaReserva) => pedir<Reserva>("/api/reservas", { method: "POST", body: JSON.stringify(dados) }),
  reserva: (codigo: string) => pedir<Reserva>("/api/reservas/" + encodeURIComponent(codigo)),
};

export function credenciais(usuario: string, senha: string) {
  const bytes = new TextEncoder().encode(usuario + ":" + senha);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

const servidorAdminApi = (auth: string) => ({
  sessao: () => pedir<{ usuario: string }>("/api/admin/sessao", {}, auth),
  resumo: () => pedir<Resumo>("/api/admin/resumo", {}, auth),
  reservas: () => pedir<AdminReserva[]>("/api/admin/reservas", {}, auth),
  confirmar: (codigo: string) =>
    pedir<AdminReserva>(`/api/admin/reservas/${encodeURIComponent(codigo)}/confirmar`, { method: "POST" }, auth),
  cancelar: (codigo: string) =>
    pedir<AdminReserva>(`/api/admin/reservas/${encodeURIComponent(codigo)}/cancelar`, { method: "POST" }, auth),
  turmas: () => pedir<AdminTurma[]>("/api/admin/turmas", {}, auth),
  criarTurma: (t: TurmaForm) => pedir<AdminTurma>("/api/admin/turmas", { method: "POST", body: JSON.stringify(t) }, auth),
  editarTurma: (t: TurmaForm) =>
    pedir<AdminTurma>("/api/admin/turmas/" + encodeURIComponent(t.id), { method: "PUT", body: JSON.stringify(t) }, auth),
  async csv() {
    const resp = await fetch("/api/admin/reservas.csv", { headers: { Authorization: "Basic " + auth } });
    if (!resp.ok) throw new ApiError(resp.status, "Não foi possível exportar agora.");
    return resp.blob();
  },
});

export const api = MODO_APRESENTACAO ? demoApi : servidorApi;
export const adminApi: typeof servidorAdminApi = MODO_APRESENTACAO ? demoAdminApi : servidorAdminApi;
