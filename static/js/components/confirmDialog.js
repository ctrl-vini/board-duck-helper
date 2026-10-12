// A yes-or-no question shown as a modal, built on the native <dialog> element.

// Value of the button that confirms; any other way of closing (cancel, Esc) declines.
const CONFIRM_VALUE = "confirm";

/**
 * Wrap a <dialog> whose form uses method="dialog". ask() opens it and resolves to true only
 * when the confirm button was picked.
 */
export function createConfirmDialog(dialog) {
  return {
    ask() {
      // Esc closes without setting a value, so the answer from the last time is cleared first.
      dialog.returnValue = "";
      dialog.showModal();
      return new Promise((resolve) => {
        dialog.addEventListener("close", () => resolve(dialog.returnValue === CONFIRM_VALUE), {
          once: true,
        });
      });
    },
  };
}
