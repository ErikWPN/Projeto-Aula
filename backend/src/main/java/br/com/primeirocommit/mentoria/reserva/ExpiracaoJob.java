package br.com.primeirocommit.mentoria.reserva;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Devolve para a turma as vagas de reservas que passaram do prazo sem pagamento. */
@Component
public class ExpiracaoJob {

    private static final Logger log = LoggerFactory.getLogger(ExpiracaoJob.class);

    private final ReservaService service;

    public ExpiracaoJob(ReservaService service) {
        this.service = service;
    }

    @Scheduled(fixedDelayString = "${mentoria.expiracao-intervalo:PT5M}", initialDelayString = "PT30S")
    public void executar() {
        int total = service.expirarVencidas();
        if (total > 0) {
            log.info("{} reserva(s) expiraram e liberaram vaga", total);
        }
    }
}
