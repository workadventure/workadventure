import { AreaData, AreaDataProperty, AtLeast, GameMap, UpdateAreaCommand } from "@workadventure/map-editor";
import axios from "axios";
import * as jsonpatch from "fast-json-patch";
import pLimit from "p-limit";
import * as grpc from "@grpc/grpc-js";
import { RoomManagerClient } from "@workadventure/messages/src/ts-proto-generated/services";
import { DispatchModifyAreaRequest, ModifyAreaMessage } from "@workadventure/messages";
import { MAP_STORAGE_API_TOKEN } from "../../Enum/EnvironmentVariable";

const limit = pLimit(10);
//TODO : move instance
//TODO : whitelist ressourcesUrl;
export const _axios = axios.create({
    headers: {
        Authorization: MAP_STORAGE_API_TOKEN,
    },
});

export class UpdateAreaMapStorageCommand extends UpdateAreaCommand {
    constructor(
        gameMap: GameMap,
        dataToModify: AtLeast<AreaData, "id">,
        commandId: string | undefined,
        oldConfig: AtLeast<AreaData, "id"> | undefined,
        //TODO : RENAME
        private backAddress: string
    ) {
        super(gameMap, dataToModify, commandId, oldConfig);
    }

    public async execute(): Promise<void> {
        const patch = jsonpatch.compare(this.oldConfig, this.newConfig);
        let shouldUpdateServerData = false;
        const promises = patch.reduce((acc: Promise<void>[], operation) => {
            if (operation.op === "add" && operation.path.match(new RegExp("^/properties/*"))) {
                const { ressourceUrl, id } = operation.value as AreaDataProperty;
                if (!ressourceUrl) {
                    return acc;
                }
                acc.push(
                    limit(async () => {
                        const response = await _axios.post(ressourceUrl, operation.value);

                        if (!response.data) {
                            return Promise.resolve();
                        }

                        const isAreaDataProperty = AreaDataProperty.safeParse(response.data);

                        if (!isAreaDataProperty.success) {
                            return Promise.resolve();
                        }

                        let shouldNotifyUpdate = false;

                        this.newConfig.properties = this.newConfig.properties?.map((property) => {
                            if (property.id !== id || !isAreaDataProperty.data.serverData) {
                                return property;
                            }

                            if (!property.serverData) {
                                return isAreaDataProperty.data;
                            }

                            const responsePatch = jsonpatch.compare(
                                property.serverData,
                                isAreaDataProperty.data.serverData
                            );

                            if (responsePatch.length > 0) {
                                shouldNotifyUpdate = true;
                                shouldUpdateServerData = true;
                            }

                            return isAreaDataProperty.data;
                        });

                        if (shouldNotifyUpdate) {
                            this.notifyAreaUpdate();
                        }

                        return Promise.resolve();
                    })
                );
            }

            if (operation.op === "remove" && operation.path.match(new RegExp("^/properties/*"))) {
                const value = jsonpatch.getValueByPointer(this.oldConfig, operation.path) as AreaDataProperty;
                const ressourceUrl = value.ressourceUrl;
                if (ressourceUrl) {
                    acc.push(limit(() => _axios.delete(ressourceUrl, { data: value })));
                }
            }

            if (operation.op === "replace" && operation.path.match(new RegExp("^/properties/*"))) {
                const { ressourceUrl } = operation.value as AreaDataProperty;
                if (ressourceUrl) {
                    acc.push(limit(() => _axios.patch(ressourceUrl, operation.value)));
                }
            }
            return acc;
        }, []);

        await Promise.all(promises);

        return super.execute(shouldUpdateServerData);
    }
    private notifyAreaUpdate() {
        const modifyAreaMessage: ModifyAreaMessage = ModifyAreaMessage.fromPartial({
            id: this.newConfig.id,
            properties: this.newConfig.properties,
            modifyProperties: true,
        });

        const message: DispatchModifyAreaRequest = {
            modifyAreaMessage,
        };

        const roomManager = new RoomManagerClient(this.backAddress, grpc.credentials.createInsecure());
        roomManager.dispatchModifyAreaMessage(message, (error) => {
            //sentry
            if (error) console.error("errorr dans le dispatch");
        });
    }
}
