package br.com.primeirocommit.mentoria.api;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import br.com.primeirocommit.mentoria.api.Views.AdminReservaView;
import br.com.primeirocommit.mentoria.api.Views.AdminTurmaView;
import br.com.primeirocommit.mentoria.api.Views.ResumoView;
import br.com.primeirocommit.mentoria.config.MentoriaProperties;
import br.com.primeirocommit.mentoria.reserva.Reserva;
import br.com.primeirocommit.mentoria.reserva.ReservaService;
import br.com.primeirocommit.mentoria.reserva.StatusReserva;
import br.com.primeirocommit.mentoria.turma.SituacaoTurma;
import br.com.primeirocommit.mentoria.turma.Turma;
import br.com.primeirocommit.mentoria.turma.TurmaRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final DateTimeFormatter DATA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final ReservaService reservas;
    private final TurmaRepository turmas;
    private final MentoriaProperties props;
    private final Clock clock;

    public AdminController(ReservaService reservas, TurmaRepository turmas, MentoriaProperties props, Clock clock) {
        this.reservas = reservas;
        this.turmas = turmas;
        this.props = props;
        this.clock = clock;
    }

    @GetMapping("/sessao")
    public Map<String, String> sessao(Principal principal) {
        return Map.of("usuario", principal.getName());
    }

    @GetMapping("/resumo")
    public ResumoView resumo() {
        Instant agora = clock.instant();
        List<Reserva> todas = reservas.listar();
        long pendentes = contar(todas, StatusReserva.PENDENTE, agora);
        long pagas = contar(todas, StatusReserva.PAGA, agora);
        long expiradas = contar(todas, StatusReserva.EXPIRADA, agora);
        long canceladas = contar(todas, StatusReserva.CANCELADA, agora);
        BigDecimal receita = somar(todas, StatusReserva.PAGA, agora);
        BigDecimal aReceber = somar(todas, StatusReserva.PENDENTE, agora);
        long vagasLivres = listarTurmas().stream()
                .filter(t -> t.situacao() == SituacaoTurma.ABERTA)
                .mapToLong(t -> Math.max(0, t.vagas() - t.ocupadas()))
                .sum();
        return new ResumoView(todas.size(), pendentes, pagas, expiradas, canceladas, receita, aReceber, vagasLivres,
                props.demo());
    }

    @GetMapping("/reservas")
    public List<AdminReservaView> listar() {
        Instant agora = clock.instant();
        return reservas.listar().stream().map(r -> AdminReservaView.de(r, agora)).toList();
    }

    @PostMapping("/reservas/{codigo}/confirmar")
    public AdminReservaView confirmar(@PathVariable String codigo) {
        return AdminReservaView.de(reservas.confirmar(codigo), clock.instant());
    }

    @PostMapping("/reservas/{codigo}/cancelar")
    public AdminReservaView cancelar(@PathVariable String codigo) {
        return AdminReservaView.de(reservas.cancelar(codigo), clock.instant());
    }

    @GetMapping(value = "/reservas.csv")
    public ResponseEntity<byte[]> csv() {
        Instant agora = clock.instant();
        StringBuilder sb = new StringBuilder("﻿");
        sb.append("Código;Status;Turma;Nome;E-mail;WhatsApp;Nível;Origem;Valor;Criada em;Paga em\n");
        for (Reserva r : reservas.listar()) {
            sb.append(String.join(";",
                    r.getCodigo(), r.statusEm(agora).name(), celula(r.getTurma().getNome()), celula(r.getNome()),
                    celula(r.getEmail()), r.getWhatsapp(), celula(r.getNivel()), celula(r.getOrigem()),
                    r.getValor().toPlainString().replace('.', ','), data(r.getCriadoEm()), data(r.getPagoEm())))
                    .append('\n');
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"reservas.csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(sb.toString().getBytes(StandardCharsets.UTF_8));
    }

    @GetMapping("/turmas")
    public List<AdminTurmaView> listarTurmas() {
        LocalDate hoje = reservas.hoje();
        Map<String, Long> ocupacao = reservas.ocupacao();
        return turmas.findAllOrdenadas().stream()
                .map(t -> AdminTurmaView.de(t, ocupacao.getOrDefault(t.getId(), 0L), hoje))
                .toList();
    }

    @PostMapping("/turmas")
    @Transactional
    public ResponseEntity<AdminTurmaView> criarTurma(@Valid @RequestBody TurmaForm form) {
        if (form.id() == null || form.id().isBlank()) {
            throw ApiException.campo("id", "Escolha um identificador, por exemplo turma-marco.");
        }
        if (turmas.existsById(form.id())) {
            throw ApiException.campo("id", "Já existe uma turma com esse identificador.");
        }
        Turma t = new Turma(form.id());
        aplicar(t, form);
        turmas.save(t);
        return ResponseEntity.status(HttpStatus.CREATED).body(AdminTurmaView.de(t, 0, reservas.hoje()));
    }

    @PutMapping("/turmas/{id}")
    @Transactional
    public AdminTurmaView editarTurma(@PathVariable String id, @Valid @RequestBody TurmaForm form) {
        Turma t = turmas.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Turma não encontrada."));
        aplicar(t, form);
        return AdminTurmaView.de(t, reservas.ocupacao().getOrDefault(id, 0L), reservas.hoje());
    }

    private static void aplicar(Turma t, TurmaForm f) {
        if (f.fim().isBefore(f.inicio())) {
            throw ApiException.campo("fim", "O último encontro precisa ser depois do primeiro.");
        }
        t.setNome(f.nome().trim());
        t.setInicio(f.inicio());
        t.setFim(f.fim());
        t.setDias(f.dias().trim());
        t.setHorario(f.horario().trim());
        t.setVagas(f.vagas());
        t.setPreco(f.preco());
        t.setSelo(f.selo() == null ? "" : f.selo().trim());
        t.setAtiva(f.ativa() == null || f.ativa());
    }

    private static long contar(List<Reserva> lista, StatusReserva status, Instant agora) {
        return lista.stream().filter(r -> r.statusEm(agora) == status).count();
    }

    private static BigDecimal somar(List<Reserva> lista, StatusReserva status, Instant agora) {
        return lista.stream().filter(r -> r.statusEm(agora) == status)
                .map(Reserva::getValor).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Evita que planilhas interpretem o texto como fórmula e escapa o separador. */
    private static String celula(String texto) {
        String t = texto == null ? "" : texto.replace("\"", "\"\"").replace("\n", " ");
        if (!t.isEmpty() && "=+-@".indexOf(t.charAt(0)) >= 0) {
            t = "'" + t;
        }
        return "\"" + t + "\"";
    }

    private String data(Instant instante) {
        return instante == null ? "" : DATA_HORA.format(instante.atZone(props.fuso()));
    }
}
