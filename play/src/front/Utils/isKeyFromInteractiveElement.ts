const INTERACTIVE_SELECTOR =
    'button, a[href], input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="button"], [role="option"], [role="menuitem"], [role="tab"]';

/**
 * True when a key event comes from an element that already reacts to Enter or Space itself (a room of the chat list,
 * a button, a form field...). The game listens to the keyboard on the whole window, so without this check the same
 * key press also opens the say / think bubble or activates the nearby object.
 */
export function isKeyFromInteractiveElement(event: KeyboardEvent): boolean {
    const target = event.target;
    return target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null;
}
