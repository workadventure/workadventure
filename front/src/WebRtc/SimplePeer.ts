import {ConnectionInterface} from "../Connection";
import {MediaManager} from "./MediaManager";
let Peer = require('simple-peer');

class UserSimplePear{
    userId: string;
    name?: string;
    initiator?: boolean;
}
export class SimplePeerInterface {}
export class SimplePeer implements SimplePeerInterface{
    private Connection: ConnectionInterface;
    private WebRtcRoomId: string;
    private Users: Array<UserSimplePear> = new Array<UserSimplePear>();

    private MediaManager: MediaManager;

    private PeerConnectionArray: Map<string, any> = new Map<string, any>();

    constructor(Connection: ConnectionInterface, WebRtcRoomId: string = "test-webrtc") {
        this.Connection = Connection;
        this.WebRtcRoomId = WebRtcRoomId;
        this.MediaManager = new MediaManager((stream : MediaStream) => {
            this.updatedLocalStream();
        });
        this.initialise();
    }

    /**
     * permit to listen when user could start visio
     */
    private initialise() {

        //receive signal by gemer
        this.Connection.receiveWebrtcSignal((message: any) => {
            this.receiveWebrtcSignal(message);
        });

        this.MediaManager.activeVisio();
        this.MediaManager.getCamera().then(() => {

            //receive message start
            this.Connection.receiveWebrtcStart((message: any) => {
                this.receiveWebrtcStart(message);
            });

        }).catch((err) => {
            console.error("err", err);
        });

        //receive signal by gemer
        this.Connection.disconnectMessage((data: any) => {
            this.closeConnection(data.userId);
        });
    }

    private receiveWebrtcStart(data: any) {
        this.WebRtcRoomId = data.roomId;
        this.Users = data.clients;

        //start connection
        this.startWebRtc();
    }

    /**
     * server has two person connected, start the meet
     */
    private startWebRtc() {
        this.Users.forEach((user: UserSimplePear) => {
            //if it's not an initiator, peer connection will be created when gamer will receive offer signal
            if(!user.initiator){
                return;
            }
            this.createPeerConnection(user);
        });
    }

    /**
     * create peer connection to bind users
     */
    private createPeerConnection(user : UserSimplePear) {
        if(this.PeerConnectionArray.has(user.userId)) {
            return;
        }

        let name = user.name;
        if(!name){
            let userSearch = this.Users.find((userSearch: UserSimplePear) => userSearch.userId === user.userId);
            if(userSearch) {
                name = userSearch.name;
            }
        }
        this.MediaManager.removeActiveVideo(user.userId);
        this.MediaManager.addActiveVideo(user.userId, name);

        let peer : any = new Peer({
            initiator: user.initiator ? user.initiator : false,
            reconnectTimer: 10000,
            config: {
                iceServers: [
                    {
                        urls: 'stun:stun.l.google.com:19302'
                    },
                    {
                        urls: 'turn:numb.viagenie.ca',
                        username: 'g.parant@thecodingmachine.com',
                        credential: 'itcugcOHxle9Acqi$'
                    },
                ]
            },
        });
        this.PeerConnectionArray.set(user.userId, peer);

        //start listen signal for the peer connection
        this.PeerConnectionArray.get(user.userId).on('signal', (data: any) => {
            this.sendWebrtcSignal(data, user.userId);
        });

        this.PeerConnectionArray.get(user.userId).on('stream', (stream: MediaStream) => {
            let videoActive = false;
            let microphoneActive = false;
            stream.getTracks().forEach((track :  MediaStreamTrack) => {
                if(track.kind === "audio"){
                    microphoneActive = true;
                }
                if(track.kind === "video"){
                    videoActive = true;
                }
            });
            if(microphoneActive){
                this.MediaManager.enabledMicrophoneByUserId(user.userId);
            }else{
                this.MediaManager.disabledMicrophoneByUserId(user.userId);
            }

            if(videoActive){
                this.MediaManager.enabledVideoByUserId(user.userId);
            }else{
                this.MediaManager.disabledVideoByUserId(user.userId);
            }
            this.stream(user.userId, stream);
        });

        /*this.PeerConnectionArray.get(user.userId).on('track', (track: MediaStreamTrack, stream: MediaStream) => {
            this.stream(user.userId, stream);
        });*/

        this.PeerConnectionArray.get(user.userId).on('close', () => {
            this.closeConnection(user.userId);
        });

        this.PeerConnectionArray.get(user.userId).on('error', (err: any) => {
            console.error(`error => ${user.userId} => ${err.code}`, err);
        });

        this.PeerConnectionArray.get(user.userId).on('connect', () => {
            console.info(`connect => ${user.userId}`);
        });

        this.PeerConnectionArray.get(user.userId).on('data',  (chunk: Buffer) => {
            let data = JSON.parse(chunk.toString('utf8'));
            if(data.type === "stream"){
                this.stream(user.userId, data.stream);
            }
        });

        this.addMedia(user.userId);
    }

    private closeConnection(userId : string) {
        try {
            this.MediaManager.removeActiveVideo(userId);
            if (!this.PeerConnectionArray.get(userId)) {
                return;
            }
            // @ts-ignore
            this.PeerConnectionArray.get(userId).destroy();
            this.PeerConnectionArray.delete(userId)
        } catch (err) {
            console.error("closeConnection", err)
        }
    }

    /**
     *
     * @param userId
     * @param data
     */
    private sendWebrtcSignal(data: any, userId : string) {
        try {
            this.Connection.sendWebrtcSignal(data, this.WebRtcRoomId, null, userId);
        }catch (e) {
            console.error(`sendWebrtcSignal => ${userId}`, e);
        }
    }

    private receiveWebrtcSignal(data: any) {
        try {
            //if offer type, create peer connection
            if(data.signal.type === "offer"){
                this.createPeerConnection(data);
            }
            this.PeerConnectionArray.get(data.userId).signal(data.signal);
        } catch (e) {
            console.error(`receiveWebrtcSignal => ${data.userId}`, e);
        }
    }

    /**
     *
     * @param userId
     * @param stream
     */
    private stream(userId : any, stream: MediaStream) {
        if(!stream){
            this.MediaManager.disabledVideoByUserId(userId);
            this.MediaManager.disabledMicrophoneByUserId(userId);
            return;
        }
        this.MediaManager.addStreamRemoteVideo(userId, stream);
    }

    /**
     *
     * @param userId
     */
    private addMedia (userId : any = null) {
        try {
            let transceiver : any = null;
            if(!this.MediaManager.localStream){
                //send fake signal
                if(!this.PeerConnectionArray.has(userId)){
                    return;
                }
                this.PeerConnectionArray.get(userId).write(new Buffer(JSON.stringify({
                    type: "stream",
                    stream: null
                })));
                return;
            }
            this.MediaManager.localStream.getTracks().forEach(
                transceiver = (track: MediaStreamTrack) => this.PeerConnectionArray.get(userId).addTrack(track, this.MediaManager.localStream)
            )
        }catch (e) {
            console.error(`addMedia => addMedia => ${userId}`, e);
        }
    }

    updatedLocalStream(){
        this.Users.forEach((user: UserSimplePear) => {
            this.addMedia(user.userId);
        })
    }
}
