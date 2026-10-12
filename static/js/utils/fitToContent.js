/** Grow a textarea with its content, up to the max-height set in CSS. */
export function fitToContent(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}
