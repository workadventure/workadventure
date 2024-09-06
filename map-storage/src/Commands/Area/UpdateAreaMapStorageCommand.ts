import { AreaData, AreaDataProperty, AtLeast, GameMap, UpdateAreaCommand } from "@workadventure/map-editor";
import axiosx from "axios";
import * as jsonpatch from "fast-json-patch";
import pLimit from "p-limit";

const limit = pLimit(10);

export class UpdateAreaMapStorageCommand extends UpdateAreaCommand {
    constructor(
        gameMap: GameMap,
        dataToModify: AtLeast<AreaData, "id">,
        commandId: string | undefined,
        oldConfig: AtLeast<AreaData, "id"> | undefined
    ) {
        super(gameMap, dataToModify, commandId, oldConfig);
    }

    public async execute(): Promise<void> {
        const returnVal = await super.execute();
        const patch = jsonpatch.compare(this.oldConfig, this.newConfig);

        const promises = patch.reduce((acc: Promise<void>[], operation) => {
            //TODO : revoir les parties headers
            if (operation.op === "add" && operation.path.match(new RegExp("^/properties/*"))) {
                const { ressourceUrl } = operation.value as AreaDataProperty;

                if (ressourceUrl) {
                    //call post on ressource url;
                    const headers = {};
                    const data = {};

                    acc.push(limit(() => axios.post(ressourceUrl, data, { headers })));
                }
            }

            if (operation.op === "remove" && operation.path.match(new RegExp("^/properties/*"))) {
                const { ressourceUrl } = jsonpatch.getValueByPointer(
                    this.oldConfig,
                    operation.path
                ) as AreaDataProperty;

                if (ressourceUrl) {
                    acc.push(
                        limit(() =>
                            axios.delete(ressourceUrl, {
                                headers: {},
                            })
                        )
                    );
                    //call post on ressource url;
                }
            }

            return acc;
        }, []);

        await Promise.all(promises);

        return returnVal;
    }
}
