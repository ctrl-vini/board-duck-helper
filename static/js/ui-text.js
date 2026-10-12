// Every text the student reads, in one place.

export const LOCALE = "pt-BR";

export const UI_TEXT = {
  boardLabel: "placa:",
  newConversation: "nova conversa",
  requestLabel: "O que a placa deve fazer?",
  send: "enviar",
  sendHint: "enter envia, shift+enter quebra a linha",
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
  motd: {
    title: "Board Code Assistant 0.1.0",
    lines: [
      "Gera código para placas didáticas com um modelo de linguagem da rede local.",
      "Explique ao pato o que a placa deve fazer, como explicaria a um colega. O código volta pronto para colar na IDE, e você pode pedir ajustes na mesma conversa.",
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
    confused: "Quack?! Algo deu errado. Olha a mensagem de erro.",
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
