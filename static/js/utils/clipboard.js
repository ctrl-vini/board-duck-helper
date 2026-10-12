/** Copy text to the clipboard and report whether it worked. */
export async function copyText(text) {
  // navigator.clipboard only exists on HTTPS or localhost, and students open the platform
  // through the server's local network address over plain HTTP.
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied: fall through to the selection-based copy.
    }
  }
  return copyThroughSelection(text);
}

function copyThroughSelection(text) {
  const buffer = document.createElement("textarea");
  buffer.value = text;
  buffer.setAttribute("readonly", "");
  buffer.style.position = "fixed";
  buffer.style.opacity = "0";
  document.body.append(buffer);
  buffer.select();
  const copied = document.execCommand("copy");
  buffer.remove();
  return copied;
}
