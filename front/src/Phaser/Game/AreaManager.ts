import { CreateAreaEvent } from "../../Api/Events/CreateAreaEvent";
import { iframeListener } from "../../Api/IframeListener";
import { GameMap } from "./GameMap";

export class AreaManager {
    private readonly gameMap: GameMap;

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;

        this.registerIFrameEventAnswerers();
    }

    private registerIFrameEventAnswerers(): void {
        iframeListener.registerAnswerer("createArea", (createAreaEvent: CreateAreaEvent) => {
            if (this.gameMap.getAreaWithName(createAreaEvent.name)) {
                throw new Error(`An area with the name "${createAreaEvent.name}" already exists in your map`);
            }
        });
    }
}
