package br.com.primeirocommit.mentoria.api;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import br.com.primeirocommit.mentoria.config.MentoriaProperties;
import br.com.primeirocommit.mentoria.pix.PixBrCode;
import br.com.primeirocommit.mentoria.reserva.Reserva;
import br.com.primeirocommit.mentoria.reserva.StatusReserva;
import br.com.primeirocommit.mentoria.turma.SituacaoTurma;
import br.com.primeirocommit.mentoria.turma.Turma;

/** Formatos de resposta da API. Entidades nunca saem direto para o navegador. */
public final class Views {

    private Views() {
    }

    public record TurmaView(String id, String nome, LocalDate inicio, LocalDate fim, String dias, String horario,
            BigDecimal preco, String selo, int vagas, long vagasLivres, SituacaoTurma situacao) {

        static TurmaView de(Turma t, long ocupadas, LocalDate hoje) {
            long livres = Math.max(0, t.getVagas() - ocupadas);
            return new TurmaView(t.getId(), t.getNome(), t.getInicio(), t.getFim(), t.getDias(), t.getHorario(),
                    t.getPreco(), t.getSelo() == null ? "" : t.getSelo(), t.getVagas(), livres, t.situacao(hoje, livres));
        }
    }

    public record SiteView(String nome, String titulo, String chamada, String formato, String publico,
            String whatsapp, String linkCartao, boolean demo, int reservaHoras, MentoriaProperties.Mentor mentor,
            String ementaTitulo, String ementaIntro, List<MentoriaProperties.Encontro> ementa, List<MentoriaProperties.Pergunta> faq, List<String> niveis,
            List<String> origens, List<TurmaView> turmas, BigDecimal precoMinimo) {
    }

    public record TurmaResumo(String id, String nome, LocalDate inicio, LocalDate fim, String dias, String horario) {

        static TurmaResumo de(Turma t) {
            return new TurmaResumo(t.getId(), t.getNome(), t.getInicio(), t.getFim(), t.getDias(), t.getHorario());
        }
    }

    public record ReservaView(String codigo, StatusReserva status, TurmaResumo turma, String nome, BigDecimal valor,
            String pixCopiaECola, Instant criadoEm, Instant expiraEm, Instant pagoEm, boolean demo) {

        static ReservaView de(Reserva r, MentoriaProperties props, Instant agora) {
            StatusReserva status = r.statusEm(agora);
            String pix = status == StatusReserva.PENDENTE
                    ? PixBrCode.gerar(props.pix().chave(), props.pix().nomeRecebedor(), props.pix().cidade(),
                            r.getValor(), r.getCodigo())
                    : null;
            return new ReservaView(r.getCodigo(), status, TurmaResumo.de(r.getTurma()), r.getNome(), r.getValor(),
                    pix, r.getCriadoEm(), r.getExpiraEm(), r.getPagoEm(), props.demo());
        }
    }

    public record AdminReservaView(String codigo, StatusReserva status, String turmaId, String turmaNome, String nome,
            String email, String whatsapp, String nivel, String origem, BigDecimal valor, Instant criadoEm,
            Instant expiraEm, Instant pagoEm, Instant canceladoEm) {

        static AdminReservaView de(Reserva r, Instant agora) {
            return new AdminReservaView(r.getCodigo(), r.statusEm(agora), r.getTurma().getId(), r.getTurma().getNome(),
                    r.getNome(), r.getEmail(), r.getWhatsapp(), r.getNivel(), r.getOrigem(), r.getValor(),
                    r.getCriadoEm(), r.getExpiraEm(), r.getPagoEm(), r.getCanceladoEm());
        }
    }

    public record AdminTurmaView(String id, String nome, LocalDate inicio, LocalDate fim, String dias, String horario,
            BigDecimal preco, String selo, int vagas, long ocupadas, SituacaoTurma situacao, boolean ativa) {

        static AdminTurmaView de(Turma t, long ocupadas, LocalDate hoje) {
            return new AdminTurmaView(t.getId(), t.getNome(), t.getInicio(), t.getFim(), t.getDias(), t.getHorario(),
                    t.getPreco(), t.getSelo() == null ? "" : t.getSelo(), t.getVagas(), ocupadas,
                    t.situacao(hoje, t.getVagas() - ocupadas), t.isAtiva());
        }
    }

    public record ResumoView(long reservas, long pendentes, long pagas, long expiradas, long canceladas,
            BigDecimal receitaConfirmada, BigDecimal receitaPendente, long vagasLivres, boolean demo) {
    }
}
