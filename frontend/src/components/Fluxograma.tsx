import { useId } from "react";

export type Caminho = "nao" | "sim" | null;

interface Props {
  escolha: Caminho;
  onEscolher: (c: Exclude<Caminho, null>) => void;
}

/**
 * Um fluxograma como porta de entrada: a pessoa responde se já sabe que área de TI quer seguir,
 * o caminho acende e a resposta já fica marcada no formulário de agendamento.
 * Formas com significado: oval = início/fim, paralelogramo = entrada, losango = decisão, retângulo = processo.
 */
export function Fluxograma({ escolha, onEscolher }: Props) {
  const id = useId();
  const classe = (ramo: "nao" | "sim") => (escolha === null ? "" : escolha === ramo ? "ativo" : "apagado");
  const tronco = escolha ? "ativo" : "";

  return (
    <figure className="fluxo" data-escolha={escolha ?? "nenhuma"}>
      <svg viewBox="0 0 400 476" role="img" aria-labelledby={`${id}-t ${id}-d`}>
        <title id={`${id}-t`}>Fluxograma: seu caminho na TI</title>
        <desc id={`${id}-d`}>
          Início. Leia a resposta: você já sabe que área de TI quer seguir? Se não, conhecer todas as áreas. Se sim,
          testar e confirmar a escolha. Os dois caminhos terminam no seu plano de entrada na TI.
        </desc>

        <defs>
          <marker id={`${id}-seta`} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 10 5 0 10Z" className="fluxo__ponta" />
          </marker>
        </defs>

        <g className={`fluxo__no ${tronco}`} style={{ "--i": 0 } as React.CSSProperties}>
          <rect x="130" y="14" width="140" height="44" rx="22" />
          <text x="200" y="42">início</text>
        </g>

        <g className={`fluxo__no ${tronco}`} style={{ "--i": 1 } as React.CSSProperties}>
          <polygon points="128,90 304,90 272,140 96,140" />
          <text x="200" y="121">leia a resposta</text>
        </g>

        <g className={`fluxo__no fluxo__decisao ${tronco}`} style={{ "--i": 2 } as React.CSSProperties}>
          <polygon points="200,170 316,230 200,290 84,230" />
          <text x="200" y="236">já sabe a área?</text>
        </g>

        <g className={`fluxo__no ${classe("nao")}`} style={{ "--i": 3 } as React.CSSProperties}>
          <rect x="8" y="332" width="168" height="58" rx="3" />
          <text x="92" y="358">conhecer</text>
          <text x="92" y="378">todas as áreas</text>
        </g>

        <g className={`fluxo__no ${classe("sim")}`} style={{ "--i": 3 } as React.CSSProperties}>
          <rect x="224" y="332" width="168" height="58" rx="3" />
          <text x="308" y="358">testar e</text>
          <text x="308" y="378">confirmar</text>
        </g>

        <g className={`fluxo__no fluxo__fim ${escolha ? "ativo" : ""}`} style={{ "--i": 4 } as React.CSSProperties}>
          <rect x="96" y="422" width="208" height="46" rx="23" />
          <text x="200" y="451">plano de entrada</text>
        </g>

        <g className="fluxo__setas" markerEnd={`url(#${id}-seta)`}>
          <path className={`fluxo__seta ${tronco}`} d="M200 58V88" pathLength={1} style={{ "--i": 0 } as React.CSSProperties} />
          <path className={`fluxo__seta ${tronco}`} d="M200 140V168" pathLength={1} style={{ "--i": 1 } as React.CSSProperties} />
          <path className={`fluxo__seta ${classe("nao")}`} d="M84 230H54V330" pathLength={1} style={{ "--i": 2 } as React.CSSProperties} />
          <path className={`fluxo__seta ${classe("sim")}`} d="M316 230H346V330" pathLength={1} style={{ "--i": 2 } as React.CSSProperties} />
          <path className={`fluxo__seta ${classe("nao")}`} d="M92 390V404H176V420" pathLength={1} style={{ "--i": 3 } as React.CSSProperties} />
          <path className={`fluxo__seta ${classe("sim")}`} d="M308 390V404H224V420" pathLength={1} style={{ "--i": 3 } as React.CSSProperties} />
        </g>

        <text className={`fluxo__rotulo ${classe("nao")}`} x="40" y="218">
          não
        </text>
        <text className={`fluxo__rotulo ${classe("sim")}`} x="360" y="218">
          sim
        </text>
      </svg>

      <figcaption className="fluxo__pergunta">
        <span id={`${id}-p`} className="fluxo__enunciado">
          Já sabe que área de TI quer seguir?
        </span>
        <span className="fluxo__opcoes" role="group" aria-labelledby={`${id}-p`}>
          <button type="button" className="fluxo__opcao" aria-pressed={escolha === "nao"} onClick={() => onEscolher("nao")}>
            Ainda não
          </button>
          <button type="button" className="fluxo__opcao" aria-pressed={escolha === "sim"} onClick={() => onEscolher("sim")}>
            Tenho uma ideia
          </button>
        </span>
      </figcaption>
    </figure>
  );
}
