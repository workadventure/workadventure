import { AreaData, AreaDataProperty, AtLeast, GameMap, UpdateAreaCommand } from "@workadventure/map-editor";
import * as Sentry from "@sentry/node";
import * as jsonpatch from "fast-json-patch";
import pLimit from "p-limit";
import * as grpc from "@grpc/grpc-js";
import { RoomManagerClient } from "@workadventure/messages/src/ts-proto-generated/services";
import { DispatchModifyAreaRequest, ModifyAreaMessage } from "@workadventure/messages";
import { _axios } from "../../Services/axiosInstance";

const limit = pLimit(10);
export class UpdateAreaMapStorageCommand extends UpdateAreaCommand {
    constructor(
        gameMap: GameMap,
        dataToModify: AtLeast<AreaData, "id">,
        commandId: string | undefined,
        oldConfig: AtLeast<AreaData, "id"> | undefined,
        private backAddress: string
    ) {
        super(gameMap, dataToModify, commandId, oldConfig);
    }

    public async execute(): Promise<void> {
        const patch = jsonpatch.compare(this.oldConfig, this.newConfig);
        let shouldNotifyUpdate = false;
        const promises = patch.reduce((acc: Promise<void>[], operation) => {
            if (operation.op === "add" && operation.path.match(new RegExp("^/properties/*"))) {
                const value = AreaDataProperty.safeParse(operation.value);

                if (!value.success) {
                    return acc;
                }

                const { resourceUrl, id } = value.data;
                if (!resourceUrl) {
                    return acc;
                }

                if (value.data.serverData) {
                    value.data.serverData = undefined;
                }

                const propertyFromNewConfig = this.newConfig.properties?.find((property) => property.id === id);

                if (propertyFromNewConfig) propertyFromNewConfig.serverData = undefined;
                acc.push(
                    limit(async () => {
                        const response = await _axios.post(resourceUrl, operation.value);
                        if (!response.data) {
                            return Promise.resolve();
                        }

                        const isAreaDataProperty = AreaDataProperty.safeParse(response.data);

                        if (!isAreaDataProperty.success) {
                            return Promise.resolve();
                        }

                        shouldNotifyUpdate = true;

                        this.newConfig.properties = this.newConfig.properties?.map((property) => {
                            if (property.id !== id || !isAreaDataProperty.data.serverData) {
                                return property;
                            }

                            return isAreaDataProperty.data;
                        });

                        return Promise.resolve();
                    })
                );
            }

            if (operation.op === "remove" && operation.path.match(new RegExp("^/properties/*"))) {
                const value = jsonpatch.getValueByPointer(this.oldConfig, operation.path) as AreaDataProperty;
                if (!value) return acc;
                const resourceUrl = value.resourceUrl;
                if (resourceUrl) {
                    acc.push(limit(() => _axios.delete(resourceUrl, { data: value })));
                }
            }

            if (operation.op === "replace" && operation.path.match(new RegExp("^/properties/*"))) {
                const match = operation.path.match(/^\/properties\/(\d+)\/*/);

                if (!match) return acc;

                const propertyIndex = Number(match[1]);
                const properties = this.newConfig.properties;

                if (!properties) return acc;
                const property = properties[propertyIndex];
                const serverData = this.gameMap
                    .getGameMapAreas()
                    ?.getArea(this.oldConfig.id)
                    ?.properties.find((propertyToFind) => propertyToFind.id === property.id)?.serverData;

                property.serverData = serverData;
                const resourcesUrl = property.resourceUrl;

                if (resourcesUrl) {
                    acc.push(
                        limit(async () => {
                            const response = await _axios.patch(resourcesUrl, property);

                            if (!response.data) {
                                return Promise.resolve();
                            }

                            const isAreaDataProperty = AreaDataProperty.safeParse(response.data);

                            if (!isAreaDataProperty.success) {
                                return Promise.resolve();
                            }

                            shouldNotifyUpdate = true;

                            this.newConfig.properties = this.newConfig.properties?.map((oldProperty) => {
                                if (oldProperty.id !== property.id || !isAreaDataProperty.data.serverData) {
                                    return oldProperty;
                                }

                                return isAreaDataProperty.data;
                            });
                            return Promise.resolve();
                        })
                    );
                }
            }
            return acc;
        }, []);

        try {
            await Promise.all(promises);
            if (shouldNotifyUpdate) {
                this.notifyAreaUpdate();
            }
        } catch (error) {
            console.error("Failed to execute all request on resourceUrl", error);
            Sentry.captureMessage(`Failed to execute all request on resourceUrl ${JSON.stringify(error)}`);
        }

        return super.execute();
    }
    private notifyAreaUpdate() {
        const modifyAreaMessage: ModifyAreaMessage = ModifyAreaMessage.fromPartial({
            id: this.newConfig.id,
            properties: this.newConfig.properties,
            modifyProperties: true,
        });

        const message: DispatchModifyAreaRequest = DispatchModifyAreaRequest.fromPartial({
            modifyAreaMessage,
        });

        const roomManager = new RoomManagerClient(this.backAddress, grpc.credentials.createInsecure());

        roomManager.dispatchModifyAreaMessage(message, (error) => {
            if (error) {
                console.error(`Failed to dispatch modify area : ${error.name} : ${error.message}`);
                Sentry.captureMessage(`Failed to dispatch modify area :  ${error.name} : ${error.message}`);
            }
        });
    }
}
