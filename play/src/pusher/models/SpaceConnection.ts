import * as Sentry from "@sentry/node";
import Debug from "debug";
import { BackToPusherSpaceMessage } from "@workadventure/messages";
import { SpaceManagerClient } from "@workadventure/messages/src/ts-proto-generated/services";
import { GRPC_MAX_MESSAGE_SIZE } from "../enums/EnvironmentVariable";
import { apiClientRepository } from "../services/ApiClientRepository";
import { SpaceForSpaceConnectionInterface, SpaceInterface } from "./Space";
import { BackSpaceConnection } from "./Websocket/SocketData";
const debug = Debug("spaceConnection");

/**
 * The SpaceConnection class is responsible for managing the connection to the back server.
 * It is used to create a new connection to the back server if there is no connection for this backId for a space and to join the space to the back server.
 * It is also responsible for retrying the connection to the back server if it is lost.
 * It is also responsible for closing the connection to the back server if there are no more spaces that need it.
 */

export interface SpaceConnectionInterface {
    getSpaceStreamToBackPromise(space: SpaceForSpaceConnectionInterface): Promise<BackSpaceConnection>;
    removeSpace(space: SpaceInterface): void;
}

export class SpaceConnection {
    private spaceStreamToBackPromises: Map<number, Promise<BackSpaceConnection>> = new Map<
        number,
        Promise<BackSpaceConnection>
    >();
    private spacePerBackId: Map<number, Map<string, SpaceForSpaceConnectionInterface>> = new Map<
        number,
        Map<string, SpaceForSpaceConnectionInterface>
    >();
    private listenersPerBackId: Map<number, {
        dataListener: (message: BackToPusherSpaceMessage) => void;
        endListener: () => void;
        errorListener: (err: Error) => void;
    }> = new Map();

    constructor(
        private _apiClientRepository = apiClientRepository,
        private _GRPC_MAX_MESSAGE_SIZE = GRPC_MAX_MESSAGE_SIZE
    ) {}


    async getSpaceStreamToBackPromise(space: SpaceForSpaceConnectionInterface): Promise<BackSpaceConnection> {
        const backId = this._apiClientRepository.getIndex(space.name);

        if (this.spacePerBackId.has(backId)) {
            this.spacePerBackId.get(backId)?.set(space.name, space);
        } else {
            this.spacePerBackId.set(backId, new Map<string, SpaceForSpaceConnectionInterface>([[space.name, space]]));
        }

        const spaceStreamToBack = this.spaceStreamToBackPromises.get(backId);
        if (spaceStreamToBack) {
            this.joinSpace(spaceStreamToBack, space);
            return spaceStreamToBack;
        }

        const spaceStreamToBackPromise = this.createBackConnection(space, backId);
        this.joinSpace(spaceStreamToBackPromise, space);
        this.spaceStreamToBackPromises.set(backId, spaceStreamToBackPromise);
        return spaceStreamToBackPromise;
    }

    private async createBackConnection(space: SpaceForSpaceConnectionInterface, backId: number) {
        try {
            const apiSpaceClient = await this._apiClientRepository.getSpaceClient(
                space.name,
                this._GRPC_MAX_MESSAGE_SIZE
            );
            const spaceStreamToBack = apiSpaceClient.watchSpace() as BackSpaceConnection;
            this.registerEventsOnConnection(spaceStreamToBack, backId, apiSpaceClient);
            return spaceStreamToBack;
        } catch (error) {
            console.error("Error while creating back connection", error);
            return new Promise<BackSpaceConnection>((resolve) => {
                setTimeout(() => {
                    resolve(this.createBackConnection(space, backId));
                }, 5000);
            });
        }
    }

