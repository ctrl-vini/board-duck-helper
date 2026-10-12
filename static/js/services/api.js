// One function per API endpoint; failures become ApiError with the HTTP status.

const JSON_HEADERS = { "Content-Type": "application/json" };
const NETWORK_FAILURE_STATUS = 0;

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
  }
}

export function listBoards() {
  return request("/boards");
}

export function getBoard(boardId) {
  return request(`/boards/${encodeURIComponent(boardId)}`);
}

export function createConversation(boardId) {
  return request("/conversations", { method: "POST", body: { board_id: boardId } });
}

export function getConversation(conversationId) {
  return request(`/conversations/${encodeURIComponent(conversationId)}`);
}

export function sendMessage(conversationId, content) {
  return request(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    body: { content },
  });
}

export function getVersion() {
  return request("/version");
}

async function request(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: JSON_HEADERS,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError(NETWORK_FAILURE_STATUS, error.message);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, payload?.detail ?? response.statusText);
  }
  return payload;
}
