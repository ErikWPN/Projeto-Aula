// Junta o build da apresentação numa página única: CSS e JS embutidos, fonte do Google Fonts.
// Saída: dist-apresentacao/mentoria.html, pronta para hospedar sem servidor.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = new URL("../dist-apresentacao/", import.meta.url).pathname;
const html = readFileSync(join(dir, "index.html"), "utf8");

const arquivo = (re, tipo) => {
  const m = html.match(re);
  if (!m) throw new Error(`Não achei o ${tipo} no index.html do build`);
  return readFileSync(join(dir, m[1]), "utf8");
};

// As fontes empacotadas pelo Vite saem; a Recursive vem do Google Fonts com os mesmos eixos.
const css = arquivo(/<link rel="stylesheet"[^>]*href="\.\/([^"]+\.css)"/, "CSS").replace(/@font-face\{[^}]*\}/g, "");
const js = arquivo(/<script type="module"[^>]*src="\.\/([^"]+\.js)"/, "JavaScript").replace(/<\/script/gi, "<\\/script");
const tema = readFileSync(new URL("../public/tema.js", import.meta.url), "utf8");

const pagina = `<title>Mentoria Primeiro Commit</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Mentoria de TI básica e lógica de programação do zero, ao vivo e em turma pequena.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Recursive:slnt,wght,CASL,CRSV,MONO@-15..0,300..1000,0..1,0..1,0..1&display=swap">
<script>${tema}</script>
<style>${css}</style>
<div id="root"></div>
<noscript>Ative o JavaScript para ver as turmas e o agendamento.</noscript>
<script type="module">${js}</script>
`;

writeFileSync(join(dir, "mentoria.html"), pagina);
console.log(`mentoria.html: ${(pagina.length / 1024).toFixed(0)} KB`);
