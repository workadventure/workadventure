import type { WamFile } from "../../GameMap/WamFile";
import type { WAMEntityData } from "../../types";
import { Command } from "../Command";

export class DeleteEntityCommand extends Command {
    protected entityConfig: WAMEntityData | undefined;

    protected wamFile: WamFile;

    constructor(wamFile: WamFile, protected entityId: string, commandId?: string) {
        super(commandId);
        this.wamFile = wamFile;
    }

    public execute(): Promise<void> {
        const entityConfig = this.wamFile.getGameMapEntities().getEntity(this.entityId);
        if (entityConfig) {
            this.entityConfig = structuredClone(entityConfig);
            if (!this.wamFile.getGameMapEntities().deleteEntity(this.entityId)) {
                throw new Error(`MapEditorError: Could not execute DeleteEntity Command. Entity ID: ${this.entityId}`);
            }
        }
        return Promise.resolve();
    }
}
