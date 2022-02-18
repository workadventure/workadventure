import { PUSHER_URL, UPLOADER_URL } from "../Enum/EnvironmentVariable";
import Axios from "axios";

import type { UserSimplePeerInterface } from "../WebRtc/SimplePeer";
import { ProtobufClientUtils } from "../Network/ProtobufClientUtils";
import type {
    GroupCreatedUpdatedMessageInterface,
    ItemEventMessageInterface,
    MessageUserJoined,
    OnConnectInterface,
    PlayerDetailsUpdatedMessageInterface,
    PlayGlobalMessageInterface,
    PositionInterface,
    RoomJoinedMessageInterface,
    ViewportInterface,
    WebRtcDisconnectMessageInterface,
    WebRtcSignalReceivedMessageInterface,
} from "./ConnexionModels";
import type { BodyResourceDescriptionInterface } from "../Phaser/Entity/PlayerTextures";
import { adminMessagesService } from "./AdminMessagesService";
import { connectionManager } from "./ConnectionManager";
import { get } from "svelte/store";
import { warningContainerStore } from "../Stores/MenuStore";
import { followStateStore, followRoleStore, followUsersStore } from "../Stores/FollowStore";
import { localUserStore } from "./LocalUserStore";
import {
    RefreshRoomMessage,
    ServerToClientMessage as ServerToClientMessageTsProto,
    TokenExpiredMessage,
    WorldConnexionMessage,
    WorldFullMessage,
    ErrorMessage as ErrorMessageTsProto,
    UserMovedMessage as UserMovedMessageTsProto,
    GroupUpdateMessage as GroupUpdateMessageTsProto,
    GroupDeleteMessage as GroupDeleteMessageTsProto,
    UserJoinedMessage as UserJoinedMessageTsProto,
    UserLeftMessage as UserLeftMessageTsProto,
    ItemEventMessage as ItemEventMessageTsProto,
    EmoteEventMessage as EmoteEventMessageTsProto,
    VariableMessage as VariableMessageTsProto,
    PlayerDetailsUpdatedMessage as PlayerDetailsUpdatedMessageTsProto,
    WorldFullWarningMessage,
    WebRtcDisconnectMessage as WebRtcDisconnectMessageTsProto,
    PlayGlobalMessage as PlayGlobalMessageTsProto,
    StopGlobalMessage as StopGlobalMessageTsProto,
    SendJitsiJwtMessage as SendJitsiJwtMessageTsProto,
    SendUserMessage as SendUserMessageTsProto,
    BanUserMessage as BanUserMessageTsProto,
    ClientToServerMessage as ClientToServerMessageTsProto,
    PositionMessage as PositionMessageTsProto,
    ViewportMessage as ViewportMessageTsProto,
    PositionMessage_Direction,
    SetPlayerDetailsMessage as SetPlayerDetailsMessageTsProto,
    PingMessage as PingMessageTsProto,
} from "../Messages/ts-proto-generated/messages";
import { Subject } from "rxjs";
import { OpenPopupEvent } from "../Api/Events/OpenPopupEvent";
import { match } from "assert";

const manualPingDelay = 20000;

export class RoomConnection implements RoomConnection {
    private readonly socket: WebSocket;
    private userId: number | null = null;
    private listeners: Map<string, Function[]> = new Map<string, Function[]>();
    private static websocketFactory: null | ((url: string) => any) = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    private closed: boolean = false;
    private tags: string[] = [];
    private _userRoomToken: string | undefined;

    private readonly _errorMessageStream = new Subject<ErrorMessageTsProto>();
    public readonly errorMessageStream = this._errorMessageStream.asObservable();

    private readonly _roomJoinedMessageStream = new Subject<{
        connection: RoomConnection;
        room: RoomJoinedMessageInterface;
    }>();
    public readonly roomJoinedMessageStream = this._roomJoinedMessageStream.asObservable();

    private readonly _webRtcStartMessageStream = new Subject<UserSimplePeerInterface>();
    public readonly webRtcStartMessageStream = this._webRtcStartMessageStream.asObservable();

    private readonly _webRtcSignalToClientMessageStream = new Subject<WebRtcSignalReceivedMessageInterface>();
    public readonly webRtcSignalToClientMessageStream = this._webRtcSignalToClientMessageStream.asObservable();

