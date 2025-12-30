import type { GameMap } from "@workadventure/map-editor";
import { DeleteEntityCommand } from "@workadventure/map-editor";
import pLimit from "p-limit";
import type { HookManager } from "../../Modules/HookManager";

const limit = pLimit(10);

export class DeleteEntityMapStorageCommand extends DeleteEntityCommand {
    constructor(
        gameMap: GameMap,
        id: string,
        commandId: string | undefined,
        private hostName: string,
        private hookManager: HookManager
    ) {
        super(gameMap, id, commandId);
    }
    public async execute(): Promise<void> {
        await super.execute();
        const promises =
            this.entityConfig?.properties?.reduce((acc: Promise<void>[], property) => {
                acc.push(
                    limit(async () => {
                        if (this.entityConfig) {
                            await this.hookManager.fireEntityPropertyDelete(this.entityConfig, property, this.hostName);
                        }
                    })
                );

                return acc;
            }, []) || [];

        try {
            await Promise.all(promises);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Failed to execute all request`, error);
        }
    }
}
