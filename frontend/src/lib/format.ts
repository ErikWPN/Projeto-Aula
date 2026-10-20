const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const FUSO = "America/Sao_Paulo";

export function brl(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "2026-11-21" → "21 nov" */
export function diaMes(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

/** "2026-11-21" → "21 nov 2026" */
export function diaMesAno(iso: string) {
  const [a] = iso.split("-");
  return `${diaMes(iso)} ${a}`;
}

/** Período da turma sem repetir o ano quando é o mesmo: "21 nov a 12 dez 2026". */
export function periodo(inicio: string, fim: string) {
  const mesmoAno = inicio.slice(0, 4) === fim.slice(0, 4);
  return `${mesmoAno ? diaMes(inicio) : diaMesAno(inicio)} a ${diaMesAno(fim)}`;
}

/** Instante → "qua., 21/10 às 12:00" no horário de Brasília. */
export function diaHora(instante: string) {
  const d = new Date(instante);
  const dia = d.toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "short", day: "2-digit", month: "2-digit" });
  const hora = d.toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
  return `${dia} às ${hora}`;
}

export function somenteDigitos(texto: string) {
  return texto.replace(/\D/g, "");
}

/** Máscara enquanto digita: (11) 91234-5678 ou (11) 3123-4567. */
export function mascaraWhatsapp(texto: string) {
  let d = somenteDigitos(texto);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  const corte = resto.length === 9 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

/** Telefone guardado como 5511912345678 → "+55 (11) 91234-5678". */
export function telefoneLegivel(digitos: string) {
  const d = somenteDigitos(digitos);
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return "+55 " + mascaraWhatsapp(d.slice(2));
  return "+" + d;
}

export interface Dados {
  nome: string;
  email: string;
  whatsapp: string;
  nivel: string;
  origem: string;
}

/** Mesmas regras do servidor, para avisar antes de enviar. */
export function validarDados(d: Dados): Partial<Record<keyof Dados, string>> {
  const erros: Partial<Record<keyof Dados, string>> = {};
  const nome = d.nome.trim();
  if (!nome) erros.nome = "Escreva seu nome completo.";
  else if (nome.split(/\s+/).length < 2) erros.nome = "Escreva nome e sobrenome.";
  else if (nome.length > 120) erros.nome = "Use até 120 letras.";

  const email = d.email.trim();
  if (!email) erros.email = "Escreva seu e-mail.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = "Confira o e-mail, por exemplo nome@gmail.com.";

  const fone = somenteDigitos(d.whatsapp);
  if (!fone) erros.whatsapp = "Escreva seu WhatsApp com DDD.";
  else if (fone.length < 10 || fone.length > 11) erros.whatsapp = "Use DDD e número, por exemplo (11) 91234-5678.";

  if (!d.nivel) erros.nivel = "Escolha seu nível.";
  if (!d.origem) erros.origem = "Conte como conheceu a mentoria.";
  return erros;
}

export function linkWhatsapp(numero: string, mensagem: string) {
  return `https://wa.me/${somenteDigitos(numero)}?text=${encodeURIComponent(mensagem)}`;
}

export function mensagemComprovante(p: {
  codigo: string;
  mentoria: string;
  turma: string;
  periodo: string;
  nome: string;
  valor: number;
}) {
  return [
    `Olá! Fiz a reserva ${p.codigo} na mentoria ${p.mentoria}.`,
    `Turma: ${p.turma} (${p.periodo})`,
    `Nome: ${p.nome}`,
    `Valor: ${brl(p.valor)}`,
    "",
    "Segue o comprovante do Pix.",
  ].join("\n");
}
