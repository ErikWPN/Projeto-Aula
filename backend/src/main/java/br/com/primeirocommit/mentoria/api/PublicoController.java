package br.com.primeirocommit.mentoria.api;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import br.com.primeirocommit.mentoria.api.Views.ReservaView;
import br.com.primeirocommit.mentoria.api.Views.SiteView;
import br.com.primeirocommit.mentoria.api.Views.TurmaView;
import br.com.primeirocommit.mentoria.config.MentoriaProperties;
import br.com.primeirocommit.mentoria.reserva.LimiteDeReservas;
import br.com.primeirocommit.mentoria.reserva.Reserva;
import br.com.primeirocommit.mentoria.reserva.ReservaService;
import br.com.primeirocommit.mentoria.turma.SituacaoTurma;
import br.com.primeirocommit.mentoria.turma.TurmaRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class PublicoController {

    private final MentoriaProperties props;
    private final TurmaRepository turmas;
    private final ReservaService reservas;
    private final LimiteDeReservas limite;
    private final Clock clock;

    public PublicoController(MentoriaProperties props, TurmaRepository turmas, ReservaService reservas,
            LimiteDeReservas limite, Clock clock) {
        this.props = props;
        this.turmas = turmas;
        this.reservas = reservas;
        this.limite = limite;
        this.clock = clock;
    }

    @GetMapping("/site")
    public ResponseEntity<SiteView> site() {
        LocalDate hoje = reservas.hoje();
        Map<String, Long> ocupacao = reservas.ocupacao();
        List<TurmaView> lista = turmas.findAllOrdenadas().stream()
                .filter(t -> t.isAtiva())
                .map(t -> TurmaView.de(t, ocupacao.getOrDefault(t.getId(), 0L), hoje))
                .toList();
        BigDecimal precoMinimo = lista.stream()
                .filter(t -> t.situacao() == SituacaoTurma.ABERTA)
                .map(TurmaView::preco)
                .min(BigDecimal::compareTo)
                .orElse(null);
        SiteView view = new SiteView(props.nome(), props.titulo(), props.chamada(), props.formato(), props.publico(),
                props.whatsapp(), props.linkCartao(), props.demo(), props.reservaHoras(), props.mentor(),
                props.ementa(), props.faq(), props.niveis(), props.origens(), lista, precoMinimo);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(view);
    }

    @PostMapping("/reservas")
    public ResponseEntity<ReservaView> reservar(@Valid @RequestBody NovaReservaRequest req, HttpServletRequest http) {
        if (!limite.permitir(http.getRemoteAddr())) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Muitas reservas seguidas deste aparelho. Espere alguns minutos ou chame no WhatsApp.");
        }
        Reserva r = reservas.criar(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ReservaView.de(r, props, clock.instant()));
    }

    @GetMapping("/reservas/{codigo}")
    public ResponseEntity<ReservaView> consultar(@PathVariable String codigo) {
        Reserva r = reservas.buscar(codigo);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ReservaView.de(r, props, clock.instant()));
    }
}
