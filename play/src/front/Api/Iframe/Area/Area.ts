import type { ITiledMapObject } from "@workadventure/tiled-map-type-guard";
import type { CreateDynamicAreaEvent } from "../../Events/CreateDynamicAreaEvent";
import { sendToWorkadventure } from "../IframeApiContribution";

// TODO: Include more properties to extends functionality later on
export type IArea = Omit<ITiledMapObject, "id" | "gid" | "visible" | "rotation" | "ellipse" | "polygon" | "polyline">;

export class Area implements IArea {
    private config: CreateDynamicAreaEvent;

    public readonly name: string;
    public readonly type: string = "area";
    public readonly class: string = "area";
    private _x: number;
    private _y: number;
    private _width: number;
    private _height: number;

    constructor(config: CreateDynamicAreaEvent) {
        this.config = config;

        this.name = config.name;
        this._x = config.x;
        this._y = config.y;
        this._width = config.width;
        this._height = config.height;
    }

    public setProperty(propertyName: string, propertyValue: string | number | boolean | undefined): void {
        sendToWorkadventure({
            type: "setAreaProperty",
            data: {
                areaName: this.name,
                propertyName: propertyName,
                propertyValue: propertyValue,
            },
        });
    }

    public get x() {
        return this._x;
    }

    public set x(x: number) {
        this._x = x;
        sendToWorkadventure({
            type: "modifyArea",
            data: {
                name: this.name,
                x: this._x,
            },
        });
    }

    public set y(y: number) {
        this._y = y;
        sendToWorkadventure({
            type: "modifyArea",
            data: {
                name: this.name,
                y: this._y,
            },
        });
    }

    public get y() {
        return this._y;
    }

    public set width(width: number) {
        this._width = width;
        sendToWorkadventure({
            type: "modifyArea",
            data: {
                name: this.name,
                width: this._width,
            },
        });
    }

    public get width() {
        return this._width;
    }

    public set height(height: number) {
        this._height = height;
        sendToWorkadventure({
            type: "modifyArea",
            data: {
                name: this.name,
                height: this._height,
            },
        });
    }

    public get height() {
        return this._height;
    }
}
