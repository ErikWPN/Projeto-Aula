package br.com.primeirocommit.mentoria.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record NovaReservaRequest(
        @NotBlank(message = "Escolha uma turma.")
        String turmaId,

        @NotBlank(message = "Escreva seu nome completo.")
        @Size(max = 120, message = "Use até 120 letras.")
        @Pattern(regexp = "^\\s*\\S+(\\s+\\S+)+\\s*$", message = "Escreva nome e sobrenome.")
        String nome,

        @NotBlank(message = "Escreva seu e-mail.")
        @Size(max = 160, message = "Use até 160 caracteres.")
        @Email(message = "Confira o e-mail, por exemplo nome@gmail.com.")
        @Pattern(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", message = "Confira o e-mail, por exemplo nome@gmail.com.")
        String email,

        @NotBlank(message = "Escreva seu WhatsApp com DDD.")
        @Size(max = 25, message = "Use DDD e número, por exemplo (11) 91234-5678.")
        String whatsapp,

        @NotBlank(message = "Conte em que momento você está.")
        String nivel,

        @NotBlank(message = "Conte como conheceu a mentoria.")
        String origem) {
}
