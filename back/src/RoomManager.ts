import {IRoomManagerServer} from "./Messages/generated/messages_grpc_pb";
import {
    ClientToServerMessage, ItemEventMessage,
    JoinRoomMessage, PlayGlobalMessage, PusherToBackMessage, QueryJitsiJwtMessage, ReportPlayerMessage,
    RoomJoinedMessage,
    ServerToClientMessage, SilentMessage, UserMovesMessage, ViewportMessage, WebRtcSignalToServerMessage, ZoneMessage
} from "./Messages/generated/messages_pb";
import grpc, {ServerWritableStream} from "grpc";
import {Empty} from "google-protobuf/google/protobuf/empty_pb";
import {socketManager} from "./Services/SocketManager";
import {emitError} from "./Services/IoSocketHelpers";
import {User, UserSocket} from "./Model/User";
import {GameRoom} from "./Model/GameRoom";
import Debug from "debug";

const debug = Debug('roommanager');

export type ZoneSocket = ServerWritableStream<ZoneMessage, ServerToClientMessage>;

const roomManager: IRoomManagerServer = {
    joinRoom: (call: UserSocket): void => {
        console.log('joinRoom called');

        let room: GameRoom|null = null;
        let user: User|null = null;

        call.on('data', (message: PusherToBackMessage) => {
            try {
                if (room === null || user === null) {
                    if (message.hasJoinroommessage()) {
                        socketManager.handleJoinRoom(call, message.getJoinroommessage() as JoinRoomMessage).then(({room: gameRoom, user: myUser}) => {
                            room = gameRoom;
                            user = myUser;
                        });
                    } else {
                        throw new Error('The first message sent MUST be of type JoinRoomMessage');
                    }
                } else {
                    if (message.hasJoinroommessage()) {
                        throw new Error('Cannot call JoinRoomMessage twice!');
                    /*} else if (message.hasViewportmessage()) {
                        socketManager.handleViewport(client, message.getViewportmessage() as ViewportMessage);*/
                    } else if (message.hasUsermovesmessage()) {
                        socketManager.handleUserMovesMessage(room, user, message.getUsermovesmessage() as UserMovesMessage);
                        /*} else if (message.hasSetplayerdetailsmessage()) {
                            socketManager.handleSetPlayerDetails(client, message.getSetplayerdetailsmessage() as SetPlayerDetailsMessage);*/
                    } else if (message.hasSilentmessage()) {
                        socketManager.handleSilentMessage(room, user, message.getSilentmessage() as SilentMessage);
                    } else if (message.hasItemeventmessage()) {
                        socketManager.handleItemEvent(room, user, message.getItemeventmessage() as ItemEventMessage);
                    } else if (message.hasWebrtcsignaltoservermessage()) {
                        socketManager.emitVideo(room, user, message.getWebrtcsignaltoservermessage() as WebRtcSignalToServerMessage);
                    } else if (message.hasWebrtcscreensharingsignaltoservermessage()) {
                        socketManager.emitScreenSharing(room, user, message.getWebrtcscreensharingsignaltoservermessage() as WebRtcSignalToServerMessage);
                    } else if (message.hasPlayglobalmessage()) {
                        socketManager.emitPlayGlobalMessage(room, message.getPlayglobalmessage() as PlayGlobalMessage);
                    /*} else if (message.hasReportplayermessage()){
                        socketManager.handleReportMessage(client, message.getReportplayermessage() as ReportPlayerMessage);*/
                    } else if (message.hasQueryjitsijwtmessage()){
                        socketManager.handleQueryJitsiJwtMessage(user, message.getQueryjitsijwtmessage() as QueryJitsiJwtMessage);
                    } else {
                        throw new Error('Unhandled message type');
                    }
                }
            } catch (e) {
                emitError(call, e);
                call.end();
            }

        });

        call.on('end', () => {
            debug('joinRoom ended');
            if (user !== null && room !== null) {
                socketManager.leaveRoom(room, user);
            }
            call.end();
            room = null;
            user = null;
        });

        call.on('error', (err: Error) => {
            console.error('An error occurred in joinRoom stream:', err);
        });

    },

    listenZone(call: ZoneSocket): void {
        debug('listenZone called');
        const zoneMessage = call.request;

        socketManager.addZoneListener(call, zoneMessage.getRoomid(), zoneMessage.getX(), zoneMessage.getY());

        call.on('cancelled', () => {
            debug('listenZone cancelled');
            socketManager.removeZoneListener(call, zoneMessage.getRoomid(), zoneMessage.getX(), zoneMessage.getY());
            call.end();
        })

        /*call.on('finish', () => {
            debug('listenZone finish');
        })*/
        call.on('close', () => {
            debug('listenZone connection closed');
            socketManager.removeZoneListener(call, zoneMessage.getRoomid(), zoneMessage.getX(), zoneMessage.getY());
        }).on('error', (e) => {
            console.error('An error occurred in listenZone stream:', e);
            socketManager.removeZoneListener(call, zoneMessage.getRoomid(), zoneMessage.getX(), zoneMessage.getY());
            call.end();
        });
    },
};

export {roomManager};
