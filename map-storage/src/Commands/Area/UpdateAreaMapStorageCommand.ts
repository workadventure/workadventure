import { AreaData, AreaDataProperty, AtLeast, GameMap, UpdateAreaCommand } from "@workadventure/map-editor";
import * as Sentry from "@sentry/node";
import * as jsonpatch from "fast-json-patch";
import pLimit from "p-limit";
import { HookManager } from "../../Modules/HookManager";

const limit = pLimit(10);
export class UpdateAreaMapStorageCommand extends UpdateAreaCommand {
    constructor(
        gameMap: GameMap,
        dataToModify: AtLeast<AreaData, "id">,
        commandId: string | undefined,
        oldConfig: AtLeast<AreaData, "id"> | undefined,
        private hookManager: HookManager,
        private hostname: string
    ) {
        super(gameMap, dataToModify, commandId, oldConfig);
    }

    public async execute(): Promise<void> {
        const patch = jsonpatch.compare(this.oldConfig, this.newConfig);
        const promises = patch.reduce((acc: Promise<void>[], operation) => {
            if (operation.op === "add" && operation.path.match(new RegExp("^/properties/*"))) {
                const value = AreaDataProperty.safeParse(operation.value);

                if (!value.success) {
                    return acc;
                }

                acc.push(
                    limit(async () => {
                        await this.hookManager.fireAreaPropertyAdd(this.newConfig, value.data, this.hostname);
                    })
                );
            }

            if (operation.op === "remove" && operation.path.match(new RegExp("^/properties/*"))) {
                const value = jsonpatch.getValueByPointer(this.oldConfig, operation.path) as AreaDataProperty;
                if (!value) return acc;
                acc.push(
                    limit(async () => {
                        await this.hookManager.fireAreaPropertyDelete(this.newConfig, value, this.hostname);
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
                const oldProperty = this.gameMap
                    .getGameMapAreas()
                    ?.getArea(this.oldConfig.id)
                    ?.properties.find((propertyToFind) => propertyToFind.id === property.id);

                if (!property || !oldProperty) return acc;

                acc.push(
                    limit(async () => {
                        await this.hookManager.fireAreaPropertyChange(
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
            Sentry.captureMessage(`Failed to execute all request on resourceUrl ${JSON.stringify(error)}`);
        }

        console.log("UpdateAreaMapStorageCommand", this.newConfig);
        return await super.execute();
    }
}
