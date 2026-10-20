package br.com.primeirocommit.mentoria.turma;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface TurmaRepository extends JpaRepository<Turma, String> {

    @Query("select t from Turma t order by t.inicio, t.id")
    List<Turma> findAllOrdenadas();

    /** Trava a linha da turma para que duas reservas simultâneas não peguem a mesma última vaga. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Turma t where t.id = :id")
    Optional<Turma> findParaReservar(String id);
}
