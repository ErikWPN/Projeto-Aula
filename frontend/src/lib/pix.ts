// BR Code do Pix estático, igual ao do servidor (PixBrCode.java). Usado no modo apresentação.

function tlv(id: string, valor: string) {
  const tamanho = new TextEncoder().encode(valor).length;
  return id + String(tamanho).padStart(2, "0") + valor;
}

export function crc16(dados: string) {
  let crc = 0xffff;
  for (const b of new TextEncoder().encode(dados)) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function limpar(texto: string, max: number) {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, max)
    .trim();
}

export function gerarPix(chave: string, nome: string, cidade: string, valor: number, txid: string) {
  const conta = tlv("00", "br.gov.bcb.pix") + tlv("01", chave.trim());
  const id = txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const semCrc =
    tlv("00", "01") +
    tlv("26", conta) +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", valor.toFixed(2)) +
    tlv("58", "BR") +
    tlv("59", limpar(nome, 25)) +
    tlv("60", limpar(cidade, 15)) +
    tlv("62", tlv("05", id)) +
    "6304";
  return semCrc + crc16(semCrc);
}
