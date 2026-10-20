package br.com.primeirocommit.mentoria.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class BancoDaNuvemTest {

    @Test
    void converteUrlDoNeonParaJdbc() {
        Map<String, Object> p = BancoDaNuvem.converter(
                "postgresql://mentoria_owner:s3nh%40forte@ep-cool-123.sa-east-1.aws.neon.tech/mentoria?sslmode=require&channel_binding=require");
        assertThat(p).containsEntry("spring.datasource.url",
                "jdbc:postgresql://ep-cool-123.sa-east-1.aws.neon.tech/mentoria?sslmode=require");
        assertThat(p).containsEntry("spring.datasource.username", "mentoria_owner");
        assertThat(p).containsEntry("spring.datasource.password", "s3nh@forte");
    }

    @Test
    void mantemPortaEAceitaPrefixoPostgres() {
        Map<String, Object> p = BancoDaNuvem.converter("postgres://u:p@db.exemplo.com:6543/app");
        assertThat(p).containsEntry("spring.datasource.url", "jdbc:postgresql://db.exemplo.com:6543/app");
    }

    @Test
    void urlJdbcPassaDireto() {
        MockEnvironment env = new MockEnvironment().withProperty("DATABASE_URL", "jdbc:h2:mem:x");
        new BancoDaNuvem().postProcessEnvironment(env, null);
        assertThat(env.getPropertySources().contains("database-url-convertida")).isFalse();
    }

    @Test
    void urlDaNuvemTemPrioridadeSobreOApplicationYml() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("DATABASE_URL", "postgresql://u:p@h/b")
                .withProperty("spring.datasource.url", "jdbc:h2:file:./data/mentoria");
        new BancoDaNuvem().postProcessEnvironment(env, null);
        assertThat(env.getProperty("spring.datasource.url")).isEqualTo("jdbc:postgresql://h/b");
        assertThat(env.getProperty("spring.datasource.username")).isEqualTo("u");
    }
}
