import { DeleteAreaCommand, GameMap } from "@workadventure/map-editor";
import axios from "axios";
import pLimit from "p-limit";

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
                if (property.type !== "matrixRoomPropertyData" || !ressourceUrl) return acc;
                //TODO : revoir les parties headers;
                const headers = {};

                acc.push(limit(() => axios.delete(`${ressourceUrl}/${property.matrixRoomId}`, headers)));
                return acc;
            }, []) || [];

        //TODO : fonction pas assez générique car on doit ajouter le matrixRoomId voir si autre possibilité ; (on va se retrouver avec un if pour chaque propriete qui passe par cette fonction par rapport a son type)
        //TODO : fabrique ?

        await Promise.all(promises);
        return Promise.resolve();
    }
}
