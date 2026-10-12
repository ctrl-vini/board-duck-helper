/** One item of the list, picked at random, so repeated messages vary. */
export function pickAtRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}
