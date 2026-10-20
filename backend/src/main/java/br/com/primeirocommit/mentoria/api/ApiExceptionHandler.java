package br.com.primeirocommit.mentoria.api;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private static final ClassPathResource INDEX = new ClassPathResource("static/index.html");

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

    /**
     * Endereço desconhecido: a API responde JSON; páginas recebem o app React (com status 404),
     * que mostra a tela "Esta página não existe".
     */
    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<?> naoEncontrado(NoResourceFoundException e, HttpServletRequest request) throws IOException {
        if (!request.getRequestURI().startsWith("/api/") && INDEX.exists()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .contentType(MediaType.TEXT_HTML)
                    .cacheControl(CacheControl.noCache())
                    .body(INDEX.getContentAsByteArray());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new Erro("Endereço não encontrado.", Map.of()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Erro> inesperado(Exception e) {
        log.error("Erro inesperado", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new Erro("Algo deu errado do nosso lado. Tente de novo em instantes.", Map.of()));
    }
}
