package br.com.primeirocommit.mentoria.api;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    public record Erro(String mensagem, Map<String, String> campos) {
    }

    @ExceptionHandler(ApiException.class)
    ResponseEntity<Erro> api(ApiException e) {
        return ResponseEntity.status(e.getStatus()).body(new Erro(e.getMessage(), e.getCampos()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Erro> validacao(MethodArgumentNotValidException e) {
        Map<String, String> campos = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors()
                .forEach(f -> campos.putIfAbsent(f.getField(), f.getDefaultMessage()));
        return ResponseEntity.badRequest().body(new Erro("Confira os campos destacados.", campos));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Erro> corpoInvalido(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body(new Erro("Não foi possível ler os dados enviados.", Map.of()));
    }

    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<Erro> estado(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new Erro(e.getMessage(), Map.of()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<Erro> naoEncontrado(NoResourceFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new Erro("Endereço não encontrado.", Map.of()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Erro> inesperado(Exception e) {
        log.error("Erro inesperado", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new Erro("Algo deu errado do nosso lado. Tente de novo em instantes.", Map.of()));
    }
}
