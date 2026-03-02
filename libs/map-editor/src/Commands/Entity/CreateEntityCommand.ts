import { v4 } from "uuid";
import type { WamFile } from "../../GameMap/WamFile";
import { Command } from "../Command";
import type { WAMEntityData } from "../../types";

export class CreateEntityCommand extends Command {
    protected entityId: string;
    protected entityData: WAMEntityData;

    protected wamFile: WamFile;

    constructor(wamFile: WamFile, entityId: string | undefined, entityData: WAMEntityData, commandId?: string) {
        super(commandId);
        this.wamFile = wamFile;
        this.entityData = structuredClone(entityData);
        this.entityId = entityId ?? v4();
    }

    public execute(): Promise<void> {
        this.wamFile.getGameMapEntities().addEntity(this.entityId, this.entityData);
        return Promise.resolve();
    }
}