    private readonly _webRtcScreenSharingSignalToClientMessageStream =
        new Subject<WebRtcSignalReceivedMessageInterface>();
    public readonly webRtcScreenSharingSignalToClientMessageStream =
        this._webRtcScreenSharingSignalToClientMessageStream.asObservable();

    private readonly _webRtcDisconnectMessageStream = new Subject<WebRtcDisconnectMessageTsProto>();
    public readonly webRtcDisconnectMessageStream = this._webRtcDisconnectMessageStream.asObservable();

    private readonly _teleportMessageMessageStream = new Subject<string>();
    public readonly teleportMessageMessageStream = this._teleportMessageMessageStream.asObservable();

    private readonly _sendJitsiJwtMessageStream = new Subject<SendJitsiJwtMessageTsProto>();
    public readonly sendJitsiJwtMessageStream = this._sendJitsiJwtMessageStream.asObservable();

    private readonly _worldFullMessageStream = new Subject<string | null>();
    public readonly worldFullMessageStream = this._worldFullMessageStream.asObservable();

    private readonly _worldConnexionMessageStream = new Subject<WorldConnexionMessage>();
    public readonly worldConnexionMessageStream = this._worldConnexionMessageStream.asObservable();

    private readonly _tokenExpiredMessageStream = new Subject<TokenExpiredMessage>();
    public readonly tokenExpiredMessageStream = this._tokenExpiredMessageStream.asObservable();

    private readonly _userMovedMessageStream = new Subject<UserMovedMessageTsProto>();
    public readonly userMovedMessageStream = this._userMovedMessageStream.asObservable();

    private readonly _groupUpdateMessageStream = new Subject<GroupCreatedUpdatedMessageInterface>();
    public readonly groupUpdateMessageStream = this._groupUpdateMessageStream.asObservable();

    private readonly _groupDeleteMessageStream = new Subject<GroupDeleteMessageTsProto>();
    public readonly groupDeleteMessageStream = this._groupDeleteMessageStream.asObservable();

    private readonly _userJoinedMessageStream = new Subject<MessageUserJoined>();
    public readonly userJoinedMessageStream = this._userJoinedMessageStream.asObservable();

    private readonly _userLeftMessageStream = new Subject<UserLeftMessageTsProto>();
    public readonly userLeftMessageStream = this._userLeftMessageStream.asObservable();

    private readonly _itemEventMessageStream = new Subject<{
        itemId: number;
        event: string;
        parameters: unknown;
        state: unknown;
    }>();
    public readonly itemEventMessageStream = this._itemEventMessageStream.asObservable();

    private readonly _emoteEventMessageStream = new Subject<EmoteEventMessageTsProto>();
    public readonly emoteEventMessageStream = this._emoteEventMessageStream.asObservable();

    private readonly _variableMessageStream = new Subject<{ name: string; value: unknown }>();
    public readonly variableMessageStream = this._variableMessageStream.asObservable();

    private readonly _playerDetailsUpdatedMessageStream = new Subject<PlayerDetailsUpdatedMessageTsProto>();
    public readonly playerDetailsUpdatedMessageStream = this._playerDetailsUpdatedMessageStream.asObservable();

    private readonly _connectionErrorStream = new Subject<CloseEvent>();
    public readonly connectionErrorStream = this._connectionErrorStream.asObservable();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static setWebsocketFactory(websocketFactory: (url: string) => any): void {
        RoomConnection.websocketFactory = websocketFactory;
    }

