package br.com.primeirocommit.mentoria.reserva;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import br.com.primeirocommit.mentoria.api.ApiException;
import br.com.primeirocommit.mentoria.api.NovaReservaRequest;
import br.com.primeirocommit.mentoria.config.MentoriaProperties;
import br.com.primeirocommit.mentoria.turma.SituacaoTurma;
import br.com.primeirocommit.mentoria.turma.Turma;
import br.com.primeirocommit.mentoria.turma.TurmaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservaService {

    /** Sem 0/O e 1/I/L, para o código não ser lido errado no WhatsApp. */
    private static final char[] ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ReservaRepository reservas;
    private final TurmaRepository turmas;
    private final MentoriaProperties props;
    private final Clock clock;

    public ReservaService(ReservaRepository reservas, TurmaRepository turmas, MentoriaProperties props, Clock clock) {
        this.reservas = reservas;
        this.turmas = turmas;
        this.props = props;
        this.clock = clock;
    }

    public LocalDate hoje() {
        return LocalDate.now(clock.withZone(props.fuso()));
    }

    @Transactional
    public Reserva criar(NovaReservaRequest req) {
        String whatsapp = normalizarWhatsapp(req.whatsapp());
        if (!props.niveis().contains(req.nivel())) {
            throw ApiException.campo("nivel", "Escolha uma das opções da lista.");
        }
        if (!props.origens().contains(req.origem())) {
            throw ApiException.campo("origem", "Escolha uma das opções da lista.");
        }

        Turma turma = turmas.findParaReservar(req.turmaId())
                .orElseThrow(() -> ApiException.campo("turmaId", "Essa turma não existe mais. Escolha outra."));
        Instant agora = clock.instant();
        long livres = turma.getVagas() - reservas.contarOcupadas(turma.getId(), agora);
        SituacaoTurma situacao = turma.situacao(hoje(), livres);
        if (situacao == SituacaoTurma.ENCERRADA) {
            String msg = "As inscrições da " + turma.getNome() + " já fecharam. Escolha outra turma.";
            throw new ApiException(HttpStatus.CONFLICT, msg, Map.of("turmaId", msg));
        }
        if (situacao == SituacaoTurma.ESGOTADA) {
            String msg = "A última vaga da " + turma.getNome() + " acabou de ser reservada. Escolha outra turma.";
            throw new ApiException(HttpStatus.CONFLICT, msg, Map.of("turmaId", msg));
        }

        Reserva reserva = new Reserva(novoCodigo(), turma, req.nome().trim().replaceAll("\\s+", " "),
                req.email().trim().toLowerCase(Locale.ROOT), whatsapp, req.nivel(), req.origem(),
                agora, agora.plus(Duration.ofHours(props.reservaHoras())));
        return reservas.save(reserva);
    }

    @Transactional(readOnly = true)
    public Reserva buscar(String codigo) {
        String limpo = codigo == null ? "" : codigo.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        return reservas.findByCodigo(limpo)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Não encontramos a reserva " + limpo + ". Confira o código."));
    }

    /**
     * Confirma o pagamento. Uma reserva vencida já devolveu a vaga, então só volta a ocupar
     * se a turma ainda tiver lugar (com a turma travada, como na criação).
     */
    @Transactional
    public Reserva confirmar(String codigo) {
        Reserva r = buscar(codigo);
        Instant agora = clock.instant();
        if (r.statusEm(agora) == StatusReserva.EXPIRADA) {
            Turma turma = turmas.findParaReservar(r.getTurma().getId()).orElseThrow();
            long ocupadas = reservas.contarOcupadas(turma.getId(), agora);
            if (ocupadas >= turma.getVagas()) {
                throw new ApiException(HttpStatus.CONFLICT, "A " + turma.getNome() + " está cheia ("
                        + ocupadas + " de " + turma.getVagas() + " vagas). Aumente as vagas da turma antes de confirmar.");
            }
        }
        r.confirmarPagamento(agora);
        return r;
    }

    @Transactional
    public Reserva cancelar(String codigo) {
        Reserva r = buscar(codigo);
        r.cancelar(clock.instant());
        return r;
    }

    @Transactional
    public int expirarVencidas() {
        return reservas.expirarVencidas(clock.instant());
    }

    @Transactional(readOnly = true)
    public List<Reserva> listar() {
        return reservas.findAllRecentes();
    }

    /** Vagas ocupadas agora, por turma. */
    @Transactional(readOnly = true)
    public Map<String, Long> ocupacao() {
        Map<String, Long> mapa = new HashMap<>();
        reservas.ocupacaoPorTurma(clock.instant()).forEach(o -> mapa.put(o.getTurmaId(), o.getTotal()));
        return mapa;
    }

    /** Aceita (11) 91234-5678, 11912345678 ou +55 11 91234-5678 e guarda só dígitos com 55. */
    static String normalizarWhatsapp(String bruto) {
        String digitos = bruto == null ? "" : bruto.replaceAll("\\D", "");
        if (digitos.length() == 10 || digitos.length() == 11) {
            digitos = "55" + digitos;
        }
        if (!(digitos.startsWith("55") && (digitos.length() == 12 || digitos.length() == 13))) {
            throw ApiException.campo("whatsapp", "Use DDD e número, por exemplo (11) 91234-5678.");
        }
        return digitos;
    }

    private String novoCodigo() {
        String codigo;
        do {
            StringBuilder sb = new StringBuilder("PC");
            for (int i = 0; i < 8; i++) {
                sb.append(ALFABETO[RANDOM.nextInt(ALFABETO.length)]);
            }
            codigo = sb.toString();
        } while (reservas.existsByCodigo(codigo));
        return codigo;
    }
}
