package br.com.primeirocommit.mentoria.api;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record TurmaForm(
        @Pattern(regexp = "^[a-z0-9-]{2,40}$", message = "Use de 2 a 40 letras minúsculas, números ou hífen.")
        String id,

        @NotBlank(message = "Dê um nome para a turma.")
        @Size(max = 80, message = "Use até 80 caracteres.")
        String nome,

        @NotNull(message = "Informe a data do primeiro encontro.")
        LocalDate inicio,

        @NotNull(message = "Informe a data do último encontro.")
        LocalDate fim,

        @NotBlank(message = "Informe os dias, por exemplo Seg e qua.")
        @Size(max = 60, message = "Use até 60 caracteres.")
        String dias,

        @NotBlank(message = "Informe o horário, por exemplo 19h30 às 21h30.")
        @Size(max = 60, message = "Use até 60 caracteres.")
        String horario,

        @NotNull(message = "Informe o número de vagas.")
        @Min(value = 0, message = "Use 0 ou mais vagas.")
        @Max(value = 500, message = "Use até 500 vagas.")
        Integer vagas,

        @NotNull(message = "Informe o preço.")
        @DecimalMin(value = "1.00", message = "O preço mínimo é R$ 1,00.")
        @DecimalMax(value = "99999.99", message = "Preço alto demais.")
        @Digits(integer = 5, fraction = 2, message = "Use no máximo 2 casas decimais.")
        BigDecimal preco,

        @Size(max = 40, message = "Use até 40 caracteres.")
        String selo,

        Boolean ativa) {
}
