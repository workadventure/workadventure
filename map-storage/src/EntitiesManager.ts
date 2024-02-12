import { Command } from "@workadventure/map-editor";

class EntitiesManager {
    public async executeCommand(mapKey: string, command: Command): Promise<void> {
        await command.execute();
    }
}

export const entitiesManager = new EntitiesManager();
