/**
 * What was typed at the prompt during one conversation, browsed like a shell's history: back
 * from the newest entry, then forward again to the text that was being written.
 */
export function createCommandHistory() {
  let entries = [];
  // entries.length stands for the text being written, which is kept while browsing.
  let position = 0;
  let draft = "";

  return {
    /** Record a sent text; the same text sent twice in a row is kept once, as in bash. */
    add(text) {
      if (entries.at(-1) !== text) {
        entries.push(text);
      }
      position = entries.length;
      draft = "";
    },

    clear() {
      entries = [];
      position = 0;
      draft = "";
    },

    /** The entry before the current one, or null at the oldest; current is kept as the draft. */
    previous(current) {
      if (position === 0) {
        return null;
      }
      if (position === entries.length) {
        draft = current;
      }
      position -= 1;
      return entries[position];
    },

    /** The entry after the current one, the draft after the newest, or null when not browsing. */
    next() {
      if (position >= entries.length) {
        return null;
      }
      position += 1;
      return position === entries.length ? draft : entries[position];
    },
  };
}
