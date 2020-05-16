import {ConnexionInterface} from "../Connexion";
import {MediaManager} from "./MediaManager";
let Peer = require('simple-peer');

class UserSimplePear{
    userId: string;
    name?: string;
    initiator?: boolean;
}
export class SimplePeerInterface {}
export class SimplePeer implements SimplePeerInterface{
    private Connexion: ConnexionInterface;
    private WebRtcRoomId: string;
    private Users: Array<UserSimplePear> = new Array<UserSimplePear>();

    private MediaManager: MediaManager;

    private PeerConnexionArray: Map<string, any> = new Map<string, any>();

    constructor(Connexion: ConnexionInterface, WebRtcRoomId: string = "test-webrtc") {
        this.Connexion = Connexion;
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
        this.Connexion.receiveWebrtcSignal((message: any) => {
            this.receiveWebrtcSignal(message);
        });

        this.MediaManager.activeVisio();
        this.MediaManager.getCamera().then(() => {

            //receive message start
            this.Connexion.receiveWebrtcStart((message: any) => {
                this.receiveWebrtcStart(message);
            });

        }).catch((err) => {
            console.error("err", err);
        });

        //receive signal by gemer
        this.Connexion.disconnectMessage((data: any) => {
            this.closeConnexion(data.userId);
        });
    }

    private receiveWebrtcStart(data: any) {
        this.WebRtcRoomId = data.roomId;
        this.Users = data.clients;

        //start connexion
        this.startWebRtc();
    }

    /**
     * server has two person connected, start the meet
     */
    private startWebRtc() {
        this.Users.forEach((user: UserSimplePear) => {
            //if it's not an initiator, peer connexion will be created when gamer will receive offer signal
            if(!user.initiator){
                return;
            }
            this.createPeerConnexion(user);
        });
    }

    /**
     * create peer connexion to bind users
     */
    private createPeerConnexion(user : UserSimplePear) {
        if(this.PeerConnexionArray.has(user.userId)) {
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
        this.PeerConnexionArray.set(user.userId, peer);

        //start listen signal for the peer connexion
        this.PeerConnexionArray.get(user.userId).on('signal', (data: any) => {
            this.sendWebrtcSignal(data, user.userId);
        });

        this.PeerConnexionArray.get(user.userId).on('stream', (stream: MediaStream) => {
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

        this.PeerConnexionArray.get(user.userId).on('track', (track: MediaStreamTrack, stream: MediaStream) => {
            this.stream(user.userId, stream);
        });

        this.PeerConnexionArray.get(user.userId).on('close', () => {
            this.closeConnexion(user.userId);
        });

        this.PeerConnexionArray.get(user.userId).on('error', (err: any) => {
            console.error(`error => ${user.userId} => ${err.code}`, err);
        });

        this.PeerConnexionArray.get(user.userId).on('connect', () => {
            console.info(`connect => ${user.userId}`);
        });

        this.addMedia(user.userId);
    }

    private closeConnexion(userId : string) {
        try {
            this.MediaManager.removeActiveVideo(userId);
            if (!this.PeerConnexionArray.get(userId)) {
                return;
            }
            // @ts-ignore
            this.PeerConnexionArray.get(userId).destroy();
            this.PeerConnexionArray.delete(userId)
        } catch (err) {
            console.error("closeConnexion", err)
        }
    }

    /**
     *
     * @param userId
     * @param data
     */
    private sendWebrtcSignal(data: any, userId : string) {
        try {
            this.Connexion.sendWebrtcSignal(data, this.WebRtcRoomId, null, userId);
        }catch (e) {
            console.error(`sendWebrtcSignal => ${userId}`, e);
        }
    }

    private receiveWebrtcSignal(data: any) {
        try {
            //if offer type, create peer connexion
            if(data.signal.type === "offer"){
                this.createPeerConnexion(data);
            }
            this.PeerConnexionArray.get(data.userId).signal(data.signal);
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
                return;
            }
            this.MediaManager.localStream.getTracks().forEach(
                transceiver = (track: MediaStreamTrack) => this.PeerConnexionArray.get(userId).addTrack(track, this.MediaManager.localStream)
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
