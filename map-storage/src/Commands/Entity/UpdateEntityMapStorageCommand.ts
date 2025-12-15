import type { GameMap, WAMEntityData, WAMFileFormat } from "@workadventure/map-editor";
import { EntityDataProperty, UpdateEntityCommand } from "@workadventure/map-editor";
import * as jsonpatch from "fast-json-patch";
import pLimit from "p-limit";
import type { HookManager } from "../../Modules/HookManager";

const limit = pLimit(10);
export class UpdateEntityMapStorageCommand extends UpdateEntityCommand {
    constructor(
        gameMap: GameMap,
        id: string,
        dataToModify: Partial<WAMEntityData>,
        commandId: string | undefined,
        oldConfig: Partial<WAMEntityData> | undefined,
        private hookManager: HookManager,
        private hostname: string
    ) {
        super(gameMap, id, dataToModify, commandId, oldConfig);
    }

    public async execute(): Promise<WAMFileFormat | undefined> {
        const patch = jsonpatch.compare(this.oldConfig, this.newConfig);
        const promises = patch.reduce((acc: Promise<void>[], operation) => {
            if (operation.op === "add" && operation.path.match(new RegExp("^/properties/*"))) {
                const value = EntityDataProperty.safeParse(operation.value);

                if (!value.success) {
                    return acc;
                }

                acc.push(
                    limit(async () => {
                        await this.hookManager.fireEntityPropertyAdd(this.newConfig, value.data, this.hostname);
                    })
                );
            }

            if (operation.op === "remove" && operation.path.match(new RegExp("^/properties/*"))) {
                const value = jsonpatch.getValueByPointer(this.oldConfig, operation.path) as EntityDataProperty;
                if (!value) return acc;
                acc.push(
                    limit(async () => {
                        await this.hookManager.fireEntityPropertyDelete(this.newConfig, value, this.hostname);
                    })
                );
            }

            if (operation.op === "replace" && operation.path.match(new RegExp("^/properties/*"))) {
                const match = operation.path.match(/^\/properties\/(\d+)\/*/);

                if (!match) return acc;

                const propertyIndex = Number(match[1]);
                const properties = this.newConfig.properties;

                if (!properties) return acc;
                const property = properties[propertyIndex];
                const oldProperty = this.oldConfig.properties?.[propertyIndex];

                if (!property || !oldProperty) return acc;

                acc.push(
                    limit(async () => {
                        await this.hookManager.fireEntityPropertyChange(
                            this.newConfig,
                            oldProperty,
                            property,
                            this.hostname
                        );
                    })
                );
            }
            return acc;
        }, []);

        try {
            await Promise.all(promises);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Failed to execute all request on resourceUrl`, error);
        }

        return await super.execute();
    }
}
