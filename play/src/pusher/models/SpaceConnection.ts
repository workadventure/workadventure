import * as Sentry from "@sentry/node";
import Debug from "debug";
import { BackToPusherSpaceMessage } from "@workadventure/messages";
import { SpaceManagerClient } from "@workadventure/messages/src/ts-proto-generated/services";
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

    constructor(private _apiClientRepository = apiClientRepository) {}

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
        const apiSpaceClient = await this._apiClientRepository.getSpaceClient(space.name);
        const spaceStreamToBack = apiSpaceClient.watchSpace() as BackSpaceConnection;
        this.registerEventsOnConnection(spaceStreamToBack, backId, apiSpaceClient);
        return spaceStreamToBack;
    }

    private registerEventsOnConnection(
        spaceStreamToBack: BackSpaceConnection,
        backId: number,
        apiSpaceClient: SpaceManagerClient
    ) {
        spaceStreamToBack
            .on("data", (message: BackToPusherSpaceMessage) => {
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
                                const spaceName = extractSpaceName(message);
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
                                    void this.retryConnection(backId);
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
            })
            .on("end", () => {
                debug("[space] spaceStreamsToBack ended");
                if (spaceStreamToBack.pingTimeout) clearTimeout(spaceStreamToBack.pingTimeout);

                this.retryConnection(backId);
            })
            .on("status", (status) => {
                console.log("status : ", status);
                //voir si on peut gerer la fin de la connexion ici
            })
            .on("error", (err: Error) => {
                console.error("Error in connection to back server '" + apiSpaceClient.getChannel().getTarget(), err);
                Sentry.captureException(err);

                // this.retryConnection(backId).catch((e) => {
                //     console.error("Error while retrying connection", e);
                //     Sentry.captureException(e);
                // });
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
        console.trace(">>>>>>>>> retryConnection", backId);

        const spaceForBackId = this.spacePerBackId.get(backId);
        if (!spaceForBackId) {
            throw new Error("Space not found");
        }

        const spaceName = spaceForBackId.keys().next().value;
        if (!spaceName) {
            throw new Error("Space name not found");
        }

        const space = spaceForBackId.get(spaceName);
        if (!space) {
            throw new Error("Space not found");
        }

        const spaceStreamToBackPromise = this.createBackConnection(space, backId);
        space.setSpaceStreamToBack(spaceStreamToBackPromise);
        this.spaceStreamToBackPromises.set(backId, spaceStreamToBackPromise);

        spaceForBackId.forEach((space) => {
            space.setSpaceStreamToBack(spaceStreamToBackPromise);
            this.joinSpace(spaceStreamToBackPromise, space);
            space.sendLocalUsersToBack();
        });
    }

    removeSpace(space: SpaceInterface) {
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
            this.spacePerBackId.delete(backId);

            const spaceStreamToBack = this.spaceStreamToBackPromises.get(backId);
            if (!spaceStreamToBack) {
                throw new Error("Space stream to back not found");
            }

            spaceStreamToBack
                .then((spaceStreamToBack) => {
                    spaceStreamToBack.end();
                })
                .catch((e) => {
                    console.error("Error while closing space back connection", e);
                    Sentry.captureException(e);
                });
            this.spaceStreamToBackPromises.delete(backId);
        }
    }
}

// Fonction helper pour extraire le spaceName de manière type-safe
function extractSpaceName(message: BackToPusherSpaceMessage): string | undefined {
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
