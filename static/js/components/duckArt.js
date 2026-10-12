// The rubber duck, drawn with braille characters and facing left, toward the transcript.
// Only the eye and the lower half of the beak change between frames.

const BODY = [
  "⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
  "⠀⠀⠀⠀⢀⣴⠊⠉⠀⠀⠀⠈⠉⠲⢄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
  "⠀⠀⠀⢠⠛⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀",
  "⢀⣀⣀⣎⠀⠀⣿⡇⠀⠀⠀⠀⠀⠀⠀⠈⡆⠀⠀⠀⠀⠀⠀⠀⠀",
  "⠘⢿⣅⠸⢷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠇⠀⠀⠀⠀⠀⠀⠀⠀",
  "⠀⠻⠿⠟⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⢀⠞⠀⠀⠀⠀⠀⠀⠀⠀⠀",
  "⠀⠀⠀⠀⢈⡷⠀⠀⠀⠀⠀⠀⠀⢰⡥⡤⡄⣀⣀⣀⡠⠒⠉⣢⠀",
  "⠀⠀⢠⠾⠽⠁⠀⠀⠄⠤⠄⠀⠀⠀⠀⠇⠤⠄⠄⠁⠀⠀⠈⢼⠀",
  "⠀⢰⠃⠀⠀⠀⠀⠀⠀⢀⠔⠊⠉⠉⠁⠒⠂⠀⠐⠢⡀⠀⠀⢸⠄",
  "⠀⢘⠀⠀⠀⠀⠀⠀⠀⠘⠀⠀⠀⠀⠀⠀⠀⠀⠴⠺⡄⠀⠀⢸⠀",
  "⠀⢸⠀⠀⠀⠀⠀⠀⠀⠰⡀⠀⠀⠀⠀⠀⠀⠀⢒⡎⠀⠀⢠⠃⠀",
  "⠀⠀⠣⡀⠀⠀⠀⠀⠀⠀⠉⠂⠤⠤⠤⠤⠤⠒⠋⠀⠀⡠⠃⠀⠀",
  "⠠⡀⠐⠈⠲⢤⢄⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⡤⠴⠎⠐⠂⢠⠀",
];

// The water line, right under the duck's body.
export const WATER = "⠉⠒⠉⠒⠉⠒⠉⠒⠉⠒⠉⠒⠉⠒⠉⠒⠉⠒⠉⠒⠉⠒⠉⠒⠉";

const EYE_ROW = 3;
const EYE_COLUMN = 6;
const EYES = {
  open: "⣿⡇",
  closed: "⠤⠄",
  happy: "⠔⠄",
  up: "⠛⠃",
  wide: "⣏⡇",
};

// With the beak open the lower half drops: these rows get new characters from this column on.
const OPEN_BEAK_COLUMN = 1;
const OPEN_BEAK_ROWS = { 5: "⣄⣀⣀⣈⠇", 6: "⠙⠛⠋⢛⡯" };

// The one-line duck shown on narrow screens.
const MINI_EYES = { open: "o", closed: "-", happy: "^", up: "°", wide: "O" };
const MINI_BEAKS = { closed: "<", open: "=" };

/** The duck as text; eye is "open", "closed", "happy", "up" or "wide". */
export function drawDuck(eye, beakOpen) {
  return BODY.map((line, row) => {
    let drawn = line;
    if (beakOpen && row in OPEN_BEAK_ROWS) {
      drawn = replaceAt(drawn, OPEN_BEAK_COLUMN, OPEN_BEAK_ROWS[row]);
    }
    if (row === EYE_ROW) {
      drawn = replaceAt(drawn, EYE_COLUMN, EYES[eye]);
    }
    return drawn;
  }).join("\n");
}

/** The same duck in one line, for narrow screens. */
export function drawMiniDuck(eye, beakOpen) {
  return `${beakOpen ? MINI_BEAKS.open : MINI_BEAKS.closed}(${MINI_EYES[eye]} )`;
}

function replaceAt(text, index, replacement) {
  return text.slice(0, index) + replacement + text.slice(index + replacement.length);
}
