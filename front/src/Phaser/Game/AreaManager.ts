import { CreateAreaEvent } from "../../Api/Events/CreateAreaEvent";
import { Area } from "../../Api/iframe/Area/Area";
import { iframeListener } from "../../Api/IframeListener";
import { GameMap } from "./GameMap";

export class AreaManager {
    private readonly gameMap: GameMap;

    private areas: Map<string, Area>;

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;
        this.areas = new Map<string, Area>();

        this.registerIFrameEventAnswerers();
    }

    private registerIFrameEventAnswerers(): void {
        iframeListener.registerAnswerer("createArea", (createAreaEvent: CreateAreaEvent) => {
            if (this.gameMap.getAreaWithName(createAreaEvent.name)) {
                throw new Error(`An area with the name "${createAreaEvent.name}" already exists in your map`);
            }

            this.areas.set(createAreaEvent.name, new Area(createAreaEvent));
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

        // TODO: Do we also want to unregister actions from onEnter onLeave streams?
        iframeListener.registerAnswerer("deleteArea", (name: string) => {
            this.gameMap.deleteArea(name);
            console.log(`TRY DO DELETE ${name}`);
        });
    }
}
