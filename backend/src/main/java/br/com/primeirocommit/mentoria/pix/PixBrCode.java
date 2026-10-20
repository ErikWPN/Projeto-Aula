package br.com.primeirocommit.mentoria.pix;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Locale;

/**
 * Gera o "Pix copia e cola" estático (BR Code) conforme o Manual de Padrões para
 * Iniciação do Pix do Banco Central: campos TLV (id, tamanho com 2 dígitos, valor)
 * e CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF) no fim.
 */
public final class PixBrCode {

    private PixBrCode() {
    }

    public static String gerar(String chave, String nomeRecebedor, String cidade, BigDecimal valor, String txid) {
        if (chave == null || chave.isBlank()) {
            throw new IllegalArgumentException("Chave Pix não configurada");
        }
        String contaPix = tlv("00", "br.gov.bcb.pix") + tlv("01", chave.trim());
        String valorFormatado = valor.setScale(2, RoundingMode.HALF_UP).toPlainString();
        String semCrc = tlv("00", "01")
                + tlv("26", contaPix)
                + tlv("52", "0000")
                + tlv("53", "986")
                + tlv("54", valorFormatado)
                + tlv("58", "BR")
                + tlv("59", limpar(nomeRecebedor, 25))
                + tlv("60", limpar(cidade, 15))
                + tlv("62", tlv("05", txidValido(txid)))
                + "6304";
        return semCrc + crc16(semCrc);
    }

    static String tlv(String id, String valor) {
        int tamanho = valor.getBytes(StandardCharsets.UTF_8).length;
        if (tamanho > 99) {
            throw new IllegalArgumentException("Campo " + id + " passa de 99 caracteres");
        }
        return id + String.format("%02d", tamanho) + valor;
    }

    public static String crc16(String dados) {
        int crc = 0xFFFF;
        for (byte b : dados.getBytes(StandardCharsets.UTF_8)) {
            crc ^= (b & 0xFF) << 8;
            for (int i = 0; i < 8; i++) {
                crc = (crc & 0x8000) != 0 ? (crc << 1) ^ 0x1021 : crc << 1;
                crc &= 0xFFFF;
            }
        }
        return String.format("%04X", crc);
    }

    /** Nome e cidade: sem acentos, só letras, números e espaço, em maiúsculas. */
    static String limpar(String texto, int max) {
        String semAcento = Normalizer.normalize(texto == null ? "" : texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^A-Za-z0-9 ]", "")
                .trim()
                .toUpperCase(Locale.ROOT);
        return semAcento.length() > max ? semAcento.substring(0, max).trim() : semAcento;
    }

    /** O txid do Pix estático aceita até 25 caracteres alfanuméricos; "***" quando não há. */
    static String txidValido(String txid) {
        String limpo = txid == null ? "" : txid.replaceAll("[^A-Za-z0-9]", "");
        if (limpo.isEmpty()) {
            return "***";
        }
        return limpo.length() > 25 ? limpo.substring(0, 25) : limpo;
    }
}
