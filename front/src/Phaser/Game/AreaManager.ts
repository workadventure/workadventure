import { Subscription } from "rxjs";
import { CreateAreaEvent, ModifyAreaEvent } from "../../Api/Events/CreateAreaEvent";
import { iframeListener } from "../../Api/IframeListener";
import { GameMap } from "./GameMap";

export class AreaManager {
    private readonly gameMap: GameMap;

    // private readonly areas: Map<string, Area>;
    private readonly subscription: Subscription;

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;
        // this.areas = new Map<string, Area>();

        this.registerIFrameEventAnswerers();

        this.subscription = iframeListener.modifyAreaStream.subscribe((modifyAreaEvent: ModifyAreaEvent) => {
            const area = this.gameMap.getArea(modifyAreaEvent.name);
            if (!area) {
                throw new Error(`Could not find area with the name "${modifyAreaEvent.name}" in your map`);
            }

            if (modifyAreaEvent.x !== undefined) {
                area.x = modifyAreaEvent.x;
            }
            if (modifyAreaEvent.y !== undefined) {
                area.y = modifyAreaEvent.y;
            }
            if (modifyAreaEvent.width !== undefined) {
                area.width = modifyAreaEvent.width;
            }
            if (modifyAreaEvent.height !== undefined) {
                area.height = modifyAreaEvent.height;
            }
        });
    }

    private registerIFrameEventAnswerers(): void {
        iframeListener.registerAnswerer("createArea", (createAreaEvent: CreateAreaEvent) => {
            if (this.gameMap.getArea(createAreaEvent.name)) {
                throw new Error(`An area with the name "${createAreaEvent.name}" already exists in your map`);
            }

            // this.areas.set(createAreaEvent.name, new Area(createAreaEvent));
            this.gameMap.setArea(createAreaEvent.name, {
                ...createAreaEvent,
                id: -1,
                gid: -1,
                visible: true,
                rotation: 0,
                type: "area",
                ellipse: false,
                polygon: [],
                polyline: [],
                properties: [],
            });
        });

        iframeListener.registerAnswerer("getArea", (name: string) => {
            const area = this.gameMap.getArea(name);
            if (area === undefined) {
                throw new Error(`Cannot find area with name "${name}"`);
            }
            return {
                name: area.name,
                width: area.width,
                height: area.height,
                x: area.x,
                y: area.y,
            };
        });

        // TODO: Do we also want to unregister actions from onEnter onLeave streams?
        iframeListener.registerAnswerer("deleteArea", (name: string) => {
            this.gameMap.deleteArea(name);
        });
    }

    close(): void {
        this.subscription.unsubscribe();
    }
}
