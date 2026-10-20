package br.com.primeirocommit.mentoria.reserva;

public enum StatusReserva {
    /** Pix gerado, aguardando o comprovante. Segura a vaga até expirar. */
    PENDENTE,
    /** Pagamento conferido pelo mentor. */
    PAGA,
    /** Passou do prazo sem pagamento; a vaga voltou para a turma. */
    EXPIRADA,
    /** Cancelada pelo mentor. */
    CANCELADA
}
