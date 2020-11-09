import {CharacterLayer, ExSocketInterface} from "../Model/Websocket/ExSocketInterface"; //TODO fix import by "_Model/.."
import {GameRoomPolicyTypes} from "../Model/GameRoom";
import {PointInterface} from "../Model/Websocket/PointInterface";
import {
    SetPlayerDetailsMessage,
    SubMessage,
    BatchMessage,
    ItemEventMessage,
    ViewportMessage,
    ClientToServerMessage,
    SilentMessage,
    WebRtcSignalToServerMessage,
    PlayGlobalMessage,
    ReportPlayerMessage,
    QueryJitsiJwtMessage
} from "../Messages/generated/messages_pb";
import {UserMovesMessage} from "../Messages/generated/messages_pb";
import {TemplatedApp} from "uWebSockets.js"
import {parse} from "query-string";
import {jwtTokenManager} from "../Services/JWTTokenManager";
import {adminApi, CharacterTexture, FetchMemberDataByUuidResponse} from "../Services/AdminApi";
import {SocketManager, socketManager} from "../Services/SocketManager";
import {emitInBatch, pongMaxInterval, refresLogoutTimerOnPong, resetPing} from "../Services/IoSocketHelpers";
import {clientEventsEmitter} from "../Services/ClientEventsEmitter";
import {ADMIN_API_TOKEN, ADMIN_API_URL} from "../Enum/EnvironmentVariable";

export class IoSocketController {
    private nextUserId: number = 1;

    constructor(private readonly app: TemplatedApp) {
        this.ioConnection();
        this.adminRoomSocket();
    }

    adminRoomSocket() {
        this.app.ws('/admin/rooms', {
            upgrade: (res, req, context) => {
                const query = parse(req.getQuery());
                const websocketKey = req.getHeader('sec-websocket-key');
                const websocketProtocol = req.getHeader('sec-websocket-protocol');
                const websocketExtensions = req.getHeader('sec-websocket-extensions');
                const token = query.token;
                if (token !== ADMIN_API_TOKEN) {
                    console.log('Admin access refused for token: '+token)
                    res.writeStatus("401 Unauthorized").end('Incorrect token');
                }
                const roomId = query.roomId as string;

                res.upgrade(
                    {roomId},
                    websocketKey, websocketProtocol, websocketExtensions, context,
                    );
            },
            open: (ws) => {
                console.log('Admin socket connect for room: '+ws.roomId);
                ws.send('Data:'+JSON.stringify(socketManager.getAdminSocketDataFor(ws.roomId as string)));
                ws.clientJoinCallback = (clientUUid: string, roomId: string) => {
                    const wsroomId = ws.roomId as string;
                    if(wsroomId === roomId) {
                        ws.send('MemberJoin:'+clientUUid+';'+roomId);
                    }
                };
                ws.clientLeaveCallback = (clientUUid: string, roomId: string) => {
                    const wsroomId = ws.roomId as string;
                    if(wsroomId === roomId) {
                        ws.send('MemberLeave:'+clientUUid+';'+roomId);
                    }
                };
                clientEventsEmitter.registerToClientJoin(ws.clientJoinCallback);
                clientEventsEmitter.registerToClientLeave(ws.clientLeaveCallback);
            },
            message: (ws, arrayBuffer, isBinary): void => {
                try {
                    //TODO refactor message type and data
                    const message: {event: string, message: {type: string, message: unknown, userUuid: string}} =
                        JSON.parse(new TextDecoder("utf-8").decode(new Uint8Array(arrayBuffer)));

                    if(message.event === 'user-message') {
                        const messageToEmit = (message.message as { message: string, type: string, userUuid: string });
                        switch (message.message.type) {
                            case 'ban': {
                                socketManager.emitSendUserMessage(messageToEmit);
                                break;
                            }
                            case 'banned': {
                                const socketUser = socketManager.emitSendUserMessage(messageToEmit);
                                setTimeout(() => {
                                    socketUser.close();
                                }, 10000);
                                break;
                            }
                            default: {
                                break;
                            }
                        }
                    }
                }catch (err) {
                    console.error(err);
                }
            },
            close: (ws, code, message) => {
                //todo make sure this code unregister the right listeners
                clientEventsEmitter.unregisterFromClientJoin(ws.clientJoinCallback);
                clientEventsEmitter.unregisterFromClientLeave(ws.clientLeaveCallback);
            }
        })
    }

