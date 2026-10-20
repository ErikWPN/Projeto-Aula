package br.com.primeirocommit.mentoria.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Aceita DATABASE_URL no formato que Neon, Render, Railway e Supabase entregam
 * (postgresql://usuario:senha@host/banco?sslmode=require) e converte para o formato JDBC
 * que o Spring usa. Uma URL que já começa com jdbc: passa direto.
 */
public class BancoDaNuvem implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication app) {
        String url = env.getProperty("DATABASE_URL");
        if (url == null || !(url.startsWith("postgres://") || url.startsWith("postgresql://"))) {
            return;
        }
        env.getPropertySources().addFirst(new MapPropertySource("database-url-convertida", converter(url)));
    }

    static Map<String, Object> converter(String url) {
        URI uri = URI.create(url.trim());
        StringBuilder jdbc = new StringBuilder("jdbc:postgresql://").append(uri.getHost());
        if (uri.getPort() > 0) {
            jdbc.append(':').append(uri.getPort());
        }
        jdbc.append(uri.getRawPath() == null || uri.getRawPath().isEmpty() ? "/postgres" : uri.getRawPath());

        // channel_binding é um parâmetro do libpq que o driver JDBC não usa.
        String consulta = uri.getRawQuery() == null ? "" : Arrays.stream(uri.getRawQuery().split("&"))
                .filter(p -> !p.isBlank() && !p.startsWith("channel_binding="))
                .collect(Collectors.joining("&"));
        if (!consulta.isEmpty()) {
            jdbc.append('?').append(consulta);
        }

        Map<String, Object> props = new HashMap<>();
        props.put("spring.datasource.url", jdbc.toString());
        String usuarioSenha = uri.getRawUserInfo();
        if (usuarioSenha != null && !usuarioSenha.isEmpty()) {
            int dois = usuarioSenha.indexOf(':');
            String usuario = dois < 0 ? usuarioSenha : usuarioSenha.substring(0, dois);
            props.put("spring.datasource.username", URLDecoder.decode(usuario, StandardCharsets.UTF_8));
            if (dois >= 0) {
                props.put("spring.datasource.password",
                        URLDecoder.decode(usuarioSenha.substring(dois + 1), StandardCharsets.UTF_8));
            }
        }
        return props;
    }
}
