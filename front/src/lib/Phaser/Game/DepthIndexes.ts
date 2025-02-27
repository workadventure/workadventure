//this file contains all the depth indexes which will be used in our game

export const DEPTH_TILE_INDEX = 0;
//Note: Player characters use their y coordinate as their depth to simulate a perspective.
//See the Character class.
export const DEPTH_OVERLAY_INDEX = 1_000_000;
export const DEPTH_INGAME_TEXT_INDEX = 1_100_000;
export const DEPTH_UI_INDEX = 1_200_000;
export const DEPTH_BUBBLE_CHAT_SPRITE = 9_999_999;
export const DEPTH_WHITE_MASK = 10_000_000;
