import {ConnexionInterface} from "../Connexion";
import {MediaManager} from "./MediaManager";
let Peer = require('simple-peer');

export class SimplePeer {
    Connexion: ConnexionInterface;
    MediaManager: MediaManager;
    RoomId: string;

    PeerConnexion: any;
    PeerConnexionArray: Array<any> = new Array<any>();

    constructor(Connexion: ConnexionInterface, roomId: string = "test-webrtc") {
        this.Connexion = Connexion;
        this.MediaManager = new MediaManager();
        this.RoomId = roomId;
        this.initialise();
    }

    /**
     * server has two person connected, start the meet
     */
    initialise() {
        return this.MediaManager.getCamera().then(() => {
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
        console.log("createPeerConnexion", users);
        users.forEach((user: any) => {
            if(this.PeerConnexionArray[user.userId]){
                return;
            }
            this.MediaManager.addActiveVideo(user.userId);

            this.PeerConnexion = new Peer({initiator: user.initiator});

            this.PeerConnexion.on('signal', (data: any) => {
                this.sendWebrtcSignal(data);
            });

            this.PeerConnexion.on('stream', (stream: MediaStream) => {
                this.stream(user.userId, stream);
            });

            this.PeerConnexionArray[user.userId] = this.PeerConnexion;
            this.addMedia(user.userId);
        });

        /*let elements = document.getElementById("activeCam");
        console.log("element.childNodes", elements.childNodes);
        elements.childNodes.forEach((element : any) => {
            if(!element.id){
                return;
            }
            if(users.find((user) => user.userId === element.id)){
                return;
            }
            elements.removeChild(element);
        });*/
    }

    /**
     *
     * @param userId
     * @param data
     */
    sendWebrtcSignal(data: any, userId : string) {
        this.Connexion.sendWebrtcSignal(data, this.RoomId, userId);
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