import { describe, expect, it } from "vitest";
import { crc16, gerarPix } from "./pix";

describe("pix", () => {
  it("CRC do vetor padrão e do exemplo do manual do Banco Central", () => {
    expect(crc16("123456789")).toBe("29B1");
    expect(
      crc16(
        "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000" +
          "5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304",
      ),
    ).toBe("1D3D");
  });

  it("gera o mesmo payload que o servidor", () => {
    const pix = gerarPix("anderson@gmail.com", "Anderson Conceição", "São Paulo", 97, "PCABCD2345");
    expect(pix).toContain("0118anderson@gmail.com");
    expect(pix).toContain("540597.00");
    expect(pix).toContain("5918ANDERSON CONCEICAO");
    expect(pix).toContain("6009SAO PAULO");
    expect(pix).toContain("62140510PCABCD2345");
    expect(pix.slice(-4)).toBe(crc16(pix.slice(0, -4)));
  });
});
