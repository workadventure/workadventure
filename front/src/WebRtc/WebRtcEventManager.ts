import {ConnexionInterface} from "../Connexion";
import {PeerConnexionManager} from "./PeerConnexionManager";

export class WebRtcEventManager {
    Connexion: ConnexionInterface;
    PeerConnexionManager: PeerConnexionManager;
    RoomId : string;

    constructor(Connexion : ConnexionInterface, roomId : string = "test-webrtc") {
        this.RoomId = roomId;
        this.Connexion = Connexion;
        this.PeerConnexionManager = new PeerConnexionManager(this);

        this.start();
        this.eventVideoOffer();
        this.eventVideoAnswer();
        this.eventIceCandidate();

        //start to connect on event
        //TODO test 
        this.emitWebRtcRoom();
    }

    /**
     * server has two person connected, start the meet
     */
    start(){
        this.Connexion.socket.on('webrtc-start', () => {
            return this.PeerConnexionManager.createPeerConnection();
        });
    }

    /**
     * Receive video offer
     */
    eventVideoOffer() {
        this.Connexion.socket.on("video-offer", (message : any) => {
            let data = JSON.parse(message);
            console.info("video-offer", data);
            this.PeerConnexionManager.createPeerConnection(data).then(() => {
                return this.PeerConnexionManager.createAnswer();
            });
        });
    }

    /**
     * Receive video answer
     */
    eventVideoAnswer() {
        this.Connexion.socket.on("video-answer", (message : any) => {
            let data = JSON.parse(message);
            console.info("video-answer", data);
            this.PeerConnexionManager.setRemoteDescription(data)
                .catch((err) => {
                    console.error("video-answer => setRemoteDescription", err)
                })
        });
    }

    /**
     * Receive ice candidate
     */
    eventIceCandidate() {
        this.Connexion.socket.on("ice-candidate", (message : any) => {
            let data = JSON.parse(message);
            console.info("ice-candidate", data);
            this.PeerConnexionManager.addIceCandidate(data).then(() => {
                console.log(`ICE candidate:\n${data.message ? data.message.candidate : '(null)'}`);
            });
        });
    }

    emitWebRtcRoom(){
        //connect on the room to create a meet
        this.Connexion.socket.emit('webrtc-room', JSON.stringify({roomId: this.RoomId}));
    }

    emitIceCandidate(message : any){
        message.roomId = this.RoomId;
        this.Connexion.socket.emit('ice-candidate', JSON.stringify(message));
    }

    emitVideoOffer(message : any){
        message.roomId = this.RoomId;
        this.Connexion.socket.emit('video-offer', JSON.stringify(message));
    }

    emitVideoAnswer(message : any){
        message.roomId = this.RoomId;
        this.Connexion.socket.emit("video-answer", JSON.stringify(message));
    }
}