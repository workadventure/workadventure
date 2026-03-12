import type { AreaData } from "../../types.ts";
import type { WamFile } from "../../GameMap/WamFile.ts";
import { Command } from "../Command.ts";

export class CreateAreaCommand extends Command {
    protected readonly areaConfig: AreaData;

    protected wamFile: WamFile;

    constructor(wamFile: WamFile, areaObjectConfig: AreaData, commandId?: string) {
        super(commandId);
        this.wamFile = wamFile;
        this.areaConfig = structuredClone<AreaData>(areaObjectConfig);
    }

    public execute(): Promise<void> {
        if (!this.wamFile.getGameMapAreas().addArea(this.areaConfig)) {
            throw new Error(`MapEditorError: Could not execute CreateArea Command. Area ID: ${this.areaConfig.id}`);
        }
        return Promise.resolve();
    }
}
