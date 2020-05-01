import {ConnexionInterface} from "../Connexion";
import {MediaManager} from "./MediaManager";
let Peer = require('simple-peer');

export interface SimplePeerInterface {
}
enum PeerConnexionStatus{
    DISABLED = 1,
    ACTIVATED = 2
}
export class SimplePeer {
    private Connexion: ConnexionInterface;
    private MediaManager: MediaManager;
    private WebRtcRoomId: string;
    private Users: Array<any>;

    private PeerConnexionArray: Array<any> = new Array<any>();

    private PeerConnexionStatus : number = PeerConnexionStatus.DISABLED;

    constructor(Connexion: ConnexionInterface, WebRtcRoomId: string = "test-webrtc") {
        this.Connexion = Connexion;
        this.WebRtcRoomId = WebRtcRoomId;
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
        /*this.MediaManager.getElementActivePhone().addEventListener("click", () => {
            this.startWebRtc();
            this.disablePhone();
        });*/

        return this.MediaManager.getCamera().then((stream: MediaStream) => {
            this.MediaManager.activeVisio();
            this.MediaManager.localStream = stream;
        });
    }
    /**
     * server has two person connected, start the meet
     */
    private startWebRtc() {
        //create pear connexion
        this.createPeerConnexion();

        //receive signal by gemer
        this.Connexion.receiveWebrtcSignal((message: string) => {
            this.receiveWebrtcSignal(message);
        });

        // add media or new media for all peer connexion
        this.Users.forEach((user: any) => {
            this.addMedia(user.userId);
        });

        //change status to manage other user
        this.PeerConnexionStatus = PeerConnexionStatus.ACTIVATED;
    }

    /**
     *
     * @param message
     */
    private receiveWebrtcStart(message: string) {
        let data = JSON.parse(message);
        this.WebRtcRoomId = data.roomId;
        this.Users = data.clients;

        console.log("receiveWebrtcStart", this.Users);

        //start connexion
        this.startWebRtc();
    }


    private createPeerConnexion() {
        this.Users.forEach((user: any) => {
            if (this.PeerConnexionArray[user.userId]) {
                return;
            }
            this.MediaManager.addActiveVideo(user.userId);

            console.info("createPeerConnexion => create peerConexion", user);
            this.PeerConnexionArray[user.userId] = new Peer({
                initiator: user.initiator,
                config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478?transport=udp' }] }
            });

            //add lof info PeerConnexionArray
            this.PeerConnexionArray[user.userId]._debug = console.info;

            this.PeerConnexionArray[user.userId].on('signal', (data: any) => {
                console.info("createPeerConnexion => sendWebrtcSignal : "+user.userId, data);
                this.sendWebrtcSignal(data, user.userId);
            });

            this.PeerConnexionArray[user.userId].on('stream', (stream: MediaStream) => {
                this.stream(user.userId, stream);
            });

            this.PeerConnexionArray[user.userId].on('close', () => {
                console.info("createPeerConnexion => close", user.userId);
                this.closeConnexion(user.userId);
            });

            this.addMedia(user.userId);
        });
    }

    private closeConnexion(userId : string){
        // @ts-ignore
        this.PeerConnexionArray[userId] = null;
        this.MediaManager.removeActiveVideo(userId)
    }

    /**
     *
     * @param userId
     * @param data
     */
    private sendWebrtcSignal(data: any, userId : string) {
        this.Connexion.sendWebrtcSignal(data, this.WebRtcRoomId, null, userId);
    }

    /**
     *
     * @param message
     */
    private receiveWebrtcSignal(message: string) {
        let data = JSON.parse(message);
        console.log("receiveWebrtcSignal", data);
        console.log("this.PeerConnexionArray[data.userId]", this.PeerConnexionArray[data.userId]);
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
    private stream(userId : any, stream: MediaStream) {
        this.MediaManager.remoteVideo[userId].srcObject = stream;
    }

    /**
     *
     * @param userId
     */
    private addMedia (userId : any = null) {
        if (!this.MediaManager.localStream || !this.PeerConnexionArray[userId]) {
            return;
        }
        this.PeerConnexionArray[userId].addStream(this.MediaManager.localStream) // <- add streams to peer dynamically
        return;
    }

    private activePhone(){
         this.MediaManager.activePhoneOpen();
    }

    private disablePhone(){
        this.MediaManager.disablePhoneOpen();
    }
}