import { Link } from "react-router";

export function NaoEncontrada() {
  return (
    <section className="wrap pagina-curta">
      <h1>Esta página não existe.</h1>
      <p className="lead">O endereço pode ter sido digitado errado. As turmas e o agendamento estão na página inicial.</p>
      <Link className="btn" to="/">
        Ir para a página inicial
      </Link>
    </section>
  );
}
