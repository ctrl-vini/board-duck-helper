// The open conversation lives in the URL, so reloading or sharing the link keeps it.

const CONVERSATION_PARAMETER = "conversation";

export function readConversationId() {
  return new URLSearchParams(window.location.search).get(CONVERSATION_PARAMETER);
}

export function writeConversationId(conversationId) {
  const url = new URL(window.location.href);
  if (conversationId) {
    url.searchParams.set(CONVERSATION_PARAMETER, conversationId);
  } else {
    url.searchParams.delete(CONVERSATION_PARAMETER);
  }
  window.history.replaceState(null, "", url);
}