    private onDataListener(spaceStreamToBack: BackSpaceConnection, backId: number, apiSpaceClient: SpaceManagerClient) {
        return (message: BackToPusherSpaceMessage) => {
            try {
                if (message.message) {
                    switch (message.message.$case) {
                        case "addSpaceUserMessage":
                        case "updateSpaceUserMessage":
                        case "removeSpaceUserMessage":
                        case "updateSpaceMetadataMessage":
                        case "kickOffMessage":
                        case "publicEvent":
                        case "privateEvent":
                        case "spaceAnswerMessage": {
                            const spaceName = this.extractSpaceName(message);
                            if (spaceName) {
                                const space = this.spacePerBackId.get(backId)?.get(spaceName);
                                if (space) {
                                    space.dispatcher.handleMessage(message);
                                } else {
                                    console.error("Space not found", spaceName);
                                }
                            }
                            break;
                        }
                        case "pingMessage": {
                            console.log("pingMessage ====> from onDataListener", backId);
                            if (spaceStreamToBack.pingTimeout) {
                                console.log("clearTimeout ====> from onDataListener", backId);
                                clearTimeout(spaceStreamToBack.pingTimeout);
                                spaceStreamToBack.pingTimeout = undefined;
                            }

                            console.log("write pongMessage ====> from onDataListener", backId);
                            spaceStreamToBack.write({
                                message: {
                                    $case: "pongMessage",
                                    pongMessage: {},
                                },
                            });

                            console.log("setTimeout ====> from onDataListener", backId);

                            //TODO: check if we are properly clearing the timeout each time

                            //TODO: issue with reconnection or a timeout problem without reason, investigate why
                            //TODO: issue when it triggers for no reason
                            //TODO: at worst, we should close the connection to reconnect and handle it properly on the backend
                            //TODO: review the reconnection and the ping system ==> can we replace it with something more gRPC and more reliable??
                            //TODO : voir reconnection sur un back qui ne s'est pas éteint ==> est ce que les pusher doivent passer des uuid pour s'identifier et si on recois une nouvelle connexion pour un effacer les données qu'il y a avant ??
                            spaceStreamToBack.pingTimeout = setTimeout(() => {
                                console.error("Error spaceStreamToBack timed out for back:", backId);
                                Sentry.captureException("Error spaceStreamToBack timed out for back: " + backId);
                                spaceStreamToBack.end();
                                try {
                                    this.removeListeners(spaceStreamToBack, backId);
                                    this.retryConnection(backId);
                                } catch (e) {
                                    console.error("Error while retrying connection ...", e);
                                    Sentry.captureException(e);
                                    this.cleanUpSpacePerBackId(backId).catch((e) => {
                                        console.error("Error while cleaning up space per back id", e);
                                        Sentry.captureException(e);
                                    });
                                }
                            }, 1000 * 60);
                            break;
                        }
                        default: {
                            const _exhaustiveCheck: never = message.message;
                        }
                    }
                } else {
                    throw new Error("Message is empty");
                }
            } catch (e) {
                console.error("Error while handling message", e);
                Sentry.captureException(e);
            }
        };
    }

    private onEndListener(spaceStreamToBack: BackSpaceConnection, backId: number, apiSpaceClient: SpaceManagerClient) {
        return () => {
            debug("[space] spaceStreamsToBack ended");
            if (spaceStreamToBack.pingTimeout) clearTimeout(spaceStreamToBack.pingTimeout);
        };
    }

    private onErrorListener(spaceStreamToBack: BackSpaceConnection, backId: number, apiSpaceClient: SpaceManagerClient) {
        return (err: Error) => {
            if (spaceStreamToBack.pingTimeout) clearTimeout(spaceStreamToBack.pingTimeout);
            console.error("Error in connection to back server '" + apiSpaceClient.getChannel().getTarget(), err);
            Sentry.captureException(err);
            try {
                this.removeListeners(spaceStreamToBack, backId);
                this.retryConnection(backId);
            } catch (e) {
                console.error("Error while retrying connection ...", e);
                Sentry.captureException(e);
                this.cleanUpSpacePerBackId(backId).catch((e) => {
                    console.error("Error while cleaning up space per back id", e);
                    Sentry.captureException(e);
                });
            }
        };
    }

    private removeListeners(spaceStreamToBack: BackSpaceConnection, backId: number) {
        const listeners = this.listenersPerBackId.get(backId);
        if (listeners) {
            spaceStreamToBack.off("data", listeners.dataListener);
            spaceStreamToBack.off("end", listeners.endListener);
            spaceStreamToBack.off("error", listeners.errorListener);
            this.listenersPerBackId.delete(backId);
        }
    }

    private registerEventsOnConnection(
        spaceStreamToBack: BackSpaceConnection,
        backId: number,
        apiSpaceClient: SpaceManagerClient
    ) {
        const dataListener = this.onDataListener(spaceStreamToBack, backId, apiSpaceClient);
        const endListener = this.onEndListener(spaceStreamToBack, backId, apiSpaceClient);
        const errorListener = this.onErrorListener(spaceStreamToBack, backId, apiSpaceClient);

        spaceStreamToBack
            .on("data", dataListener)
            .on("end", endListener)
            .on("error", errorListener);

        this.listenersPerBackId.set(backId, {
            dataListener,
            endListener,
            errorListener,
        });
    }

    private joinSpace(
        spaceStreamToBackPromise: Promise<BackSpaceConnection>,
        space: SpaceForSpaceConnectionInterface,
        isRetry: boolean = false
    ) {
        spaceStreamToBackPromise
            .then((spaceStreamToBack) => {
                spaceStreamToBack.write({
                    message: {
                        $case: "joinSpaceMessage",
                        joinSpaceMessage: {
                            spaceName: space.name,
                            filterType: space.filterType,
                            isRetry,
                        },
                    },
                });
            })
            .catch((e) => {
                console.error("Error while joining space", e);

                Sentry.captureException(e);
            });
    }

