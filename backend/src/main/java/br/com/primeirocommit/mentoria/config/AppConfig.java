package br.com.primeirocommit.mentoria.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AppConfig implements WebMvcConfigurer {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    /** Rotas do React: o servidor entrega o index.html e o roteador do navegador cuida do resto. */
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/admin").setViewName("forward:/index.html");
        registry.addViewController("/reserva/{codigo}").setViewName("forward:/index.html");
    }
}
