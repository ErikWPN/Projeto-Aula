package br.com.primeirocommit.mentoria.reserva;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Freio simples contra robôs: no máximo N reservas por IP dentro de uma janela de tempo.
 * O limite tem folga para uma turma inteira reservando do mesmo Wi-Fi da faculdade.
 */
@Component
public class LimiteDeReservas {

    static final int MAXIMO = 10;
    static final Duration JANELA = Duration.ofMinutes(10);

    private final Clock clock;
    private final Map<String, Deque<Instant>> tentativas = new ConcurrentHashMap<>();

    public LimiteDeReservas(Clock clock) {
        this.clock = clock;
    }

    public boolean permitir(String ip) {
        Instant agora = clock.instant();
        Instant corte = agora.minus(JANELA);
        Deque<Instant> fila = tentativas.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (fila) {
            while (!fila.isEmpty() && fila.peekFirst().isBefore(corte)) {
                fila.pollFirst();
            }
            if (fila.size() >= MAXIMO) {
                return false;
            }
            fila.addLast(agora);
        }
        return true;
    }

    /** Esquece IPs sem tentativas recentes, para o mapa não crescer sem limite. */
    @Scheduled(fixedDelayString = "PT10M")
    public void esquecerAntigos() {
        Instant corte = clock.instant().minus(JANELA);
        tentativas.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                return e.getValue().isEmpty() || e.getValue().peekLast().isBefore(corte);
            }
        });
    }

    public void limpar() {
        tentativas.clear();
    }
}