    /**
     *
     * @param token A JWT token containing the email of the user
     * @param roomUrl The URL of the room in the form "https://example.com/_/[instance]/[map_url]" or "https://example.com/@/[org]/[event]/[map]"
     * @param name
     * @param characterLayers
     * @param position
     * @param viewport
     * @param companion
     */
    public constructor(
        token: string | null,
        roomUrl: string,
        name: string,
        characterLayers: string[],
        position: PositionInterface,
        viewport: ViewportInterface,
        companion: string | null
    ) {
        let url = new URL(PUSHER_URL, window.location.toString()).toString();
        url = url.replace("http://", "ws://").replace("https://", "wss://");
        if (!url.endsWith("/")) {
            url += "/";
        }
        url += "room";
        url += "?roomId=" + encodeURIComponent(roomUrl);
        url += "&token=" + (token ? encodeURIComponent(token) : "");
        url += "&name=" + encodeURIComponent(name);
        for (const layer of characterLayers) {
            url += "&characterLayers=" + encodeURIComponent(layer);
        }
        url += "&x=" + Math.floor(position.x);
        url += "&y=" + Math.floor(position.y);
        url += "&top=" + Math.floor(viewport.top);
        url += "&bottom=" + Math.floor(viewport.bottom);
        url += "&left=" + Math.floor(viewport.left);
        url += "&right=" + Math.floor(viewport.right);
        if (typeof companion === "string") {
            url += "&companion=" + encodeURIComponent(companion);
        }

        if (RoomConnection.websocketFactory) {
            this.socket = RoomConnection.websocketFactory(url);
        } else {
            this.socket = new WebSocket(url);
        }

        this.socket.binaryType = "arraybuffer";

        let interval: ReturnType<typeof setInterval> | undefined = undefined;

        this.socket.onopen = (ev) => {
            //we manually ping every 20s to not be logged out by the server, even when the game is in background.
            const pingMessage = PingMessageTsProto.encode({}).finish();
            interval = setInterval(() => this.socket.send(pingMessage), manualPingDelay);
        };

        this.socket.addEventListener("close", (event) => {
            if (interval) {
                clearInterval(interval);
            }

            // If we are not connected yet (if a JoinRoomMessage was not sent), we need to retry.
            if (this.userId === null && !this.closed) {
                this._connectionErrorStream.next(event);
            }
        });

        this.socket.onmessage = (messageEvent) => {
            const arrayBuffer: ArrayBuffer = messageEvent.data;

            const serverToClientMessage = ServerToClientMessageTsProto.decode(new Uint8Array(arrayBuffer));
            //const message = ServerToClientMessage.deserializeBinary(new Uint8Array(arrayBuffer));

            const message = serverToClientMessage.message;
            if (message === undefined) {
                return;
            }

            switch (message.$case) {
                case "batchMessage": {
                    for (const subMessageWrapper of message.batchMessage.payload) {
                        const subMessage = subMessageWrapper.message;
                        if (subMessage === undefined) {
                            return;
                        }
                        switch (subMessage.$case) {
                            case "errorMessage": {
                                this._errorMessageStream.next(subMessage.errorMessage);
                                console.error("An error occurred server side: " + subMessage.errorMessage.message);
                                break;
                            }
                            case "userJoinedMessage": {
                                this._userJoinedMessageStream.next(
                                    this.toMessageUserJoined(subMessage.userJoinedMessage)
                                );
                                break;
                            }
                            case "userLeftMessage": {
                                this._userLeftMessageStream.next(subMessage.userLeftMessage);
                                break;
                            }
                            case "userMovedMessage": {
                                this._userMovedMessageStream.next(subMessage.userMovedMessage);
                                break;
                            }
                            case "groupUpdateMessage": {
                                this._groupUpdateMessageStream.next(
                                    this.toGroupCreatedUpdatedMessage(subMessage.groupUpdateMessage)
                                );
                                break;
                            }
                            case "groupDeleteMessage": {
                                this._groupDeleteMessageStream.next(subMessage.groupDeleteMessage);
                                break;
                            }
                            case "itemEventMessage": {
                                this._itemEventMessageStream.next({
                                    itemId: subMessage.itemEventMessage.itemId,
                                    event: subMessage.itemEventMessage.event,
                                    parameters: JSON.parse(subMessage.itemEventMessage.parametersJson),
                                    state: JSON.parse(subMessage.itemEventMessage.stateJson),
                                });
                                break;
                            }
                            case "emoteEventMessage": {
                                this._emoteEventMessageStream.next(subMessage.emoteEventMessage);
                                break;
                            }
                            case "playerDetailsUpdatedMessage": {
                                this._playerDetailsUpdatedMessageStream.next(subMessage.playerDetailsUpdatedMessage);
                                break;
                            }
                            case "variableMessage": {
                                const name = subMessage.variableMessage.name;
                                const serializedValue = subMessage.variableMessage.value;
                                let value: unknown = undefined;
                                if (serializedValue) {
                                    try {
                                        value = JSON.parse(serializedValue);
                                    } catch (e) {
                                        console.error(
                                            'Unable to unserialize value received from server for variable "' +
                                                name +
                                                '". Value received: "' +
                                                serializedValue +
                                                '". Error: ',
                                            e
                                        );
                                    }
                                }

                                this._variableMessageStream.next({ name, value });
                                break;
                            }
                            default: {
                                // Security check: if we forget a "case", the line below will catch the error at compile-time.
                                const tmp: never = subMessage;
                            }
                        }
                    }
                    break;
                }
                case "roomJoinedMessage": {
                    const roomJoinedMessage = message.roomJoinedMessage;

                    const items: { [itemId: number]: unknown } = {};
                    for (const item of roomJoinedMessage.item) {
                        items[item.itemId] = JSON.parse(item.stateJson);
                    }

                    const variables = new Map<string, unknown>();
                    for (const variable of roomJoinedMessage.variable) {
                        try {
                            variables.set(variable.name, JSON.parse(variable.value));
                        } catch (e) {
                            console.error(
                                'Unable to unserialize value received from server for variable "' +
                                    variable.name +
                                    '". Value received: "' +
                                    variable.value +
                                    '". Error: ',
                                e
                            );
                        }
                    }

                    this.userId = roomJoinedMessage.currentUserId;
                    this.tags = roomJoinedMessage.tag;
                    this._userRoomToken = roomJoinedMessage.userRoomToken;

                    this._roomJoinedMessageStream.next({
                        connection: this,
                        room: {
                            items,
                            variables,
                        } as RoomJoinedMessageInterface,
                    });
                    break;
                }
                case "worldFullMessage": {
                    this._worldFullMessageStream.next(null);
                    this.closed = true;
                    break;
                }
                case "tokenExpiredMessage": {
                    connectionManager.logout().catch((e) => console.error(e));
                    this.closed = true; //technically, this isn't needed since loadOpenIDScreen() will do window.location.assign() but I prefer to leave it for consistency
                    break;
                }
                case "worldConnexionMessage": {
                    this._worldFullMessageStream.next(message.worldConnexionMessage.message);
                    this.closed = true;
                    break;
                }
                case "webRtcSignalToClientMessage": {
                    this._webRtcSignalToClientMessageStream.next({
                        userId: message.webRtcSignalToClientMessage.userId,
                        signal: JSON.parse(message.webRtcSignalToClientMessage.signal),
                        webRtcUser: message.webRtcSignalToClientMessage.webrtcUserName
                            ? message.webRtcSignalToClientMessage.webrtcUserName
                            : undefined,
                        webRtcPassword: message.webRtcSignalToClientMessage.webrtcPassword
                            ? message.webRtcSignalToClientMessage.webrtcPassword
                            : undefined,
                    });
                    break;
                }
                case "webRtcScreenSharingSignalToClientMessage": {
                    this._webRtcScreenSharingSignalToClientMessageStream.next({
                        userId: message.webRtcScreenSharingSignalToClientMessage.userId,
                        signal: JSON.parse(message.webRtcScreenSharingSignalToClientMessage.signal),
                        webRtcUser: message.webRtcScreenSharingSignalToClientMessage.webrtcUserName
                            ? message.webRtcScreenSharingSignalToClientMessage.webrtcUserName
                            : undefined,
                        webRtcPassword: message.webRtcScreenSharingSignalToClientMessage.webrtcPassword
                            ? message.webRtcScreenSharingSignalToClientMessage.webrtcPassword
                            : undefined,
                    });
                    break;
                }
                case "webRtcStartMessage": {
                    this._webRtcStartMessageStream.next({
                        userId: message.webRtcStartMessage.userId,
                        initiator: message.webRtcStartMessage.initiator,
                        webRtcUser: message.webRtcStartMessage.webrtcUserName
                            ? message.webRtcStartMessage.webrtcUserName
                            : undefined,
                        webRtcPassword: message.webRtcStartMessage.webrtcPassword
                            ? message.webRtcStartMessage.webrtcPassword
                            : undefined,
                    });
                    break;
                }
                case "webRtcDisconnectMessage": {
                    this._webRtcDisconnectMessageStream.next(message.webRtcDisconnectMessage);
                    break;
                }
                case "teleportMessageMessage": {
                    // FIXME: WHY IS THIS UNUSED? CAN WE REMOVE THIS???
                    this._teleportMessageMessageStream.next(message.teleportMessageMessage.map);
                    break;
                }
                case "sendJitsiJwtMessage": {
                    this._sendJitsiJwtMessageStream.next(message.sendJitsiJwtMessage);
                    break;
                }
                case "sendUserMessage": {
                    adminMessagesService.onSendusermessage(message.sendUserMessage);
                    break;
                }
                case "banUserMessage": {
                    adminMessagesService.onSendusermessage(message.banUserMessage);
                    break;
                }
                case "worldFullWarningMessage": {
                    warningContainerStore.activateWarningContainer();
                    break;
                }
                case "refreshRoomMessage": {
                    //todo: implement a way to notify the user the room was refreshed.
                    break;
                }
                case "followRequestMessage": {
                    if (!localUserStore.getIgnoreFollowRequests()) {
                        followUsersStore.addFollowRequest(message.followRequestMessage.leader);
                    }
                    break;
                }
                case "followConfirmationMessage": {
                    followUsersStore.addFollower(message.followConfirmationMessage.follower);
                    break;
                }
                case "followAbortMessage": {
                    if (get(followRoleStore) === "follower") {
                        followUsersStore.stopFollowing();
                    } else {
                        followUsersStore.removeFollower(message.followAbortMessage.follower);
                    }
                    break;
                }
                case "errorMessage": {
                    this._errorMessageStream.next(message.errorMessage);
                    console.error("An error occurred server side: " + message.errorMessage.message);
                    break;
                }
                default: {
                    // Security check: if we forget a "case", the line below will catch the error at compile-time.
                    const tmp: never = message;
                }
            }
        };
    }

