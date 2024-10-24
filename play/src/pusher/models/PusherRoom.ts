import type { BatchToPusherRoomMessage } from "@workadventure/messages";
import Debug from "debug";
import type { ClientReadableStream } from "@grpc/grpc-js";
import * as Sentry from "@sentry/node";
import { WAMFileFormat, WAMSettingsUtils } from "@workadventure/map-editor";
import { apiClientRepository } from "../services/ApiClientRepository";
import { Socket } from "../services/SocketManager";
import { PositionDispatcher } from "./PositionDispatcher";
import type { ViewportInterface } from "./Websocket/ViewportMessage";
import type { ZoneEventListener } from "./Zone";

const debug = Debug("room");

export class PusherRoom {
    private readonly positionNotifier: PositionDispatcher;
    private versionNumber = 1;

    private backConnection!: ClientReadableStream<BatchToPusherRoomMessage>;
    private isClosing = false;
    private listeners: Set<Socket> = new Set<Socket>();

    private _wamSettings: WAMFileFormat["settings"] = {};

    constructor(public readonly roomUrl: string, private socketListener: ZoneEventListener) {
        // A zone is 10 sprites wide.
        this.positionNotifier = new PositionDispatcher(this.roomUrl, 320, 320, this.socketListener);
    }

    public setViewport(socket: Socket, viewport: ViewportInterface): void {
        this.positionNotifier.setViewport(socket, viewport);
    }

    public join(socket: Socket): void {
        this.listeners.add(socket);

        socket.getUserData().pusherRoom = this;
    }

    public leave(socket: Socket): void {
        this.positionNotifier.removeViewport(socket);
        this.listeners.delete(socket);
        socket.getUserData().pusherRoom = undefined;
    }

    public isEmpty(): boolean {
        return this.positionNotifier.isEmpty();
    }

    public needsUpdate(versionNumber: number): boolean {
        if (this.versionNumber < versionNumber) {
            this.versionNumber = versionNumber;
            return true;
        } else {
            return false;
        }
    }

