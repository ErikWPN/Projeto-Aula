package br.com.primeirocommit.mentoria.config;

import java.time.ZoneId;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Textos e dados de contato do site. Tudo que o mentor edita sem mexer em código
 * fica em application.yml (ou em variáveis de ambiente), sob o prefixo "mentoria".
 */
@ConfigurationProperties(prefix = "mentoria")
public record MentoriaProperties(
        String nome,
        String titulo,
        String chamada,
        String formato,
        String publico,
        String whatsapp,
        @DefaultValue("") String linkCartao,
        @DefaultValue("24") int reservaHoras,
        @DefaultValue("America/Sao_Paulo") ZoneId fuso,
        Mentor mentor,
        Pix pix,
        Admin admin,
        @DefaultValue("O que você vai aprender") String ementaTitulo,
        @DefaultValue("") String ementaIntro,
        List<Encontro> ementa,
        List<Pergunta> faq,
        List<String> niveis,
        List<String> origens) {

    public record Mentor(String nome, String cargo, String bio, @DefaultValue("") String foto) {
    }

    public record Pix(String chave, String nomeRecebedor, String cidade) {
    }

    public record Admin(@DefaultValue("admin") String usuario, @DefaultValue("") String senha) {
    }

    public record Encontro(String titulo, String topicos) {
    }

    public record Pergunta(String pergunta, String resposta) {
    }

    /** Enquanto a chave Pix for de exemplo, o site avisa que é demonstração. */
    public boolean demo() {
        return pix == null || pix.chave() == null || pix.chave().toLowerCase().contains("exemplo");
    }
}
