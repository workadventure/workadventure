import { isDeepStrictEqual } from "util";
import type { AreaData, AtLeast, WamFile } from "@workadventure/map-editor";
import { AreaDataProperty, UpdateAreaCommand } from "@workadventure/map-editor";
import pLimit from "p-limit";
import type { HookManager } from "../../Modules/HookManager";

const limit = pLimit(10);

export class UpdateAreaMapStorageCommand extends UpdateAreaCommand {
    constructor(
        wamFile: WamFile,
        dataToModify: AtLeast<AreaData, "id">,
        commandId: string | undefined,
        oldConfig: AtLeast<AreaData, "id"> | undefined,
        private hookManager: HookManager,
        private hostname: string
    ) {
        super(wamFile, dataToModify, commandId, oldConfig);
    }

    public async execute(): Promise<void> {
        const oldProperties = this.oldConfig.properties ?? [];
        const newProperties = this.newConfig.properties ?? [];

        const oldById = new Map(oldProperties.map((property) => [property.id, property]));
        const newById = new Map(newProperties.map((property) => [property.id, property]));

        const promises: Promise<void>[] = [];

        for (const newProperty of newProperties) {
            const oldProperty = oldById.get(newProperty.id);

            if (!oldProperty) {
                const value = AreaDataProperty.safeParse(newProperty);

                if (!value.success) {
                    continue;
                }

                promises.push(
                    limit(async () => {
                        await this.hookManager.fireAreaPropertyAdd(this.newConfig, value.data, this.hostname);
                    })
                );

                continue;
            }

            if (isDeepStrictEqual(oldProperty, newProperty)) {
                continue;
            }

            promises.push(
                limit(async () => {
                    await this.hookManager.fireAreaPropertyChange(
                        this.newConfig,
                        oldProperty,
                        newProperty,
                        this.hostname
                    );
                })
            );
        }

        for (const oldProperty of oldProperties) {
            const existsInNewConfig = newById.has(oldProperty.id);

            if (existsInNewConfig) {
                continue;
            }

            promises.push(
                limit(async () => {
                    await this.hookManager.fireAreaPropertyDelete(this.newConfig, oldProperty, this.hostname);
                })
            );
        }

        try {
            await Promise.all(promises);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Failed to execute all request on resourceUrl`, error);
        }

        await super.execute();
    }
}
