import { sendToWorkadventure } from "../IframeApiContribution";
import type { CreateEmbeddedWebsiteEvent, Rectangle } from "../../Events/EmbeddedWebsiteEvent";

export class EmbeddedWebsite {
    public readonly name: string;
    private _url: string;
    private _visible: boolean;
    // private _allow: string;
    // private _allowApi: boolean;
    private _position: Rectangle;
    //private readonly origin: "map" | "player" | undefined;
    private _scale: number;

    constructor(private config: CreateEmbeddedWebsiteEvent) {
        this.name = config.name;
        this._url = config.url;
        this._visible = config.visible ?? true;
        // this._allow = config.allow ?? "";
        // this._allowApi = config.allowApi ?? false;
        this._position = config.position;
        //this.origin = config.origin;
        this._scale = config.scale ?? 1;
    }

    public get url() {
        return this._url;
    }

    public set url(url: string) {
        this._url = url;
        sendToWorkadventure({
            type: "modifyEmbeddedWebsite",
            data: {
                name: this.name,
                url: this._url,
            },
        });
    }

    public get visible() {
        return this._visible;
    }

    public set visible(visible: boolean) {
        this._visible = visible;
        sendToWorkadventure({
            type: "modifyEmbeddedWebsite",
            data: {
                name: this.name,
                visible: this._visible,
            },
        });
    }

    public get x() {
        return this._position.x;
    }

    public set x(x: number) {
        this._position.x = x;
        sendToWorkadventure({
            type: "modifyEmbeddedWebsite",
            data: {
                name: this.name,
                x: this._position.x,
            },
        });
    }

    public get y() {
        return this._position.y;
    }

    public set y(y: number) {
        this._position.y = y;
        sendToWorkadventure({
            type: "modifyEmbeddedWebsite",
            data: {
                name: this.name,
                y: this._position.y,
            },
        });
    }

    public get width() {
        return this._position.width;
    }

    public set width(width: number) {
        this._position.width = width;
        sendToWorkadventure({
            type: "modifyEmbeddedWebsite",
            data: {
                name: this.name,
                width: this._position.width,
            },
        });
    }

    public get height() {
        return this._position.height;
    }

    public set height(height: number) {
        this._position.height = height;
        sendToWorkadventure({
            type: "modifyEmbeddedWebsite",
            data: {
                name: this.name,
                height: this._position.height,
            },
        });
    }

    public get scale(): number {
        return this._scale;
    }

    public set scale(scale: number) {
        this._scale = scale;
        sendToWorkadventure({
            type: "modifyEmbeddedWebsite",
            data: {
                name: this.name,
                scale: this._scale,
            },
        });
    }
}
