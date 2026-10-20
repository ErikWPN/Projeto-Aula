package br.com.primeirocommit.mentoria.reserva;

import java.math.BigDecimal;
import java.time.Instant;

import br.com.primeirocommit.mentoria.turma.Turma;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "reserva")
public class Reserva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String codigo;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "turma_id")
    private Turma turma;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String whatsapp;

    @Column(nullable = false)
    private String nivel;

    @Column(nullable = false)
    private String origem;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusReserva status = StatusReserva.PENDENTE;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "expira_em", nullable = false)
    private Instant expiraEm;

    @Column(name = "pago_em")
    private Instant pagoEm;

    @Column(name = "cancelado_em")
    private Instant canceladoEm;

    protected Reserva() {
    }

    public Reserva(String codigo, Turma turma, String nome, String email, String whatsapp, String nivel,
            String origem, Instant criadoEm, Instant expiraEm) {
        this.codigo = codigo;
        this.turma = turma;
        this.nome = nome;
        this.email = email;
        this.whatsapp = whatsapp;
        this.nivel = nivel;
        this.origem = origem;
        this.valor = turma.getPreco();
        this.criadoEm = criadoEm;
        this.expiraEm = expiraEm;
    }

    /** Situação vista por quem consulta agora: uma pendente vencida já conta como expirada. */
    public StatusReserva statusEm(Instant agora) {
        if (status == StatusReserva.PENDENTE && !expiraEm.isAfter(agora)) {
            return StatusReserva.EXPIRADA;
        }
        return status;
    }

    public void confirmarPagamento(Instant agora) {
        if (status == StatusReserva.CANCELADA || status == StatusReserva.PAGA) {
            throw new IllegalStateException("Só dá para confirmar reservas pendentes ou expiradas.");
        }
        status = StatusReserva.PAGA;
        pagoEm = agora;
    }

    public void cancelar(Instant agora) {
        if (status == StatusReserva.CANCELADA) {
            throw new IllegalStateException("Esta reserva já está cancelada.");
        }
        status = StatusReserva.CANCELADA;
        canceladoEm = agora;
    }

    public void expirar() {
        if (status == StatusReserva.PENDENTE) {
            status = StatusReserva.EXPIRADA;
        }
    }

    public Long getId() {
        return id;
    }

    public String getCodigo() {
        return codigo;
    }

    public Turma getTurma() {
        return turma;
    }

    public String getNome() {
        return nome;
    }

    public String getEmail() {
        return email;
    }

    public String getWhatsapp() {
        return whatsapp;
    }

    public String getNivel() {
        return nivel;
    }

    public String getOrigem() {
        return origem;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public StatusReserva getStatus() {
        return status;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getExpiraEm() {
        return expiraEm;
    }

    public Instant getPagoEm() {
        return pagoEm;
    }

    public Instant getCanceladoEm() {
        return canceladoEm;
    }
}
