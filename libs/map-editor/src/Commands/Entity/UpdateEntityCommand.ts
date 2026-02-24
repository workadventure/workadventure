import type { WAMEntityData, WAMFileFormat } from "../../types";
import type { WamFile } from "../../GameMap/WamFile";
import { Command } from "../Command";

export class UpdateEntityCommand extends Command {
    protected oldConfig: Partial<WAMEntityData>;
    protected newConfig: Partial<WAMEntityData>;

    protected wamFile: WamFile;

    constructor(
        wamFile: WamFile,
        protected entityId: string,
        dataToModify: Partial<WAMEntityData>,
        commandId?: string,
        oldConfig?: Partial<WAMEntityData>
    ) {
        super(commandId);
        this.wamFile = wamFile;
        if (!oldConfig) {
            const oldConfig = wamFile.getGameMapEntities().getEntity(entityId);
            if (!oldConfig) {
                throw new Error("Trying to update a non existing Entity!");
            }
            this.oldConfig = structuredClone(oldConfig);
        } else {
            this.oldConfig = structuredClone(oldConfig);
        }
        this.newConfig = structuredClone(dataToModify);
    }

    public execute(): Promise<undefined | WAMFileFormat> {
        if (!this.wamFile.getGameMapEntities().updateEntity(this.entityId, this.newConfig)) {
            throw new Error(`MapEditorError: Could not execute UpdateEntity Command. Entity ID: ${this.entityId}`);
        }
        return Promise.resolve(this.wamFile.getWam());
    }
}
