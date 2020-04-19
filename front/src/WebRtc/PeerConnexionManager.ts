import {WebRtcEventManager} from "./WebRtcEventManager";
import {MediaManager} from "./MediaManager";
const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1,
    iceServers: [{url:'stun:stun.l.google.com:19302'}],
};

export class PeerConnexionManager {

    WebRtcEventManager: WebRtcEventManager;
    MediaManager : MediaManager;

    peerConnection: RTCPeerConnection;

    constructor(WebRtcEventManager : WebRtcEventManager) {
        this.WebRtcEventManager = WebRtcEventManager;
        this.MediaManager = new MediaManager();
    }

    createPeerConnection(data: any = null): Promise<any> {
        this.peerConnection = new RTCPeerConnection();

        //init all events peer connection
        this.createEventPeerConnection();

        this.MediaManager.getCameraPromise.then(() => {
            this.MediaManager.localStream.getTracks().forEach(
                (track : MediaStreamTrack) => this.peerConnection.addTrack(track,  this.MediaManager.localStream)
            );
        });

        //if no data, create offer
        if (!data || !data.message) {
            return this.createOffer();
        }

        let description = new RTCSessionDescription(data.message);
        return this.peerConnection.setRemoteDescription(description).catch((err) => {
            console.error("createPeerConnection => setRemoteDescription", err);
            throw err;
        })
    }

    createOffer(): Promise<any> {
        console.log('pc1 createOffer start');
        // @ts-ignore
        return this.peerConnection.createOffer(offerOptions).then((offer: RTCSessionDescriptionInit) => {
            this.peerConnection.setLocalDescription(offer).then(() => {
                let message = {message: this.peerConnection.localDescription};
                this.WebRtcEventManager.emitVideoOffer(message);
            }).catch((err) => {
                console.error("createOffer => setLocalDescription", err);
                throw err;
            });
        }).catch((err: Error) => {
            console.error("createOffer => createOffer", err);
            throw err;
        });
    }

    createAnswer(): Promise<any> {
        return this.peerConnection.createAnswer().then((answer : RTCSessionDescriptionInit) => {
            this.peerConnection.setLocalDescription(answer).then(() => {
                //push video-answer
                let messageSend = {message: this.peerConnection.localDescription};
                this.WebRtcEventManager.emitVideoAnswer(messageSend);
                console.info("video-answer => send", messageSend);
            }).catch((err) => {
                console.error("eventVideoOffer => createAnswer => setLocalDescription", err);
                throw err;
            })
        }).catch((err) => {
            console.error("eventVideoOffer => createAnswer", err);
            throw err;
        })
    }

    setRemoteDescription(data: any): Promise<any> {
        let description = new RTCSessionDescription(data.message);
        return this.peerConnection.setRemoteDescription(description).catch((err) => {
            console.error("PeerConnexionManager => setRemoteDescription", err);
            throw err;
        })
    }

    addIceCandidate(data: any): Promise<any> {
        return this.peerConnection.addIceCandidate(data.message)
            .catch((err) => {
                console.error("PeerConnexionManager => addIceCandidate", err);
                throw err;
            })
    }

    hangup() {
        console.log('Ending call');
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        this.peerConnection = null;
    }

    createEventPeerConnection(){
        //define creator of offer
        this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            let message = {message: event.candidate};
            if (!event.candidate) {
                return;
            }
            this.WebRtcEventManager.emitIceCandidate(message);
        };

        this.peerConnection.ontrack = (e:RTCTrackEvent) => {
            console.info('Event:track', e);
            this.MediaManager.remoteVideo.srcObject = e.streams[0];
            this.MediaManager.myCamVideo.srcObject = e.streams[0];
        };

        this.peerConnection.onnegotiationneeded = (e : Event) => {
            console.info("Event:negotiationneeded => call()", e);
            this.createOffer()
        };
        this.peerConnection.oniceconnectionstatechange = (e) => {
            console.info('ICE state change event: ', e);
        };
        this.peerConnection.oniceconnectionstatechange = (e:Event) => {
            console.info('oniceconnectionstatechange => iceConnectionState', this.peerConnection.iceConnectionState);
        };
        this.peerConnection.onicegatheringstatechange = () => {
            console.info('onicegatheringstatechange => iceConnectionState', this.peerConnection.iceConnectionState);
        };
        this.peerConnection.onsignalingstatechange = () => {
            console.info('onsignalingstatechange => iceConnectionState', this.peerConnection.iceConnectionState);
        };
    }
}