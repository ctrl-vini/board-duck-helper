// Every text the student reads, in one place.

export const LOCALE = "pt-BR";

export const UI_TEXT = {
  boardLabel: "placa:",
  clearConversation: "limpar conversa",
  showBoard: "ver placa",
  about: "sobre",
  close: "fechar",
  boardPaneLabel: "Placa e ligações",
  // Commands the page answers by itself, without the model. The first name is the main one.
  commands: {
    help: ["help", "ajuda"],
    pinout: ["pinout"],
    // Clear-screen commands students may know: Unix shells, Windows cmd and PowerShell, MATLAB.
    clear: ["clear", "cls", "reset", "clear-host", "clc"],
    about: ["about", "sobre"],
    quack: ["quack"],
  },
  help: {
    title: "comandos que o pato entende:",
    headers: ["comando", "o que faz", "atalho"],
    entries: [
      { command: "help", description: "mostra esta lista" },
      { command: "pinout", description: "mostra a placa e como ligar cada componente", key: "p" },
      { command: "clear", description: "limpa a conversa e começa do zero", key: "l" },
      { command: "about", description: "mostra o sobre do Duckoder", key: "s" },
      { command: "quack", description: "o pato faz quack" },
    ],
    aliases: (names) => ` (também: ${names.join(", ")})`,
    keys: "enter envia o pedido; shift + enter quebra a linha",
  },
  clearDialogTitle: "Limpar a conversa?",
  clearDialogMessage:
    "As mensagens e o código saem da tela, e o pato esquece o que foi pedido até aqui.",
  clearDialogHint: "enter limpa, esc cancela",
  cancel: "cancelar",
  clear: "limpar",
  aboutDialog: {
    title: "Sobre o Duckoder",
    command: "duckoder --sobre",
    version: (version) => `versão ${version}`,
    description:
      "Plataforma web que gera código para placas didáticas a partir de pedidos em português, com um modelo de linguagem que roda na própria rede local.",
    details: [
      { label: "autor", value: "ctrl-vini", href: "https://github.com/ctrl-vini" },
      {
        label: "código",
        value: "github.com/ctrl-vini/board-duck-helper",
        href: "https://github.com/ctrl-vini/board-duck-helper",
      },
      { label: "fonte", value: "JetBrains Mono, sob a SIL Open Font License 1.1" },
    ],
    copyright: "© 2026 José Vinícius Alves de Oliveira. Todos os direitos reservados.",
  },
  wiringHeaders: ["componente", "pinos", "como ligar"],
  pinWithRole: (gpio, role) => (role ? `GPIO ${gpio} (${role})` : `GPIO ${gpio}`),
  usageWithRole: (name, role) => (role ? `${name} (${role})` : name),
  noPinout: "esta placa não tem a pinagem cadastrada; veja só a tabela de ligações",
  requestLabel: "O que a placa deve fazer?",
  send: "enviar",
  sendHint: "enter envia, shift + enter quebra a linha",
  promptUser: "aluno@lab",
  promptPath: "~",
  duckSpeaker: "pato>",
  errorLabel: "erro:",
  commentPrefix: "#",
  thinking: "pensando no código",
  copy: "copiar",
  copied: "copiado",
  copyFailed: "selecione e copie",
  codeVersion: (version) => `versão ${version}`,
  generatedBy: (model, duration) => `gerado por ${model} em ${duration}`,
  noCode: "esta resposta veio sem código",
  sameCodeAs: (version) => `o código é igual ao da versão ${version}`,
  motd: {
    title: "Duckoder",
    lines: [
      "Gera código para placas didáticas com um modelo de linguagem da rede local.",
      "Explique ao pato o que a placa deve fazer, como explicaria a um colega. O código volta pronto para colar na IDE, e você pode pedir ajustes na mesma conversa.",
      "Digite help para ver os comandos e os atalhos.",
    ],
    examplesTitle: "Experimente um destes:",
    examples: [
      "Pisque o LED embutido a cada segundo",
      "Acenda o LED vermelho enquanto o botão estiver pressionado",
      "Mostre a temperatura do DHT22 no monitor serial",
    ],
  },
  duck: {
    listening: "Quack! Me explica o que a placa deve fazer.",
    thinking: "Hmm, deixa eu pensar",
    happy: (version) => `Pronto! A versão ${version} está no terminal.`,
    noCode: "Não saiu código desta vez. Tenta explicar de outro jeito?",
    unchanged: (version) =>
      `Hmm, o código saiu igual à versão ${version}. Tenta pedir de outro jeito?`,
    confused: "Quack?! Algo deu errado. Olha a mensagem de erro.",
    board: "Abri a placa num painel. Os pinos em amarelo já têm componente ligado.",
    help: "Esses são os comandos que eu entendo.",
    quacks: ["Quack!", "Quack quack!", "QUACK!"],
  },
  conversationNotFound: "a conversa do link não existe mais; comece uma nova conversa",
  noBoards: "nenhuma placa cadastrada no servidor; adicione um perfil em data/boards e reinicie",
  errors: {
    0: "não foi possível falar com o servidor; confira se ele está rodando e se você está na mesma rede",
    404: "conversa ou placa não encontrada; comece uma nova conversa",
    422: "escreva o pedido antes de enviar, com até 4.000 caracteres",
    502: "o modelo de linguagem não respondeu; confira se o Ollama está rodando e envie de novo",
  },
  unexpectedError: "o servidor não conseguiu atender o pedido; envie de novo",
};

/** Message to show for a failed API call, based on its HTTP status. */
export function errorMessageFor(error) {
  return UI_TEXT.errors[error.status] ?? UI_TEXT.unexpectedError;
}