    private retryConnection(backId: number) {
        console.log("retryConnection ====> from retryConnection (start)", backId);
        const spaceForBackId = this.spacePerBackId.get(backId);
        if (!spaceForBackId) {
            console.error("spaceForBackId not found", this.spacePerBackId.size);
            throw new Error("spaceForBackId not found");
        }

        const validEntry = Array.from(spaceForBackId.entries()).find(([_, v]) => v !== undefined);
        if (!validEntry) {
            const spaceNames = Array.from(spaceForBackId.keys());
            debug(
                `[SpaceConnection] No valid space found for backId=${backId}. spaceForBackId contains: [${spaceNames.join(
                    ", "
                )}]`
            );
            console.log("delete spacePerBackId ====> from retryConnection", backId);
            this.spacePerBackId.delete(backId);
            return;
        }
        const [, space] = validEntry;

        console.log("createBackConnection ====> from retryConnection (start createBackConnection)", backId);
        const spaceStreamToBackPromise = this.createBackConnection(space, backId);
        console.log("createBackConnection ====> from retryConnection (end createBackConnection)", backId);
        space.setSpaceStreamToBack(spaceStreamToBackPromise);
        this.spaceStreamToBackPromises.set(backId, spaceStreamToBackPromise);

        spaceForBackId.forEach((space) => {
            space.setSpaceStreamToBack(spaceStreamToBackPromise);
            this.joinSpace(spaceStreamToBackPromise, space, true);
            space.sendLocalUsersToBack();
        });
    }

    removeSpace(space: SpaceInterface) {
        debug(`${space.name} : removeSpace`);
        const backId = this._apiClientRepository.getIndex(space.name);
        const spacesForBackId = this.spacePerBackId.get(backId);

        if (!spacesForBackId) {
            throw new Error("Space not found");
        }

        const isDeleted = spacesForBackId.delete(space.name);

        if (!isDeleted) {
            throw new Error("Space not found");
        }

        if (spacesForBackId.size === 0) {
            console.log("delete spacePerBackId ====> from removeSpace", backId);
            debug("Deleting backId", backId);
            this.spacePerBackId.delete(backId);

            const spaceStreamToBack = this.spaceStreamToBackPromises.get(backId);
            if (!spaceStreamToBack) {
                throw new Error("Space stream to back not found");
            }

            spaceStreamToBack
                .then((connection) => {
                    if (connection.pingTimeout) clearTimeout(connection.pingTimeout);
                    this.removeListeners(connection, backId);
                    connection.end();
                })
                .catch((e) => {
                    console.error("Error while closing space back connection", e);
                    Sentry.captureException(e);
                });

            this.spaceStreamToBackPromises.delete(backId);
        }
    }

    private async cleanUpSpacePerBackId(backId: number) {
        
        this.spacePerBackId.get(backId)?.forEach((space) => {
            space.handleConnectionRetryFailure();
        });
        this.spacePerBackId.delete(backId);
        const spaceStreamToBack = this.spaceStreamToBackPromises.get(backId);
        console.log("delete spaceStreamToBack ====> from cleanUpSpacePerBackId", backId);
        this.spaceStreamToBackPromises.delete(backId);
        if (spaceStreamToBack) {
            const connection = await spaceStreamToBack;
            if (connection.pingTimeout) clearTimeout(connection.pingTimeout);
            this.removeListeners(connection, backId);
        }

        debug(`[SpaceConnection] spacePerBackId cleaned up for backId ${backId}`);
    }

    private extractSpaceName(message: BackToPusherSpaceMessage): string | undefined {
        if (!message.message) return undefined;

        switch (message.message.$case) {
            case "addSpaceUserMessage":
                return message.message.addSpaceUserMessage?.spaceName;
            case "updateSpaceUserMessage":
                return message.message.updateSpaceUserMessage?.spaceName;
            case "removeSpaceUserMessage":
                return message.message.removeSpaceUserMessage?.spaceName;
            case "updateSpaceMetadataMessage":
                return message.message.updateSpaceMetadataMessage?.spaceName;
            case "kickOffMessage":
                return message.message.kickOffMessage?.spaceName;
            case "publicEvent":
                return message.message.publicEvent?.spaceName;
            case "privateEvent":
                return message.message.privateEvent?.spaceName;
            case "spaceAnswerMessage": {
                return message.message.spaceAnswerMessage?.spaceName;
            }
            case "pingMessage":
                return undefined;
            default:
                return undefined;
        }
    }
}
