package br.com.primeirocommit.mentoria.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;

import br.com.primeirocommit.mentoria.RelogioDeTeste;
import br.com.primeirocommit.mentoria.pix.PixBrCode;
import br.com.primeirocommit.mentoria.reserva.LimiteDeReservas;
import br.com.primeirocommit.mentoria.reserva.ReservaService;
import br.com.primeirocommit.mentoria.turma.TurmaRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class ApiTest {

    @TestConfiguration
    static class Relogio {
        @Bean
        @Primary
        RelogioDeTeste relogioDeTeste() {
            return new RelogioDeTeste();
        }
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    RelogioDeTeste relogio;

    @Autowired
    LimiteDeReservas limite;

    @Autowired
    TurmaRepository turmas;

    @Autowired
    ReservaService service;

    @BeforeEach
    void preparar() {
        relogio.definir(RelogioDeTeste.INICIAL);
        limite.limpar();
    }

    private static String corpo(String turma, String nome, String email, String whatsapp) {
        return """
                {"turmaId":"%s","nome":"%s","email":"%s","whatsapp":"%s",
                 "nivel":"Não sei por onde começar","origem":"Faculdade"}
                """.formatted(turma, nome, email, whatsapp);
    }

    private ResultActions reservar(String turma) throws Exception {
        return mvc.perform(post("/api/reservas").contentType(MediaType.APPLICATION_JSON)
                .content(corpo(turma, "Maria Souza", "Maria@Gmail.com", "(11) 91234-5678")));
    }

    private String codigoDe(ResultActions acoes) throws Exception {
        return JsonPath.read(acoes.andReturn().getResponse().getContentAsString(), "$.codigo");
    }

    @Test
    void siteTrazConteudoTurmasEPrecoMinimo() throws Exception {
        mvc.perform(get("/api/site"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("TI para Leigos"))
                .andExpect(jsonPath("$.demo").value(true))
                .andExpect(jsonPath("$.turmas", hasSize(3)))
                .andExpect(jsonPath("$.turmas[0].id").value("piloto"))
                .andExpect(jsonPath("$.turmas[0].vagasLivres").value(12))
                .andExpect(jsonPath("$.turmas[0].situacao").value("ABERTA"))
                .andExpect(jsonPath("$.precoMinimo").value(97.0))
                .andExpect(jsonPath("$.ementa", hasSize(5)))
                .andExpect(jsonPath("$.ementaTitulo").value("Fundamentos inegociáveis da Computação"));
    }

    @Test
    void criaReservaComPixValidoEOcupaVaga() throws Exception {
        ResultActions r = reservar("piloto")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.codigo", startsWith("PC")))
                .andExpect(jsonPath("$.status").value("PENDENTE"))
                .andExpect(jsonPath("$.valor").value(97.0))
                .andExpect(jsonPath("$.turma.nome").value("Turma piloto"))
                .andExpect(jsonPath("$.expiraEm").value("2026-10-21T15:00:00Z"));

        String json = r.andReturn().getResponse().getContentAsString();
        String codigo = JsonPath.read(json, "$.codigo");
        String pix = JsonPath.read(json, "$.pixCopiaECola");
        assertThat(codigo).matches("PC[A-Z2-9]{8}");
        assertThat(pix).contains("05" + String.format("%02d", codigo.length()) + codigo);
        assertThat(pix.substring(pix.length() - 4)).isEqualTo(PixBrCode.crc16(pix.substring(0, pix.length() - 4)));

        mvc.perform(get("/api/site")).andExpect(jsonPath("$.turmas[0].vagasLivres").value(11));
        mvc.perform(get("/api/reservas/" + codigo.toLowerCase()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Maria Souza"));
    }

    @Test
    void validaCamposComMensagensPorCampo() throws Exception {
        mvc.perform(post("/api/reservas").contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("piloto", "Maria", "maria@", "1234")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.nome").value("Escreva nome e sobrenome."))
                .andExpect(jsonPath("$.campos.email").exists());

        mvc.perform(post("/api/reservas").contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("piloto", "Maria Souza", "maria@gmail.com", "1234")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.whatsapp").exists());

        mvc.perform(post("/api/reservas").contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("nao-existe", "Maria Souza", "maria@gmail.com", "11912345678")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.turmaId").exists());
    }

    @Test
    void recusaQuandoAcabamAsVagas() throws Exception {
        turmas.findById("piloto").orElseThrow().setVagas(1);
        reservar("piloto").andExpect(status().isCreated());
        reservar("piloto")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensagem", startsWith("A última vaga")))
                .andExpect(jsonPath("$.campos.turmaId", startsWith("A última vaga")));
        mvc.perform(get("/api/site")).andExpect(jsonPath("$.turmas[0].situacao").value("ESGOTADA"));
    }

    @Test
    void reservaVencidaExpiraELiberaAVaga() throws Exception {
        turmas.findById("piloto").orElseThrow().setVagas(1);
        String codigo = codigoDe(reservar("piloto").andExpect(status().isCreated()));

        relogio.avancar(Duration.ofHours(25));
        mvc.perform(get("/api/reservas/" + codigo))
                .andExpect(jsonPath("$.status").value("EXPIRADA"))
                .andExpect(jsonPath("$.pixCopiaECola").doesNotExist());
        mvc.perform(get("/api/site")).andExpect(jsonPath("$.turmas[0].situacao").value("ABERTA"));

        assertThat(service.expirarVencidas()).isEqualTo(1);
        reservar("piloto").andExpect(status().isCreated());
    }

    @Test
    void inscricoesFecham_depoisDoPrimeiroEncontro() throws Exception {
        relogio.definir(Instant.parse("2026-11-22T12:00:00Z"));
        reservar("piloto").andExpect(status().isConflict()).andExpect(jsonPath("$.campos.turmaId").exists());
        mvc.perform(get("/api/site"))
                .andExpect(jsonPath("$.turmas[0].situacao").value("ENCERRADA"))
                .andExpect(jsonPath("$.precoMinimo").value(147.0));
    }

    @Test
    void limitaReservasSeguidasDoMesmoIp() throws Exception {
        for (int i = 0; i < 10; i++) {
            reservar("ferias").andExpect(status().isCreated());
        }
        reservar("ferias").andExpect(status().isTooManyRequests());
    }

    @Test
    void reservaInexistenteDa404ComMensagem() throws Exception {
        mvc.perform(get("/api/reservas/PCZZZZZZZZ"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensagem", startsWith("Não encontramos")));
    }

    @Test
    void adminExigeSenhaSemAbrirJanelaDoNavegador() throws Exception {
        mvc.perform(get("/api/admin/resumo"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist("WWW-Authenticate"));
        mvc.perform(get("/api/admin/resumo").with(httpBasic("admin", "errada")))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/sessao").with(httpBasic("admin", "teste")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usuario").value("admin"));
    }

    @Test
    void adminConfirmaCancelaFiltraEExporta() throws Exception {
        String a = codigoDe(reservar("piloto"));
        String b = codigoDe(reservar("ferias"));

        mvc.perform(post("/api/admin/reservas/" + a + "/confirmar").with(httpBasic("admin", "teste")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAGA"));
        mvc.perform(post("/api/admin/reservas/" + a + "/confirmar").with(httpBasic("admin", "teste")))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/admin/reservas/" + b + "/cancelar").with(httpBasic("admin", "teste")))
                .andExpect(jsonPath("$.status").value("CANCELADA"));

        mvc.perform(get("/api/admin/reservas").with(httpBasic("admin", "teste")))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[?(@.codigo == '" + a + "')].status").value("PAGA"))
                .andExpect(jsonPath("$[?(@.codigo == '" + a + "')].email").value("maria@gmail.com"))
                .andExpect(jsonPath("$[?(@.codigo == '" + a + "')].whatsapp").value("5511912345678"));

        mvc.perform(get("/api/admin/resumo").with(httpBasic("admin", "teste")))
                .andExpect(jsonPath("$.pagas").value(1))
                .andExpect(jsonPath("$.canceladas").value(1))
                .andExpect(jsonPath("$.receitaConfirmada").value(97.0));

        mvc.perform(get("/api/admin/reservas.csv").with(httpBasic("admin", "teste")))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Código;Status;Turma")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString(a + ";PAGA;\"Turma piloto\"")));
    }

    @Test
    void adminCriaEEditaTurma() throws Exception {
        String nova = """
                {"id":"mar27","nome":"Turma de março","inicio":"2027-03-29","fim":"2027-04-21",
                 "dias":"Seg e qua","horario":"19h30 às 21h30","vagas":10,"preco":177.5,"selo":"","ativa":true}
                """;
        mvc.perform(post("/api/admin/turmas").with(httpBasic("admin", "teste"))
                        .contentType(MediaType.APPLICATION_JSON).content(nova))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.situacao").value("ABERTA"));
        mvc.perform(post("/api/admin/turmas").with(httpBasic("admin", "teste"))
                        .contentType(MediaType.APPLICATION_JSON).content(nova))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.id").exists());

        String invalida = nova.replace("\"fim\":\"2027-04-21\"", "\"fim\":\"2027-03-01\"");
        mvc.perform(put("/api/admin/turmas/mar27").with(httpBasic("admin", "teste"))
                        .contentType(MediaType.APPLICATION_JSON).content(invalida))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.fim").exists());

        String inativa = nova.replace("\"ativa\":true", "\"ativa\":false");
        mvc.perform(put("/api/admin/turmas/mar27").with(httpBasic("admin", "teste"))
                        .contentType(MediaType.APPLICATION_JSON).content(inativa))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.situacao").value("ENCERRADA"));
        mvc.perform(get("/api/site")).andExpect(jsonPath("$.turmas", hasSize(3)));
    }

    @Test
    void confirmarReservaVencidaNaoLotaATurmaAlemDoLimite() throws Exception {
        turmas.findById("piloto").orElseThrow().setVagas(1);
        String vencida = codigoDe(reservar("piloto"));
        relogio.avancar(Duration.ofHours(25));
        reservar("piloto").andExpect(status().isCreated());

        mvc.perform(post("/api/admin/reservas/" + vencida + "/confirmar").with(httpBasic("admin", "teste")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensagem", startsWith("A Turma piloto está cheia")));

        turmas.findById("piloto").orElseThrow().setVagas(2);
        mvc.perform(post("/api/admin/reservas/" + vencida + "/confirmar").with(httpBasic("admin", "teste")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAGA"));
    }

    @Test
    void errosDeRequisicaoMantemOStatusCerto() throws Exception {
        mvc.perform(post("/api/reservas").contentType(MediaType.TEXT_PLAIN).content("oi"))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(put("/api/reservas/PCZZZZZZZZ"))
                .andExpect(status().isMethodNotAllowed());
        mvc.perform(post("/api/reservas").contentType(MediaType.APPLICATION_JSON).content("{quebrado"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/nao-existe"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensagem").value("Endereço não encontrado."));
    }

    @Test
    void naoConfiaEmXForwardedForPorPadrao() throws Exception {
        for (int i = 0; i < 10; i++) {
            reservar("ferias");
        }
        mvc.perform(post("/api/reservas").header("X-Forwarded-For", "203.0.113.9")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("ferias", "Maria Souza", "maria@gmail.com", "11912345678")))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void cabecalhosDeSeguranca() throws Exception {
        mvc.perform(get("/api/site"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().exists("Content-Security-Policy"));
    }
}
