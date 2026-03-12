import { isDeepStrictEqual } from "util";
import type { WamFile, WAMEntityData, WAMFileFormat } from "@workadventure/map-editor";
import { EntityDataProperty, UpdateEntityCommand } from "@workadventure/map-editor";
import pLimit from "p-limit";
import type { HookManager } from "../../Modules/HookManager.ts";

const limit = pLimit(10);

export class UpdateEntityMapStorageCommand extends UpdateEntityCommand {
    constructor(
        wamFile: WamFile,
        id: string,
        dataToModify: Partial<WAMEntityData>,
        commandId: string | undefined,
        oldConfig: Partial<WAMEntityData> | undefined,
        private hookManager: HookManager,
        private hostname: string
    ) {
        super(wamFile, id, dataToModify, commandId, oldConfig);
    }

    public async execute(): Promise<WAMFileFormat | undefined> {
        const oldProperties = this.oldConfig.properties ?? [];
        const newProperties = this.newConfig.properties ?? [];

        const oldById = new Map(oldProperties.map((property) => [property.id, property]));
        const newById = new Map(newProperties.map((property) => [property.id, property]));

        const promises: Promise<void>[] = [];

        for (const newProperty of newProperties) {
            const oldProperty = oldById.get(newProperty.id);

            if (!oldProperty) {
                const value = EntityDataProperty.safeParse(newProperty);

                if (!value.success) {
                    continue;
                }

                promises.push(
                    limit(async () => {
                        await this.hookManager.fireEntityPropertyAdd(this.newConfig, value.data, this.hostname);
                    })
                );

                continue;
            }

            if (isDeepStrictEqual(oldProperty, newProperty)) {
                continue;
            }

            promises.push(
                limit(async () => {
                    await this.hookManager.fireEntityPropertyChange(
                        this.newConfig,
                        oldProperty,
                        newProperty,
                        this.hostname
                    );
                })
            );
        }

        for (const oldProperty of oldProperties) {
            if (newById.has(oldProperty.id)) {
                continue;
            }

            promises.push(
                limit(async () => {
                    await this.hookManager.fireEntityPropertyDelete(this.newConfig, oldProperty, this.hostname);
                })
            );
        }

        try {
            await Promise.all(promises);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Failed to execute all request on resourceUrl`, error);
        }

        return await super.execute();
    }
}
