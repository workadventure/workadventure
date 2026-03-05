//this file contains all the depth indexes which will be used in our game

export const DEPTH_TILE_INDEX = 0;
//Note: Player characters use their y coordinate as their depth to simulate a perspective.
//See the Character class.
export const DEPTH_OVERLAY_INDEX = 1_000_000;
export const DEPTH_CONVERSATION_BUBBLE_INDEX = 1_050_000;
export const DEPTH_INGAME_TEXT_INDEX = 1_100_000;
/** Map editor area previews (zones) – above overlay layers so they are always visible when the map editor is open. */
export const DEPTH_MAP_EDITOR_AREAS_INDEX = 1_150_000;
export const DEPTH_UI_INDEX = 1_200_000;
export const DEPTH_BUBBLE_CHAT_SPRITE = 9_999_999;
export const DEPTH_WHITE_MASK = 10_000_000;
