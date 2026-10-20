// Aplica o tema salvo antes do React carregar, para a página não piscar.
try {
  var t = localStorage.getItem("pc-tema");
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
} catch (e) {}
