import { ITiledMapObject } from "@workadventure/tiled-map-type-guard";
import { UpdateAreaCommandPayload } from './Commands/Area/UpdateAreaCommand';

export type ITiledMapRectangleObject = ITiledMapObject & { width: number; height: number };

export enum CommandType {
    UpdateAreaCommand = "UpdateAreaCommand",
}

export enum AreaType {
    Static = "Static",
    Dynamic = "Dynamic",
}

export type CommandPayload = UpdateAreaCommandPayload;