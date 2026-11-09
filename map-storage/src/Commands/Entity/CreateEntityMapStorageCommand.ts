import { isDeepStrictEqual } from "util";
import type { EntityDataProperties, WamFile, WAMEntityData } from "@workadventure/map-editor";
import { CreateEntityCommand, EntityDataProperty } from "@workadventure/map-editor";
import pLimit from "p-limit";
import type { HookManager } from "../../Modules/HookManager";

const limit = pLimit(10);

/** The entity counterpart of CreateAreaMapStorageCommand: runs the "property added" hooks of the new entity. */
export class CreateEntityMapStorageCommand extends CreateEntityCommand {
    /** Set by execute(): whether the hooks changed a property, which the client that sent it does not know. */
    public propertiesChangedByHooks = false;

    constructor(
        wamFile: WamFile,
        entityId: string,
        entityData: WAMEntityData,
        commandId: string | undefined,
        private hookManager: HookManager,
        private hostname: string,
    ) {
        super(wamFile, entityId, entityData, commandId);
    }

    public async execute(): Promise<void> {
        const changed = await Promise.all(
            (this.entityData.properties ?? []).map((property) => limit(() => this.fireAddHooks(property))),
        );
        this.propertiesChangedByHooks = changed.includes(true);
        await super.execute();
    }

    public getProperties(): EntityDataProperties {
        return this.entityData.properties ?? [];
    }

    /** Returns whether the hooks changed the property. */
    private async fireAddHooks(property: EntityDataProperty): Promise<boolean> {
        const value = EntityDataProperty.safeParse(property);
        if (!value.success) {
            return false;
        }
        const before = structuredClone(value.data);
        try {
            await this.hookManager.fireEntityPropertyAdd(this.entityData, value.data, this.hostname);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Failed to run the hooks of a new entity property`, error);
        }
        return !isDeepStrictEqual(
            before,
            this.entityData.properties?.find((p) => p.id === before.id),
        );
    }
}
