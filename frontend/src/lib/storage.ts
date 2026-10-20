// O armazenamento do navegador pode falhar (aba anônima, bloqueio de cookies).
// Tudo aqui é conveniência: o site funciona normalmente sem ele.

export function ler<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}

export function gravar(chave: string, valor: unknown) {
  try {
    if (valor === null || valor === undefined) localStorage.removeItem(chave);
    else localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* sem armazenamento: segue sem lembrar */
  }
}

export const CHAVES = {
  rascunho: "pc-rascunho",
  ultimaReserva: "pc-ultima-reserva",
  tema: "pc-tema",
  admin: "pc-admin",
} as const;
