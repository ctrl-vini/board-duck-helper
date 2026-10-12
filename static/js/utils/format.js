import { LOCALE } from "../ui-text.js";

const MILLISECONDS_PER_SECOND = 1000;
const secondsFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });

/** Format a duration in milliseconds as seconds, e.g. 9278 -> "9,3 s". */
export function formatDuration(milliseconds) {
  return `${secondsFormat.format(milliseconds / MILLISECONDS_PER_SECOND)} s`;
}
