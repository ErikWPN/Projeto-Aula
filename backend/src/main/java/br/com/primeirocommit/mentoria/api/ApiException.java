package br.com.primeirocommit.mentoria.api;

import java.util.Map;

import org.springframework.http.HttpStatus;

/** Erro de regra de negócio com mensagem pronta para mostrar na tela. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final Map<String, String> campos;

    public ApiException(HttpStatus status, String mensagem) {
        this(status, mensagem, Map.of());
    }

    public ApiException(HttpStatus status, String mensagem, Map<String, String> campos) {
        super(mensagem);
        this.status = status;
        this.campos = campos;
    }

    public static ApiException campo(String campo, String mensagem) {
        return new ApiException(HttpStatus.BAD_REQUEST, "Confira os campos destacados.", Map.of(campo, mensagem));
    }

    public HttpStatus getStatus() {
        return status;
    }

    public Map<String, String> getCampos() {
        return campos;
    }
}
