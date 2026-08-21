/**
 * Layout constants shared by the username pill and the badges laid out inside it.
 *
 * They live in their own module so a badge can size itself against the pill without importing the
 * pill that builds it.
 */

/** Height of the pill, in game pixels. Multiplied by `--username-dom-scale` at render time. */
export const PLAYER_NAME_HEIGHT = 14;

/** Gap between the pill's children, in game pixels. */
export const PLAYER_NAME_GAP = 4;

/** Side of the (square) megaphone icon, in game pixels. */
export const MEGAPHONE_ICON_SIZE = PLAYER_NAME_HEIGHT * 0.75;