    /**
     * Creates a connection to the back server to track global messages relative to this room (like variable changes).
     */
    public async init(): Promise<void> {
        debug("Opening connection to room %s on back server", this.roomUrl);
        const apiClient = await apiClientRepository.getClient(this.roomUrl);
        this.backConnection = apiClient.listenRoom({
            roomId: this.roomUrl,
        });
        this.backConnection.on("data", (batch: BatchToPusherRoomMessage) => {
            for (const message of batch.payload) {
                if (!message.message) {
                    Sentry.captureException("Message is undefined for backConnection in PusherRoom" + this.roomUrl);
                    console.error("Message is undefined for backConnection in PusherRoom");
                    continue;
                }
                switch (message.message.$case) {
                    case "variableMessage": {
                        const variableMessage = message.message.variableMessage;
                        const readableBy = variableMessage.readableBy;

                        // We need to store all variables to dispatch variables later to the listeners
                        //this.variables.set(variableMessage.name, variableMessage.value, readableBy);

                        // Let's dispatch this variable to all the listeners
                        for (const listener of this.listeners) {
                            const userData = listener.getUserData();
                            if (!readableBy || userData.tags.includes(readableBy)) {
                                userData.emitInBatch({
                                    message: {
                                        $case: "variableMessage",
                                        variableMessage: variableMessage,
                                    },
                                });
                            }
                        }
                        break;
                    }
                    case "editMapCommandMessage": {
                        for (const listener of this.listeners) {
                            const userData = listener.getUserData();
                            userData.emitInBatch({
                                message: {
                                    $case: "editMapCommandMessage",
                                    editMapCommandMessage: message.message.editMapCommandMessage,
                                },
                            });
                            // In case the message is updating the megaphone settings, we need to send an additional
                            // message to update the display of the megaphone button. The Megaphone button is displayed
                            // based on roles so we need to do this in the pusher.
                            if (
                                message.message.editMapCommandMessage.editMapMessage?.message?.$case ===
                                    "updateWAMSettingsMessage" &&
                                message.message.editMapCommandMessage.editMapMessage.message.updateWAMSettingsMessage
                                    .message?.$case === "updateMegaphoneSettingMessage"
                            ) {
                                if (!this._wamSettings) {
                                    this._wamSettings = {};
                                }
                                this._wamSettings.megaphone =
                                    message.message.editMapCommandMessage.editMapMessage.message.updateWAMSettingsMessage.message.updateMegaphoneSettingMessage;
                                userData.emitInBatch({
                                    message: {
                                        $case: "megaphoneSettingsMessage",
                                        megaphoneSettingsMessage: {
                                            enabled: WAMSettingsUtils.canUseMegaphone(this._wamSettings, userData.tags),
                                            url: WAMSettingsUtils.getMegaphoneUrl(
                                                this._wamSettings,
                                                new URL(this.roomUrl).host,
                                                this.roomUrl
                                            ),
                                        },
                                    },
                                });
                            }
                        }
                        break;
                    }
                    case "errorMessage": {
                        const errorMessage = message.message.errorMessage;
                        // Let's dispatch this error to all the listeners
                        for (const listener of this.listeners) {
                            listener.getUserData().emitInBatch({
                                message: {
                                    $case: "errorMessage",
                                    errorMessage: errorMessage,
                                },
                            });
                        }
                        break;
                    }
                    case "joinMucRoomMessage": {
                        // Let's dispatch this joinMucRoomMessage to all the listeners
                        for (const listener of this.listeners) {
                            listener.getUserData().emitInBatch({
                                message: {
                                    $case: "joinMucRoomMessage",
                                    joinMucRoomMessage: message.message.joinMucRoomMessage,
                                },
                            });
                        }
                        break;
                    }
                    case "leaveMucRoomMessage": {
                        // Let's dispatch this leaveMucRoomMessage to all the listeners
                        for (const listener of this.listeners) {
                            listener.getUserData().emitInBatch({
                                message: {
                                    $case: "leaveMucRoomMessage",
                                    leaveMucRoomMessage: message.message.leaveMucRoomMessage,
                                },
                            });
                        }
                        break;
                    }
                    case "receivedEventMessage": {
                        // Let's dispatch this receivedEventMessage to all the listeners
                        for (const listener of this.listeners) {
                            listener.getUserData().emitInBatch({
                                message: {
                                    $case: "receivedEventMessage",
                                    receivedEventMessage: message.message.receivedEventMessage,
                                },
                            });
                        }
                        break;
                    }
                    default: {
                        const _exhaustiveCheck: never = message.message;
                    }
                }
            }
        });

        this.backConnection.on("error", (err) => {
            if (!this.isClosing) {
                debug("Error on back connection");
                this.close();
                // Let's close all connections linked to that room
                for (const listener of this.listeners) {
                    const userData = listener.getUserData();
                    userData.disconnecting = true;
                    listener.end(1011, "Connection error between pusher and back server");
                    console.error("Connection error between pusher and back server", err);
                    Sentry.captureMessage(
                        "Connection error between pusher and back server : " +
                            err +
                            " " +
                            this.roomUrl +
                            " " +
                            userData.userUuid,
                        "debug"
                    );
                }
            }
        });
        this.backConnection.on("close", () => {
            if (!this.isClosing) {
                debug("Close on back connection", this.roomUrl);
                this.close();
                // Let's close all connections linked to that room
                for (const listener of this.listeners) {
                    const userData = listener.getUserData();
                    userData.disconnecting = true;
                    Sentry.captureMessage(
                        "Close on back connection " + this.roomUrl + " " + userData.userUuid,
                        "debug"
                    );
                    listener.end(
                        1011,
                        "Connection closed between pusher and back server" +
                            this.roomUrl +
                            " " +
                            new Date().toLocaleString("en-GB")
                    );
                }
            }
        });
    }

    public close(): void {
        debug("Closing connection to room %s on back server", this.roomUrl);
        this.isClosing = true;
        this.backConnection.cancel();
    }
}