    private dispatch(event: string, payload: unknown): void {
        const listeners = this.listeners.get(event);
        if (listeners === undefined) {
            return;
        }
        for (const listener of listeners) {
            listener(payload);
        }
    }

    /*public emitPlayerDetailsMessage(userName: string, characterLayersSelected: BodyResourceDescriptionInterface[]) {
        const message = new SetPlayerDetailsMessage();
        message.setName(userName);
        message.setCharacterlayersList(characterLayersSelected.map((characterLayer) => characterLayer.name));

        const clientToServerMessage = new ClientToServerMessage();
        clientToServerMessage.setSetplayerdetailsmessage(message);

        this.socket.send(clientToServerMessage.serializeBinary().buffer);
    }*/

    public emitPlayerOutlineColor(color: number | null) {
        let message: SetPlayerDetailsMessageTsProto;
        if (color === null) {
            message = SetPlayerDetailsMessageTsProto.fromPartial({
                removeOutlineColor: true,
            });
        } else {
            message = SetPlayerDetailsMessageTsProto.fromPartial({
                outlineColor: color,
            });
        }

        const bytes = ClientToServerMessageTsProto.encode({
            message: {
                $case: "setPlayerDetailsMessage",
                setPlayerDetailsMessage: message,
            },
        }).finish();

        this.socket.send(bytes);
    }

