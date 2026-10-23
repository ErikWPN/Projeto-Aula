import { describe, expect, it } from "vitest";
import {
  brl,
  diaMes,
  linkWhatsapp,
  mascaraWhatsapp,
  mensagemComprovante,
  periodo,
  telefoneLegivel,
  validarDados,
} from "./format";

describe("datas", () => {
  it("formata dia e mês", () => {
    expect(diaMes("2026-11-21")).toBe("21 nov");
  });
  it("não repete o ano no mesmo ano", () => {
    expect(periodo("2026-11-21", "2026-12-12")).toBe("21 nov a 12 dez 2026");
    expect(periodo("2026-12-28", "2027-01-15")).toBe("28 dez 2026 a 15 jan 2027");
  });
});

describe("whatsapp", () => {
  it("aplica máscara enquanto digita", () => {
    expect(mascaraWhatsapp("1")).toBe("(1");
    expect(mascaraWhatsapp("1191")).toBe("(11) 91");
    expect(mascaraWhatsapp("11912345678")).toBe("(11) 91234-5678");
    expect(mascaraWhatsapp("1131234567")).toBe("(11) 3123-4567");
    expect(mascaraWhatsapp("5511912345678")).toBe("(11) 91234-5678");
  });
  it("mostra o número salvo de forma legível", () => {
    expect(telefoneLegivel("5511912345678")).toBe("+55 (11) 91234-5678");
  });
  it("monta o link com a mensagem codificada", () => {
    expect(linkWhatsapp("+55 11 90000-0000", "Olá & tchau")).toBe("https://wa.me/5511900000000?text=Ol%C3%A1%20%26%20tchau");
  });
});

describe("validação", () => {
  const ok = { nome: "Maria Souza", email: "maria@gmail.com", whatsapp: "(11) 91234-5678", nivel: "a", origem: "b" };
  it("aceita dados completos", () => {
    expect(validarDados(ok)).toEqual({});
  });
  it("explica como corrigir cada campo", () => {
    const erros = validarDados({ nome: "Maria", email: "maria@", whatsapp: "123", nivel: "", origem: "" });
    expect(erros.nome).toBe("Escreva nome e sobrenome.");
    expect(erros.email).toMatch(/Confira o e-mail/);
    expect(erros.whatsapp).toMatch(/DDD/);
    expect(erros.nivel).toBeDefined();
    expect(erros.origem).toBeDefined();
  });
});

describe("mensagem do comprovante", () => {
  it("leva código, turma, nome e valor", () => {
    const msg = mensagemComprovante({
      codigo: "PCABCD2345",
      mentoria: "TI para Leigos",
      turma: "Turma piloto",
      periodo: "21 nov a 12 dez 2026",
      nome: "Maria Souza",
      valor: 97,
    });
    expect(msg).toContain("PCABCD2345");
    expect(msg).toContain("Turma piloto");
    expect(msg).toContain("Maria Souza");
    expect(msg).toContain(brl(97));
  });
});
