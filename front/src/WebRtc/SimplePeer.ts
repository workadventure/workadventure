import {ConnexionInterface} from "../Connexion";
import {MediaManager} from "./MediaManager";
let Peer = require('simple-peer');

export interface SimplePeerInterface {
    startWebRtc(): void;
}

export class SimplePeer {
    Connexion: ConnexionInterface;
    MediaManager: MediaManager;
    RoomId: string;

    PeerConnexionArray: Array<any> = new Array<any>();

    constructor(Connexion: ConnexionInterface, roomId: string = "test-webrtc") {
        this.Connexion = Connexion;
        this.RoomId = roomId;
    }

    /**
     * server has two person connected, start the meet
     */
    startWebRtc() {
        this.MediaManager = new MediaManager();
        return this.MediaManager.getCamera().then((stream: MediaStream) => {
            this.MediaManager.localStream = stream;
            //send message to join a room
            this.Connexion.sendWebrtcRomm(this.RoomId);

            //receive message start
            this.Connexion.receiveWebrtcStart((message: string) => {
                this.receiveWebrtcStart(message);
            });

            //receive signal by gemer
            this.Connexion.receiveWebrtcSignal((message: string) => {
                this.receiveWebrtcSignal(message);
            });
        }).catch((err) => {
            console.error(err);
        });
    }

    /**
     *
     * @param message
     */
    receiveWebrtcStart(message: string) {
        let data = JSON.parse(message);

        //create pear connexion of user stared
        this.createPeerConnexion(data);
    }

    /**
     *
     * @param users
     */
    createPeerConnexion(users : Array<any>) {
        users.forEach((user: any) => {
            if(this.PeerConnexionArray[user.userId]){
                return;
            }
            this.MediaManager.addActiveVideo(user.userId);

            this.PeerConnexionArray[user.userId] = new Peer({initiator: user.initiator});

            this.PeerConnexionArray[user.userId].on('signal', (data: any) => {
                this.sendWebrtcSignal(data, user.userId);
            });

            this.PeerConnexionArray[user.userId].on('stream', (stream: MediaStream) => {
                this.stream(user.userId, stream);
            });

            this.PeerConnexionArray[user.userId].on('close', () => {
                this.closeConnexion(user.userId);
            });

            this.addMedia(user.userId);
        });

    }

    closeConnexion(userId : string){
        // @ts-ignore
        this.PeerConnexionArray[userId] = null;
        this.MediaManager.removeActiveVideo(userId)
    }

    /**
     *
     * @param userId
     * @param data
     */
    sendWebrtcSignal(data: any, userId : string) {
        this.Connexion.sendWebrtcSignal(data, this.RoomId, null, userId);
    }

    /**
     *
     * @param message
     */
    receiveWebrtcSignal(message: string) {
        let data = JSON.parse(message);
        if(!this.PeerConnexionArray[data.userId]){
            return;
        }
        this.PeerConnexionArray[data.userId].signal(data.signal);
    }

    /**
     *
     * @param userId
     * @param stream
     */
    stream(userId : any, stream: MediaStream) {
        this.MediaManager.remoteVideo[userId].srcObject = stream;
    }

    /**
     *
     * @param userId
     */
     addMedia (userId : any) {
         this.PeerConnexionArray[userId].addStream(this.MediaManager.localStream) // <- add streams to peer dynamically
    }
}