    public closeConnection(): void {
        this.socket?.close();
        this.closed = true;
    }

    private toPositionMessage(x: number, y: number, direction: string, moving: boolean): PositionMessageTsProto {
        return {
            x: Math.floor(x),
            y: Math.floor(y),
            moving,
            direction: (() => {
                switch (direction) {
                    case "up":
                        return PositionMessage_Direction.UP;
                    case "down":
                        return PositionMessage_Direction.DOWN;
                    case "left":
                        return PositionMessage_Direction.LEFT;
                    case "right":
                        return PositionMessage_Direction.RIGHT;
                    default:
                        throw new Error("Unexpected direction");
                }
            })(),
        };
    }

    private toViewportMessage(viewport: ViewportInterface): ViewportMessageTsProto {
        return {
            left: Math.floor(viewport.left),
            right: Math.floor(viewport.right),
            top: Math.floor(viewport.top),
            bottom: Math.floor(viewport.bottom),
        };
    }

    public sharePosition(x: number, y: number, direction: string, moving: boolean, viewport: ViewportInterface): void {
        if (!this.socket) {
            return;
        }

        const positionMessage = this.toPositionMessage(x, y, direction, moving);

        const viewportMessage = this.toViewportMessage(viewport);

        const bytes = ClientToServerMessageTsProto.encode({
            message: {
                $case: "userMovesMessage",
                userMovesMessage: {
                    position: positionMessage,
                    viewport: viewportMessage,
                },
            },
        }).finish();

        this.socket.send(bytes);
    }

