import { ITiledMapObject } from "@workadventure/tiled-map-type-guard";

export type ITiledMapRectangleObject = ITiledMapObject & { width: number; height: number };