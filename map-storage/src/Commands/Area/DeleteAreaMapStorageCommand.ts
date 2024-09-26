import { DeleteAreaCommand, GameMap } from "@workadventure/map-editor";
import * as Sentry from "@sentry/node";
import pLimit from "p-limit";
import { _axios } from "./UpdateAreaMapStorageCommand";

const limit = pLimit(10);

export class DeleteAreaMapStorageCommand extends DeleteAreaCommand {
    constructor(gameMap: GameMap, id: string, commandId: string | undefined) {
        super(gameMap, id, commandId);
    }
    public async execute(): Promise<void> {
        await super.execute();
        const promises =
            this.areaConfig?.properties.reduce((acc: Promise<void>[], property) => {
                const ressourceUrl = property.ressourceUrl;
                if (!ressourceUrl) return acc;
                acc.push(limit(() => _axios.delete(ressourceUrl, { data: property })));

                return acc;
            }, []) || [];

        try {
            await Promise.all(promises);
        } catch (error) {
            console.error("Failed to execute all request on ressourceUrl", error);
            Sentry.captureMessage(`Failed to execute all request on ressourceUrl ${JSON.stringify(error)}`);
        }
    }
}