    public setSilent(silent: boolean): void {
        const bytes = ClientToServerMessageTsProto.encode({
            message: {
                $case: "silentMessage",
                silentMessage: {
                    silent,
                },
            },
        }).finish();

        this.socket.send(bytes);
    }

    public setViewport(viewport: ViewportInterface): void {
        const bytes = ClientToServerMessageTsProto.encode({
            message: {
                $case: "viewportMessage",
                viewportMessage: this.toViewportMessage(viewport),
            },
        }).finish();

        this.socket.send(bytes);
    }

    /*    public onUserJoins(callback: (message: MessageUserJoined) => void): void {
        this.onMessage(EventMessage.JOIN_ROOM, (message: UserJoinedMessage) => {
            callback(this.toMessageUserJoined(message));
        });
    }*/

    // TODO: move this to protobuf utils
    private toMessageUserJoined(message: UserJoinedMessageTsProto): MessageUserJoined {
        const position = message.position;
        if (position === undefined) {
            throw new Error("Invalid JOIN_ROOM message");
        }

        const characterLayers = message.characterLayers.map((characterLayer): BodyResourceDescriptionInterface => {
            return {
                name: characterLayer.name,
                img: characterLayer.url,
            };
        });

        const companion = message.companion;

        return {
            userId: message.userId,
            name: message.name,
            characterLayers,
            visitCardUrl: message.visitCardUrl,
            position: ProtobufClientUtils.toPointInterface(position),
            companion: companion ? companion.name : null,
            userUuid: message.userUuid,
            outlineColor: message.hasOutline ? message.outlineColor : undefined,
        };
    }

    /**
     * Registers a listener on a message that is part of a batch
     */
    private onMessage(eventName: string, callback: Function): void {
        let callbacks = this.listeners.get(eventName);
        if (callbacks === undefined) {
            callbacks = new Array<Function>();
            this.listeners.set(eventName, callbacks);
        }
        callbacks.push(callback);
    }

    private toGroupCreatedUpdatedMessage(message: GroupUpdateMessageTsProto): GroupCreatedUpdatedMessageInterface {
        const position = message.position;
        if (position === undefined) {
            throw new Error("Missing position in GROUP_CREATE_UPDATE");
        }

        return {
            groupId: message.groupId,
            position: position,
            groupSize: message.groupSize,
        };
    }

    public onConnectError(callback: (error: Event) => void): void {
        this.socket.addEventListener("error", callback);
    }

    public sendWebrtcSignal(signal: unknown, receiverId: number) {
        const bytes = ClientToServerMessageTsProto.encode({
            message: {
                $case: "webRtcSignalToServerMessage",
                webRtcSignalToServerMessage: {
                    receiverId,
                    signal: JSON.stringify(signal),
                },
            },
        }).finish();

        this.socket.send(bytes);
    }

    public sendWebrtcScreenSharingSignal(signal: unknown, receiverId: number) {
        const bytes = ClientToServerMessageTsProto.encode({
            message: {
                $case: "webRtcScreenSharingSignalToServerMessage",
                webRtcScreenSharingSignalToServerMessage: {
                    receiverId,
                    signal: JSON.stringify(signal),
                },
            },
        }).finish();

        this.socket.send(bytes);
    }

    public onServerDisconnected(callback: () => void): void {
        this.socket.addEventListener("close", (event) => {
            if (this.closed === true || connectionManager.unloading) {
                return;
            }
            console.log("Socket closed with code " + event.code + ". Reason: " + event.reason);
            if (event.code === 1000) {
                // Normal closure case
                return;
            }
            callback();
        });
    }

    public getUserId(): number {
        if (this.userId === null) throw new Error("UserId cannot be null!");
        return this.userId;
    }

