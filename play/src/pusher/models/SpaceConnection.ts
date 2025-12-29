import * as Sentry from "@sentry/node";
import Debug from "debug";
import type { BackToPusherSpaceMessage } from "@workadventure/messages";
import type { SpaceManagerClient } from "@workadventure/messages/src/ts-proto-generated/services";
import { GRPC_MAX_MESSAGE_SIZE } from "../enums/EnvironmentVariable";
import { apiClientRepository } from "../services/ApiClientRepository";
import type { SpaceForSpaceConnectionInterface, SpaceInterface } from "./Space";
import type { BackSpaceConnection } from "./Websocket/SocketData";
const debug = Debug("spaceConnection");

/**
 * The SpaceConnection class is responsible for managing the connection to the back server.
 * It is used to create a new connection to the back server if there is no connection for this backId and to join the space to the back server.
 * It is also responsible for retrying the connection to the back server if it is lost.
 * It is also responsible for closing the connection to the back server if there are no more spaces that need it.
 */
export interface SpaceConnectionInterface {
    getSpaceStreamToBackPromise(space: SpaceForSpaceConnectionInterface): Promise<BackSpaceConnection>;
    removeSpace(space: SpaceInterface): void;
}

export class SpaceConnection implements SpaceConnectionInterface {
    private spaceStreamToBackPromises: Map<number, Promise<BackSpaceConnection>> = new Map<
        number,
        Promise<BackSpaceConnection>
    >();
    private spacePerBackId: Map<number, Map<string, SpaceForSpaceConnectionInterface>> = new Map<
        number,
        Map<string, SpaceForSpaceConnectionInterface>
    >();
    private listenersPerBackId: Map<
        number,
        {
            dataListener: (message: BackToPusherSpaceMessage) => void;
            endListener: () => void;
            errorListener: (err: Error) => void;
        }
    > = new Map();

    constructor(
        private _apiClientRepository = apiClientRepository,
        private _GRPC_MAX_MESSAGE_SIZE = GRPC_MAX_MESSAGE_SIZE
    ) {}

    /**
     * If there is no connection to the back server for this backId, create a new one.
     * If there is already a connection, return the existing one.
     *
     * In addition, register the space in the spacePerBackId map AND send a joinSpaceMessage to the back server.
     */
    async getSpaceStreamToBackPromise(space: SpaceForSpaceConnectionInterface): Promise<BackSpaceConnection> {
        const backId = this._apiClientRepository.getIndex(space.name);

        const existingSpacesMap = this.spacePerBackId.get(backId);
        if (existingSpacesMap) {
            if (existingSpacesMap.has(space.name)) {
                console.warn(`Space ${space.name} is already registered for backId ${backId}`);
                Sentry.captureMessage(`Space ${space.name} is already registered for backId ${backId}`);
            }
            existingSpacesMap.set(space.name, space);
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

    private onDataListener(spaceStreamToBack: BackSpaceConnection, backId: number) {
        return (message: BackToPusherSpaceMessage) => {
            try {
                if (message.message) {
                    switch (message.message.$case) {
                        case "initSpaceUsersMessage":
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
                            if (spaceStreamToBack.pingTimeout) {
                                clearTimeout(spaceStreamToBack.pingTimeout);
                                spaceStreamToBack.pingTimeout = undefined;
                            }

                            spaceStreamToBack.write({
                                message: {
                                    $case: "pongMessage",
                                    pongMessage: {},
                                },
                            });

                            spaceStreamToBack.pingTimeout = setTimeout(() => {
                                console.error("Error spaceStreamToBack timed out for back:", backId);
                                Sentry.captureException("Error spaceStreamToBack timed out for back: " + backId);
                                spaceStreamToBack.end();
                                this.removeListeners(spaceStreamToBack, backId);
                                this.cleanUpSpacePerBackId(backId).catch((e) => {
                                    console.error("Error while cleaning up space per back id", e);
                                    Sentry.captureException(e);
                                });
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

    private onEndListener(spaceStreamToBack: BackSpaceConnection, backId: number) {
        return () => {
            debug("[space] spaceStreamsToBack ended");
            if (spaceStreamToBack.pingTimeout) clearTimeout(spaceStreamToBack.pingTimeout);
            this.removeListeners(spaceStreamToBack, backId);
            this.spaceStreamToBackPromises.delete(backId);
            this.spacePerBackId.delete(backId);
        };
    }

    private onErrorListener(
        spaceStreamToBack: BackSpaceConnection,
        backId: number,
        apiSpaceClient: SpaceManagerClient
    ) {
        return (err: Error) => {
            if (spaceStreamToBack.pingTimeout) clearTimeout(spaceStreamToBack.pingTimeout);
            console.error(
                "Error in connection to back server for watchSpace '" + apiSpaceClient.getChannel().getTarget(),
                err
            );
            Sentry.captureException(err);
            this.removeListeners(spaceStreamToBack, backId);
            this.spaceStreamToBackPromises.delete(backId);
            this.spacePerBackId.delete(backId);
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
        const dataListener = this.onDataListener(spaceStreamToBack, backId);
        const endListener = this.onEndListener(spaceStreamToBack, backId);
        const errorListener = this.onErrorListener(spaceStreamToBack, backId, apiSpaceClient);

        // eslint-disable-next-line listeners/no-missing-remove-event-listener , listeners/matching-remove-event-listener
        spaceStreamToBack.on("data", dataListener).on("end", endListener).prependListener("error", errorListener);

        this.listenersPerBackId.set(backId, {
            dataListener,
            endListener,
            errorListener,
        });
    }

    private joinSpace(spaceStreamToBackPromise: Promise<BackSpaceConnection>, space: SpaceForSpaceConnectionInterface) {
        spaceStreamToBackPromise
            .then((spaceStreamToBack) => {
                spaceStreamToBack.write({
                    message: {
                        $case: "joinSpaceMessage",
                        joinSpaceMessage: {
                            spaceName: space.name,
                            filterType: space.filterType,
                            propertiesToSync: space.getPropertiesToSync(),
                            world: space.world,
                        },
                    },
                });
            })
            .catch((e) => {
                // FIXME: if joinspace fails, we have big problems.
                console.error("Error while joining space", e);

                Sentry.captureException(e);
            });
    }

    removeSpace(space: SpaceInterface) {
        debug(`${space.name} : removeSpace`);
        const backId = this._apiClientRepository.getIndex(space.name);
        const spacesForBackId = this.spacePerBackId.get(backId);

        if (!spacesForBackId) {
            // If a "end" or "error" event happened before the "removeSpace" event, the spacesForBackId is already empty.
            // There is nothing more to do in this case.
            return;
        }

        const isDeleted = spacesForBackId.delete(space.name);

        if (!isDeleted) {
            throw new Error("Space not found");
        }

        if (spacesForBackId.size === 0) {
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
            space.cleanup();
        });
        this.spacePerBackId.delete(backId);
        const spaceStreamToBack = this.spaceStreamToBackPromises.get(backId);
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
            case "initSpaceUsersMessage":
                return message.message.initSpaceUsersMessage?.spaceName;
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
            default: {
                const _exhaustiveCheck: never = message.message;
                return undefined;
            }
        }
    }
}
