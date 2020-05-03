import {ConnexionInterface} from "../Connexion";
import {MediaManager} from "./MediaManager";
let Peer = require('simple-peer');

export interface SimplePeerInterface {
}

export class SimplePeer {
    private Connexion: ConnexionInterface;
    private WebRtcRoomId: string;
    private Users: Array<any>;

    private MediaManager: MediaManager;

    private PeerConnexionArray: Array<any> = new Array<any>();

    constructor(Connexion: ConnexionInterface, WebRtcRoomId: string = "test-webrtc") {
        this.Connexion = Connexion;
        this.WebRtcRoomId = WebRtcRoomId;
        this.MediaManager = new MediaManager((stream : MediaStream) => {
            this.updatedLocalStream();
        });
        this.PeerConnexionArray = new Array<any>();

        this.initialise();
    }

    /**
     * permit to listen when user could start visio
     */
    private initialise() {

        //receive signal by gemer
        this.Connexion.receiveWebrtcSignal((message: string) => {
            this.receiveWebrtcSignal(message);
        });

        this.MediaManager.activeVisio();
        this.MediaManager.getCamera().then(() => {

            //receive message start
            this.Connexion.receiveWebrtcStart((message: string) => {
                this.receiveWebrtcStart(message);
            });

        }).catch((err) => {
            console.error("err", err);
        });

        //receive signal by gemer
        this.Connexion.disconnectMessage((message: string) => {
            let data = JSON.parse(message);
            this.closeConnexion(data.userId);
        });
    }

    /**
     *
     * @param message
     */
    private receiveWebrtcStart(message: string) {
        let data = JSON.parse(message);
        this.WebRtcRoomId = data.roomId;
        this.Users = data.clients;

        //start connexion
        this.startWebRtc();
    }

    /**
     * server has two person connected, start the meet
     */
    private startWebRtc() {
        this.Users.forEach((user: any) => {
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
    private createPeerConnexion(user : any) {
        if(this.PeerConnexionArray[user.userId]) {
            return;
        }

        this.MediaManager.removeActiveVideo(user.userId);
        this.MediaManager.addActiveVideo(user.userId);

        this.PeerConnexionArray[user.userId] = new Peer({
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

        //start listen signal for the peer connexion
        this.PeerConnexionArray[user.userId].on('signal', (data: any) => {
            this.sendWebrtcSignal(data, user.userId);
        });

        this.PeerConnexionArray[user.userId].on('stream', (stream: MediaStream) => {
            this.stream(user.userId, stream);
        });

        this.PeerConnexionArray[user.userId].on('track', (track: MediaStreamTrack, stream: MediaStream) => {
            this.stream(user.userId, stream);
        });

        this.PeerConnexionArray[user.userId].on('close', () => {
            this.closeConnexion(user.userId);
        });

        this.PeerConnexionArray[user.userId].on('error', (err: any) => {
            console.error(`error => ${user.userId} => ${err.code}`, err);
        });

        this.PeerConnexionArray[user.userId].on('connect', () => {
            console.info(`connect => ${user.userId}`);
        });

        this.addMedia(user.userId);
    }

    private closeConnexion(userId : string) {
        try {
            this.MediaManager.removeActiveVideo(userId);
            if (!this.PeerConnexionArray[(userId as any)]) {
                return;
            }
            // @ts-ignore
            this.PeerConnexionArray[(userId as any)].destroy();
            this.PeerConnexionArray[(userId as any)] = null;
            delete this.PeerConnexionArray[(userId as any)];
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

    /**
     *
     * @param message
     */
    private receiveWebrtcSignal(message: string) {
        let data = JSON.parse(message);
        try {
            //if offer type, create peer connexion
            if(data.signal.type === "offer"){
                this.createPeerConnexion(data);
            }
            this.PeerConnexionArray[data.userId].signal(data.signal);
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
            this.MediaManager.localStream.getTracks().forEach(
                transceiver = (track: MediaStreamTrack) => this.PeerConnexionArray[userId].addTrack(track, this.MediaManager.localStream)
            )
        }catch (e) {
            console.error(`addMedia => addMedia => ${userId}`, e);
        }
    }

    updatedLocalStream(){
        this.Users.forEach((user) => {
            this.addMedia(user.userId);
        })
    }
}