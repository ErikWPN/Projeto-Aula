package br.com.primeirocommit.mentoria.turma;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "turma")
public class Turma {

    @Id
    private String id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private LocalDate inicio;

    @Column(nullable = false)
    private LocalDate fim;

    @Column(nullable = false)
    private String dias;

    @Column(nullable = false)
    private String horario;

    @Column(nullable = false)
    private int vagas;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal preco;

    private String selo;

    @Column(nullable = false)
    private boolean ativa = true;

    protected Turma() {
    }

    public Turma(String id) {
        this.id = id;
    }

    /** Inscrições ficam abertas até o dia do primeiro encontro, inclusive. */
    public SituacaoTurma situacao(LocalDate hoje, long vagasLivres) {
        if (!ativa || hoje.isAfter(inicio)) {
            return SituacaoTurma.ENCERRADA;
        }
        if (vagasLivres <= 0) {
            return SituacaoTurma.ESGOTADA;
        }
        return SituacaoTurma.ABERTA;
    }

    public String getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public LocalDate getInicio() {
        return inicio;
    }

    public void setInicio(LocalDate inicio) {
        this.inicio = inicio;
    }

    public LocalDate getFim() {
        return fim;
    }

    public void setFim(LocalDate fim) {
        this.fim = fim;
    }

    public String getDias() {
        return dias;
    }

    public void setDias(String dias) {
        this.dias = dias;
    }

    public String getHorario() {
        return horario;
    }

    public void setHorario(String horario) {
        this.horario = horario;
    }

    public int getVagas() {
        return vagas;
    }

    public void setVagas(int vagas) {
        this.vagas = vagas;
    }

    public BigDecimal getPreco() {
        return preco;
    }

    public void setPreco(BigDecimal preco) {
        this.preco = preco;
    }

    public String getSelo() {
        return selo;
    }

    public void setSelo(String selo) {
        this.selo = selo;
    }

    public boolean isAtiva() {
        return ativa;
    }

    public void setAtiva(boolean ativa) {
        this.ativa = ativa;
    }
}
