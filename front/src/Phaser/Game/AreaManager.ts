import { GameMap } from "./GameMap";

export class AreaManager {
    private readonly gameMap: GameMap;

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;

        this.registerIFrameEventAnswerers();
    }

    private registerIFrameEventAnswerers(): void {
        // iframeListener.registerAnswerer("")
    }
}