    ioConnection() {
        this.app.ws('/room', {
            /* Options */
            //compression: uWS.SHARED_COMPRESSOR,
            maxPayloadLength: 16 * 1024 * 1024,
            maxBackpressure: 65536, // Maximum 64kB of data in the buffer.
            //idleTimeout: 10,
            upgrade: (res, req, context) => {
                //console.log('An Http connection wants to become WebSocket, URL: ' + req.getUrl() + '!');
                (async () => {
                    /* Keep track of abortions */
                    const upgradeAborted = {aborted: false};

                    res.onAborted(() => {
                        /* We can simply signal that we were aborted */
                        upgradeAborted.aborted = true;
                    });

                    try {
                        const url = req.getUrl();
                        const query = parse(req.getQuery());
                        const websocketKey = req.getHeader('sec-websocket-key');
                        const websocketProtocol = req.getHeader('sec-websocket-protocol');
                        const websocketExtensions = req.getHeader('sec-websocket-extensions');

                        const roomId = query.roomId;
                        if (typeof roomId !== 'string') {
                            throw new Error('Undefined room ID: ');
                        }

                        const token = query.token;
                        const x = Number(query.x);
                        const y = Number(query.y);
                        const top = Number(query.top);
                        const bottom = Number(query.bottom);
                        const left = Number(query.left);
                        const right = Number(query.right);
                        const name = query.name;
                        if (typeof name !== 'string') {
                            throw new Error('Expecting name');
                        }
                        if (name === '') {
                            throw new Error('No empty name');
                        }
                        let characterLayers = query.characterLayers;
                        if (characterLayers === null) {
                            throw new Error('Expecting skin');
                        }
                        if (typeof characterLayers === 'string') {
                            characterLayers = [ characterLayers ];
                        }

                        const userUuid = await jwtTokenManager.getUserUuidFromToken(token);

                        let memberTags: string[] = [];
                        let memberTextures: CharacterTexture[] = [];
                        const room = await socketManager.getOrCreateRoom(roomId);
                        if(room.isFull){
                            throw new Error('Room is full');
                        }
                        if (ADMIN_API_URL) {
                            try {
                                const userData = await adminApi.fetchMemberDataByUuid(userUuid);
                                //console.log('USERDATA', userData)
                                memberTags = userData.tags;
                                memberTextures = userData.textures;
                                if (!room.anonymous && room.policyType === GameRoomPolicyTypes.USE_TAGS_POLICY && !room.canAccess(memberTags)) {
                                    throw new Error('No correct tags')
                                }
                                //console.log('access granted for user '+userUuid+' and room '+roomId);
                            } catch (e) {
                                console.log('access not granted for user '+userUuid+' and room '+roomId);
                                console.error(e);
                                throw new Error('Client cannot acces this ressource.')
                            }
                        }

                        // Generate characterLayers objects from characterLayers string[]
                        const characterLayerObjs: CharacterLayer[] = SocketManager.mergeCharacterLayersAndCustomTextures(characterLayers, memberTextures);

                        if (upgradeAborted.aborted) {
                            console.log("Ouch! Client disconnected before we could upgrade it!");
                            /* You must not upgrade now */
                            return;
                        }

                        /* This immediately calls open handler, you must not use res after this call */
                        res.upgrade({
                                // Data passed here is accessible on the "websocket" socket object.
                                url,
                                token,
                                userUuid,
                                roomId,
                                name,
                                characterLayers: characterLayerObjs,
                                tags: memberTags,
                                textures: memberTextures,
                                position: {
                                    x: x,
                                    y: y,
                                    direction: 'down',
                                    moving: false
                                } as PointInterface,
                                viewport: {
                                    top,
                                    right,
                                    bottom,
                                    left
                                }
                            },
                            /* Spell these correctly */
                            websocketKey,
                            websocketProtocol,
                            websocketExtensions,
                            context);

                    } catch (e) {
                        if (e instanceof Error) {
                            console.log(e.message);
                            res.writeStatus("401 Unauthorized").end(e.message);
                        } else {
                            console.log(e);
                            res.writeStatus("500 Internal Server Error").end('An error occurred');
                        }
                        return;
                    }
                })();
            },
            /* Handlers */
            open: (ws) => {
                // Let's join the room
                const client = this.initClient(ws); //todo: into the upgrade instead?
                socketManager.handleJoinRoom(client);
                resetPing(client);
                refresLogoutTimerOnPong(ws as ExSocketInterface);

                //get data information and show messages
                if (ADMIN_API_URL) {
                    adminApi.fetchMemberDataByUuid(client.userUuid).then((res: FetchMemberDataByUuidResponse) => {
                        if (!res.messages) {
                            return;
                        }
                        res.messages.forEach((c: unknown) => {
                            const messageToSend = c as { type: string, message: string };
                            socketManager.emitSendUserMessage({
                                userUuid: client.userUuid,
                                type: messageToSend.type,
                                message: messageToSend.message
                            })
                        });
                    }).catch((err) => {
                        console.error('fetchMemberDataByUuid => err', err);
                    });
                }
            },
            message: (ws, arrayBuffer, isBinary): void => {
                const client = ws as ExSocketInterface;
                const message = ClientToServerMessage.deserializeBinary(new Uint8Array(arrayBuffer));

                if (message.hasViewportmessage()) {
                    socketManager.handleViewport(client, message.getViewportmessage() as ViewportMessage);
                } else if (message.hasUsermovesmessage()) {
                    socketManager.handleUserMovesMessage(client, message.getUsermovesmessage() as UserMovesMessage);
                } else if (message.hasSetplayerdetailsmessage()) {
                    socketManager.handleSetPlayerDetails(client, message.getSetplayerdetailsmessage() as SetPlayerDetailsMessage);
                } else if (message.hasSilentmessage()) {
                    socketManager.handleSilentMessage(client, message.getSilentmessage() as SilentMessage);
                } else if (message.hasItemeventmessage()) {
                    socketManager.handleItemEvent(client, message.getItemeventmessage() as ItemEventMessage);
                } else if (message.hasWebrtcsignaltoservermessage()) {
                    socketManager.emitVideo(client, message.getWebrtcsignaltoservermessage() as WebRtcSignalToServerMessage);
                } else if (message.hasWebrtcscreensharingsignaltoservermessage()) {
                    socketManager.emitScreenSharing(client, message.getWebrtcscreensharingsignaltoservermessage() as WebRtcSignalToServerMessage);
                } else if (message.hasPlayglobalmessage()) {
                    socketManager.emitPlayGlobalMessage(client, message.getPlayglobalmessage() as PlayGlobalMessage);
                } else if (message.hasReportplayermessage()){
                    socketManager.handleReportMessage(client, message.getReportplayermessage() as ReportPlayerMessage);
                } else if (message.hasQueryjitsijwtmessage()){
                    socketManager.handleQueryJitsiJwtMessage(client, message.getQueryjitsijwtmessage() as QueryJitsiJwtMessage);
                }

                    /* Ok is false if backpressure was built up, wait for drain */
                //let ok = ws.send(message, isBinary);
            },
            drain: (ws) => {
                console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
            },
            pong(ws) {
                refresLogoutTimerOnPong(ws as ExSocketInterface);
            },
            close: (ws, code, message) => {
                const Client = (ws as ExSocketInterface);
                try {
                    Client.disconnecting = true;
                    //leave room
                    socketManager.leaveRoom(Client);
                } catch (e) {
                    console.error('An error occurred on "disconnect"');
                    console.error(e);
                }
            }
        })
    }

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    private initClient(ws: any): ExSocketInterface {
        const client : ExSocketInterface = ws;
        client.userId = this.nextUserId;
        this.nextUserId++;
        client.userUuid = ws.userUuid;
        client.token = ws.token;
        client.batchedMessages = new BatchMessage();
        client.batchTimeout = null;
        client.emitInBatch = (payload: SubMessage): void => {
            emitInBatch(client, payload);
        }
        client.disconnecting = false;

        client.name = ws.name;
        client.tags = ws.tags;
        client.textures = ws.textures;
        client.characterLayers = ws.characterLayers;
        client.roomId = ws.roomId;
        return client;
    }
}
