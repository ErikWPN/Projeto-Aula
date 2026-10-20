package br.com.primeirocommit.mentoria.reserva;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ReservaRepository extends JpaRepository<Reserva, Long> {

    Optional<Reserva> findByCodigo(String codigo);

    boolean existsByCodigo(String codigo);

    /** Reservas que ocupam vaga: pagas e pendentes ainda dentro do prazo. */
    @Query("""
            select count(r) from Reserva r
            where r.turma.id = :turmaId
              and (r.status = br.com.primeirocommit.mentoria.reserva.StatusReserva.PAGA
                   or (r.status = br.com.primeirocommit.mentoria.reserva.StatusReserva.PENDENTE and r.expiraEm > :agora))
            """)
    long contarOcupadas(String turmaId, Instant agora);

    @Query("""
            select r.turma.id as turmaId, count(r) as total from Reserva r
            where r.status = br.com.primeirocommit.mentoria.reserva.StatusReserva.PAGA
               or (r.status = br.com.primeirocommit.mentoria.reserva.StatusReserva.PENDENTE and r.expiraEm > :agora)
            group by r.turma.id
            """)
    List<OcupacaoTurma> ocupacaoPorTurma(Instant agora);

    @Query("select r from Reserva r order by r.criadoEm desc")
    List<Reserva> findAllRecentes();

    @Modifying
    @Query("""
            update Reserva r set r.status = br.com.primeirocommit.mentoria.reserva.StatusReserva.EXPIRADA
            where r.status = br.com.primeirocommit.mentoria.reserva.StatusReserva.PENDENTE and r.expiraEm <= :agora
            """)
    int expirarVencidas(Instant agora);

    interface OcupacaoTurma {
        String getTurmaId();

        long getTotal();
    }
}