    emitActionableEvent(itemId: number, event: string, state: unknown, parameters: unknown): void {
        const bytes = ClientToServerMessageTsProto.encode({
            message: {
                $case: "itemEventMessage",
                itemEventMessage: {
                    itemId,
                    event,
                    stateJson: JSON.stringify(state),
                    parametersJson: JSON.stringify(parameters),
                },
            },
        }).finish();

        this.socket.send(bytes);
    }

    emitSetVariableEvent(name: string, value: unknown): void {
        const bytes = ClientToServerMessageTsProto.encode({
            message: {
                $case: "variableMessage",
                variableMessage: {
                    name,
                    value: JSON.stringify(value),
                },
            },
        }).finish();

        this.socket.send(bytes);
    }

    public uploadAudio(file: FormData) {
        return Axios.post(`${UPLOADER_URL}/upload-audio-message`, file)
            .then((res: { data: {} }) => {
                return res.data;
            })
            .catch((err) => {
                console.error(err);
                throw err;
            });
    }

    public emitGlobalMessage(message: PlayGlobalMessageInterface): void {
        const bytes = ClientToServerMessageTsProto.encode({
            message: {
                $case: "playGlobalMessage",
                playGlobalMessage: {
                    type: message.type,
                    content: message.content,
                    broadcastToWorld: message.broadcastToWorld,
                },
            },
        }).finish();

        this.socket.send(bytes);
    }

    public emitReportPlayerMessage(reportedUserUuid: string, reportComment: string): void {
        const bytes = ClientToServerMessageTsProto.encode({
            message: {
                $case: "reportPlayerMessage",
                reportPlayerMessage: {
                    reportedUserUuid,
                    reportComment,
                },
            },
        }).finish();

        this.socket.send(bytes);
    }

    public emitQueryJitsiJwtMessage(jitsiRoom: string, tag: string | undefined): void {
        const bytes = ClientToServerMessageTsProto.encode({
            message: {
                $case: "queryJitsiJwtMessage",
                queryJitsiJwtMessage: {
                    jitsiRoom,
                    tag: tag ?? "", // empty string is sent as "undefined" by ts-proto
                    // TODO: when we migrated "pusher" to ts-proto, migrate this to a StringValue
                },
            },
        }).finish();

        this.socket.send(bytes);
    }

    public hasTag(tag: string): boolean {
        return this.tags.includes(tag);
    }

    public isAdmin(): boolean {
        return this.hasTag("admin");
    }

    public emitEmoteEvent(emoteName: string): void {
        const bytes = ClientToServerMessageTsProto.encode({
            message: {
                $case: "emotePromptMessage",
                emotePromptMessage: {
                    emote: emoteName,
                },
            },
        }).finish();

        this.socket.send(bytes);
    }

    public emitFollowRequest(): void {
        if (!this.userId) {
            return;
        }

        const bytes = ClientToServerMessageTsProto.encode({
            message: {
                $case: "followRequestMessage",
                followRequestMessage: {
                    leader: this.userId,
                },
            },
        }).finish();

        this.socket.send(bytes);
    }

    public emitFollowConfirmation(): void {
        if (!this.userId) {
            return;
        }

        const bytes = ClientToServerMessageTsProto.encode({
            message: {
                $case: "followConfirmationMessage",
                followConfirmationMessage: {
                    leader: get(followUsersStore)[0],
                    follower: this.userId,
                },
            },
        }).finish();

        this.socket.send(bytes);
    }

    public emitFollowAbort(): void {
        const isLeader = get(followRoleStore) === "leader";
        const hasFollowers = get(followUsersStore).length > 0;
        if (!this.userId || (isLeader && !hasFollowers)) {
            return;
        }

        const bytes = ClientToServerMessageTsProto.encode({
            message: {
                $case: "followAbortMessage",
                followAbortMessage: {
                    leader: isLeader ? this.userId : get(followUsersStore)[0],
                    follower: isLeader ? 0 : this.userId,
                },
            },
        }).finish();

        this.socket.send(bytes);
    }

    public getAllTags(): string[] {
        return this.tags;
    }

    public get userRoomToken(): string | undefined {
        return this._userRoomToken;
    }
}
