/*
 * CONFIGURAÇÃO DA MENTORIA
 * Edite só este arquivo. Tudo que aparece no site sai daqui.
 * Enquanto a chave Pix tiver a palavra "exemplo", o site mostra um aviso de demonstração.
 */
window.MENTORIA = {
  nome: "Primeiro Commit",
  // Título grande do topo. O trecho entre *asteriscos* ganha destaque de marca-texto.
  titulo: "Entenda o computador e escreva seu *primeiro programa* sem decoreba.",
  chamada: "TI básica e lógica de programação do zero, ao vivo e em turma pequena.",

  mentor: {
    nome: "Anderson",
    titulo: "[Cargo do Anderson] · [anos] anos em TI",
    bio: "Trabalha com tecnologia todos os dias e já ajudou muita gente a dar os primeiros passos. Nas aulas, explica o porquê de cada coisa antes de mostrar o código.",
    foto: "" // opcional: caminho de uma imagem no repositório, ex.: "anderson.jpg"
  },

  formato: "Online e ao vivo pelo Google Meet",
  publico: "Calouros de cursos de TI e quem está migrando de área",

  // Contato que recebe os comprovantes (DDI + DDD + número, só dígitos)
  whatsapp: "5511900000000",

  pix: {
    chave: "chave-pix@exemplo.com", // e-mail, CPF/CNPJ, telefone (+55...) ou chave aleatória
    nomeRecebedor: "Anderson Exemplo",  // como aparece no banco (até 25 letras)
    cidade: "Sao Paulo"                 // até 15 letras
  },

  // Opcional: link de pagamento com cartão (Mercado Pago, InfinitePay, PagSeguro...). Deixe "" para esconder.
  linkCartao: "",

  // Opcional: URL do Google Apps Script que grava as reservas numa planilha (veja o README). Deixe "" para não usar.
  registroUrl: "",

  turmas: [
    {
      id: "piloto",
      nome: "Turma piloto",
      inicio: "2026-11-21",
      fim: "2026-12-12",
      dias: "4 sábados",
      horario: "9h às 11h",
      vagas: 12,
      preco: 97,
      selo: "Preço de lançamento"
    },
    {
      id: "ferias",
      nome: "Turma de férias",
      inicio: "2027-01-11",
      fim: "2027-01-22",
      dias: "Seg, qua e sex",
      horario: "19h30 às 21h30",
      vagas: 15,
      preco: 147,
      selo: ""
    },
    {
      id: "fev27",
      nome: "Turma de fevereiro",
      inicio: "2027-02-22",
      fim: "2027-03-17",
      dias: "Seg e qua",
      horario: "19h30 às 21h30",
      vagas: 15,
      preco: 197,
      selo: "Começo do semestre"
    }
  ],

  ementa: [
    {
      titulo: "Como o computador funciona",
      topicos: "Processador, memória, armazenamento, dispositivos de entrada e saída, sistema operacional, arquivos e pastas."
    },
    {
      titulo: "Redes e internet",
      topicos: "O que acontece quando você abre um site: IP, DNS, navegador e servidor. Cuidados básicos de segurança."
    },
    {
      titulo: "Lógica de programação",
      topicos: "Algoritmos, variáveis, tipos de dados, entrada e saída, condições (se / senão) com exercícios em Portugol."
    },
    {
      titulo: "Repetição e seu primeiro programa",
      topicos: "Laços, funções e um programa completo do zero, primeiro em Portugol e depois em Python."
    }
  ],

  faq: [
    {
      p: "Preciso saber alguma coisa antes?",
      r: "Não. A mentoria começa do zero. Se você sabe ligar o computador e usar o navegador, já pode participar."
    },
    {
      p: "O que eu preciso ter?",
      r: "Um computador com internet. Pelo celular dá para assistir, mas não para fazer os exercícios."
    },
    {
      p: "Como confirmo minha vaga?",
      r: "Pague o Pix gerado no fim do agendamento e envie o comprovante pelo WhatsApp. A vaga fica confirmada quando o pagamento é conferido, e você recebe o link do grupo da turma."
    },
    {
      p: "E se eu desistir?",
      r: "Você pode desistir em até 7 dias depois do pagamento e recebe o valor de volta (direito de arrependimento, art. 49 do Código de Defesa do Consumidor)."
    }
  ]
};
