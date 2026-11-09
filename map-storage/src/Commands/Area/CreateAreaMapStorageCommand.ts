import { isDeepStrictEqual } from "util";
import type { AreaData, AreaDataProperties, WamFile } from "@workadventure/map-editor";
import { AreaDataProperty, CreateAreaCommand } from "@workadventure/map-editor";
import pLimit from "p-limit";
import type { HookManager } from "../../Modules/HookManager";

const limit = pLimit(10);

/**
 * Runs the "property added" hooks for every property of the new area, as UpdateAreaMapStorageCommand does for
 * the properties it adds. A copied area needs them: without them, it would keep using the chat room and the
 * uploaded files of the area it was copied from.
 */
export class CreateAreaMapStorageCommand extends CreateAreaCommand {
    /** Set by execute(): whether the hooks changed a property, which the client that sent it does not know. */
    public propertiesChangedByHooks = false;

    constructor(
        wamFile: WamFile,
        areaObjectConfig: AreaData,
        commandId: string | undefined,
        private hookManager: HookManager,
        private hostname: string,
    ) {
        super(wamFile, areaObjectConfig, commandId);
    }

    public async execute(): Promise<void> {
        const changed = await Promise.all(
            this.areaConfig.properties.map((property) => limit(() => this.fireAddHooks(property))),
        );
        this.propertiesChangedByHooks = changed.includes(true);
        await super.execute();
    }

    public getProperties(): AreaDataProperties {
        return this.areaConfig.properties;
    }

    /** Returns whether the hooks changed the property. */
    private async fireAddHooks(property: AreaDataProperty): Promise<boolean> {
        const value = AreaDataProperty.safeParse(property);
        if (!value.success) {
            return false;
        }
        const before = structuredClone(value.data);
        try {
            await this.hookManager.fireAreaPropertyAdd(this.areaConfig, value.data, this.hostname);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Failed to run the hooks of a new area property`, error);
        }
        return !isDeepStrictEqual(
            before,
            this.areaConfig.properties.find((p) => p.id === before.id),
        );
    }
}
