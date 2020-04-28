import {ConnexionInterface} from "../Connexion";
import {MediaManager} from "./MediaManager";
let Peer = require('simple-peer');

export interface SimplePeerInterface {
}

export class SimplePeer {
    Connexion: ConnexionInterface;
    MediaManager: MediaManager;
    RoomId: string;
    Users: Array<any>;

    PeerConnexionArray: Array<any> = new Array<any>();

    constructor(Connexion: ConnexionInterface, roomId: string = "test-webrtc") {
        this.Connexion = Connexion;
        this.RoomId = roomId;
        this.MediaManager = new MediaManager();
        this.initialise();
    }

    /**
     * permit to listen when user could start visio
     */
    private initialise(){

        //receive message start
        this.Connexion.receiveWebrtcStart((message: string) => {
            this.receiveWebrtcStart(message);
        });

        //when button to call is clicked, start video
        this.MediaManager.getElementActivePhone().addEventListener("click", () => {
            this.startWebRtc();
            this.disablePhone();
        });
    }
    /**
     * server has two person connected, start the meet
     */
    startWebRtc() {
        this.MediaManager.activeVisio();
        return this.MediaManager.getCamera().then((stream: MediaStream) => {
            this.MediaManager.localStream = stream;

            //create pear connexion
            this.createPeerConnexion();

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
        this.RoomId = data.roomId;
        this.Users = data.clients;

        //active button for player
        this.activePhone();
    }


    createPeerConnexion() {
        this.Users.forEach((user: any) => {
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

    activePhone(){
         this.MediaManager.activePhoneOpen();
    }

    disablePhone(){
        this.MediaManager.disablePhoneOpen();
    }
}