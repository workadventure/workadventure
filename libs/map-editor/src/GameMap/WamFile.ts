import type { WAMFileFormat } from "../types";
import type { AreaChangeCallback, AreaUpdateCallback } from "./GameMapAreas";
import { GameMapAreas } from "./GameMapAreas";
import { GameMapEntities } from "./GameMapEntities";

export class WamFile {
    private readonly wam: WAMFileFormat;
    private readonly gameMapAreas: GameMapAreas;
    private readonly gameMapEntities: GameMapEntities;

    public constructor(wam: WAMFileFormat) {
        this.wam = wam;
        this.gameMapAreas = new GameMapAreas(this.wam);
        this.gameMapEntities = new GameMapEntities(this.wam);
    }

    public getWam(): WAMFileFormat {
        return this.wam;
    }

    public getGameMapAreas(): GameMapAreas {
        return this.gameMapAreas;
    }

    public getGameMapEntities(): GameMapEntities {
        return this.gameMapEntities;
    }

    public onEnterArea(callback: AreaChangeCallback): void {
        this.gameMapAreas.onEnterArea(callback);
    }

    public onUpdateArea(callback: AreaUpdateCallback): void {
        this.gameMapAreas.onUpdateArea(callback);
    }

    public updateLastCommandIdProperty(commandId: string): void {
        this.wam.lastCommandId = commandId;
    }

    public getLastCommandId(): string | undefined {
        return this.wam.lastCommandId;
    }
}
