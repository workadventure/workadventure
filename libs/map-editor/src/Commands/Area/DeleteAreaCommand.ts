import type { AreaData } from "../../types";
import type { WamFile } from "../../GameMap/WamFile";
import { Command } from "../Command";

export class DeleteAreaCommand extends Command {
    protected areaConfig: AreaData | undefined;

    protected wamFile: WamFile;

    constructor(wamFile: WamFile, protected areaId: string, commandId?: string) {
        super(commandId);
        this.wamFile = wamFile;
    }

    public execute(): Promise<void> {
        const areaConfig = this.wamFile.getGameMapAreas().getArea(this.areaId);
        if (areaConfig) {
            this.areaConfig = structuredClone(areaConfig);
            if (!this.wamFile.getGameMapAreas().deleteArea(this.areaId)) {
                throw new Error(`MapEditorError: Could not execute DeleteArea Command. Area ID: ${this.areaId}`);
            }
        }
        return Promise.resolve();
    }
}
