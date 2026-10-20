package br.com.primeirocommit.mentoria.pix;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

class PixBrCodeTest {

    @Test
    void crcDoVetorPadraoCcittFalse() {
        assertThat(PixBrCode.crc16("123456789")).isEqualTo("29B1");
    }

    @Test
    void crcDoExemploDoManualDoBancoCentral() {
        String semCrc = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000"
                + "5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
        assertThat(PixBrCode.crc16(semCrc)).isEqualTo("1D3D");
    }

    @Test
    void geraPayloadCompletoComValorTxidECrc() {
        String pix = PixBrCode.gerar("anderson@gmail.com", "Anderson Conceição", "São Paulo",
                new BigDecimal("97"), "PCABCD2345");

        assertThat(pix).startsWith("000201" + "26" + "40" + "0014br.gov.bcb.pix" + "0118anderson@gmail.com");
        assertThat(pix).contains("5303986" + "540597.00" + "5802BR");
        assertThat(pix).contains("5918ANDERSON CONCEICAO");
        assertThat(pix).contains("6009SAO PAULO");
        assertThat(pix).contains("62140510PCABCD2345");
        String corpo = pix.substring(0, pix.length() - 4);
        assertThat(corpo).endsWith("6304");
        assertThat(pix.substring(pix.length() - 4)).isEqualTo(PixBrCode.crc16(corpo));
    }

    @Test
    void cortaNomeECidadeNosLimitesDoPadrao() {
        assertThat(PixBrCode.limpar("Maria Aparecida de Souza Oliveira", 25)).isEqualTo("MARIA APARECIDA DE SOUZA");
        assertThat(PixBrCode.limpar("São José dos Campos", 15)).isEqualTo("SAO JOSE DOS CA");
    }

    @Test
    void txidSemCaracteresInvalidos() {
        assertThat(PixBrCode.txidValido("PC-12_34")).isEqualTo("PC1234");
        assertThat(PixBrCode.txidValido("")).isEqualTo("***");
        assertThat(PixBrCode.txidValido("A".repeat(30))).hasSize(25);
    }

    @Test
    void recusaChaveVazia() {
        assertThatThrownBy(() -> PixBrCode.gerar(" ", "X", "Y", BigDecimal.ONE, "A"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
