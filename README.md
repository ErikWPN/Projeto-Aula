# Site da mentoria (GitHub Pages)

Site estático para apresentar a mentoria, escolher a turma, gerar o Pix com valor e código da reserva e enviar o comprovante pelo WhatsApp.

**Para quem é:** quem vai publicar e manter o site (você). Não precisa saber programar para editar `config.js`.

## Arquivos

| Arquivo | Para que serve |
| --- | --- |
| `index.html` | A página. Não precisa mexer. |
| `config.js` | Nome, mentor, turmas, preços, ementa, FAQ, chave Pix e WhatsApp. **Edite só este.** |
| `README.md` | Este guia. |

## 1. Configurar

Abra `config.js` e troque:

1. `whatsapp`: número que recebe os comprovantes, só dígitos com 55 + DDD (ex.: `5511912345678`).
2. `pix.chave`, `pix.nomeRecebedor`, `pix.cidade`: dados da conta que recebe. Enquanto a chave tiver a palavra "exemplo", o site mostra um aviso de demonstração e um selo "não pague" no QR code.
3. `turmas`: datas no formato `AAAA-MM-DD`, `vagas` e `preco`. Turmas com data final no passado aparecem como "Encerrada"; com `vagas: 0`, como "Esgotada".
4. `titulo`, `chamada`, `mentor`, `ementa`, `faq`: textos da página. No `titulo`, o trecho entre `*asteriscos*` aparece com destaque. Para usar foto, envie a imagem para o repositório e ponha o nome do arquivo em `mentor.foto`.
5. Opcional: `linkCartao` com um link de pagamento do Mercado Pago, InfinitePay ou similar.

**Teste o Pix antes de divulgar:** coloque uma turma de teste com `preco: 1`, gere o pagamento e pague pelo app do banco. Confira se o nome do recebedor aparece certo.

## 2. Publicar no GitHub Pages

1. Crie um repositório público no GitHub (ex.: `mentoria`).
2. Clique em **Add file → Upload files**, envie `index.html`, `config.js` e `README.md` e confirme com **Commit changes**.
3. Vá em **Settings → Pages**. Em *Build and deployment*, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)` e salve.
4. Em 1 a 2 minutos o site fica em `https://SEU-USUARIO.github.io/mentoria/`.

Para atualizar vagas ou preço depois, edite `config.js` direto no GitHub (ícone de lápis) e faça commit. O site atualiza sozinho em cerca de 1 minuto.

Domínio próprio (opcional): em **Settings → Pages → Custom domain**, informe o domínio e crie um registro CNAME apontando para `SEU-USUARIO.github.io` no provedor do domínio.

## 3. Opcional: guardar as reservas numa planilha

Sem isso, as reservas chegam só pelo WhatsApp. Com isso, cada reserva vira uma linha no Google Sheets.

1. Crie uma planilha no Google Sheets e abra **Extensões → Apps Script**.
2. Apague o conteúdo e cole:

```js
function doPost(e) {
  var aba = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (aba.getLastRow() === 0) {
    aba.appendRow(["Criado em", "Código", "Turma", "Valor", "Nome", "E-mail", "WhatsApp", "Nível", "Origem", "Pago?"]);
  }
  var d = JSON.parse(e.postData.contents);
  aba.appendRow([d.criadoEm, d.codigo, d.turma, d.valor, d.nome, d.email, d.whatsapp, d.nivel, d.origem, "não"]);
  return ContentService.createTextOutput("ok");
}
```

3. Clique em **Implantar → Nova implantação → Tipo: App da Web**. Executar como: *Eu*. Quem pode acessar: *Qualquer pessoa*. Autorize.
4. Copie a URL que termina em `/exec` e cole em `registroUrl` no `config.js`.

Quando o comprovante chegar no WhatsApp, procure o código da reserva na planilha e marque "Pago?" como "sim".

## Detalhes

- Tema claro e escuro: segue o sistema do visitante, e o botão de lua no topo alterna e lembra a escolha.
- O gerador de QR code está embutido no `index.html`, então o Pix funciona mesmo se algum CDN cair.

## Limites deste site

- O pagamento é conferido à mão: o site gera o Pix, mas não tem como saber sozinho que ele foi pago. Por isso o comprovante vai pelo WhatsApp.
- O número de vagas é o que está em `config.js`. Diminua manualmente a cada pagamento confirmado.
- Para confirmação automática seria preciso um checkout com servidor (Mercado Pago, Asaas, Stripe). O campo `linkCartao` já aceita um link desses.
