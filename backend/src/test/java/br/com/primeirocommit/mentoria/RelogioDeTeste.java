package br.com.primeirocommit.mentoria;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/** Relógio que os testes podem avançar, para simular prazos e datas de turma. */
public class RelogioDeTeste extends Clock {

    public static final Instant INICIAL = Instant.parse("2026-10-20T15:00:00Z");

    private volatile Instant agora = INICIAL;

    public void avancar(Duration d) {
        agora = agora.plus(d);
    }

    public void definir(Instant instante) {
        agora = instante;
    }

    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        RelogioDeTeste outro = this;
        return new Clock() {
            @Override
            public ZoneId getZone() {
                return zone;
            }

            @Override
            public Clock withZone(ZoneId z) {
                return outro.withZone(z);
            }

            @Override
            public Instant instant() {
                return outro.instant();
            }
        };
    }

    @Override
    public Instant instant() {
        return agora;
    }
}
