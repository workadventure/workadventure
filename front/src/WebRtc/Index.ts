/*import {ConnexionInterface} from "../Connexion";

const Peer = require('simple-peer');

let cinemaClose : any = null;
let cinema : any = null;
let microphoneClose : any = null;
let microphone : any = null;

let localStream : MediaStream = null;
let remoteStream : MediaStream = null;
let remoteVideo : any = null;
let myCamVideo : any = null;

let promiseGetCam : Promise<any> = null;

let peer : any = null;

let Connexion : ConnexionInterface = null;

let roomId = "test-wertc";

let gettingCamera : Promise<any> = null;
let constraintsMedia = {audio: true, video: true};

function joinRoom(){
    Connexion.JoinRoomWebRtc(roomId);
    Connexion.startRoomWebRtc(initialiseWebSocket)
}

function initialiseWebSocket(message : any){
    console.log('initialiseWebSocket => message', message);
    peer = new Peer({
        initiator: message.initiator
    });

    peer.on('signal', (data : any) => {
        //send signal
        //permit to send message and initialise peer connexion
        console.log('signal sended', data);
        Connexion.shareSignalWebRtc({
            roomId: roomId,
            signal: data
        });
    });

    //permit to receive message and initialise peer connexion
    Connexion.receiveSignalWebRtc((data : any) => {
        let signal = JSON.parse(data);
        console.log('receiveSignalWebRtc => signal', signal);
        peer.signal(signal.signal);
    });

    peer.on('stream', (stream : MediaStream) => {
        // got remote video stream, now let's show it in a video tag
        console.log("peer => stream", stream);

        //set local stream in little cam
        myCamVideo.srcObject = localStream;

        //set remote stream in remote video
        remoteStream = stream;
        remoteVideo.srcObject = stream;
    });

    peer.on('connect', () => {
        console.log('CONNECT')
        peer.send('whatever' + Math.random())
    });

    peer.on('data', (data : any) => {
        console.log('data: ' + data)
    });

    peer.on('close', (err : any) => console.error('close', err));
    peer.on('error', (err : any) => console.error('error', err));


    peer.on('track', (track : any, stream : any) => {
        remoteStream = stream;
        remoteVideo.srcObject = stream;
        track.onended = (e : any) => remoteVideo.srcObject = remoteVideo.srcObject; // Chrome/Firefox bug
    });

    gettingCamera.then(() => {
        addMedia();
    });
}

//get camera
function getCamera() {
    gettingCamera = navigator.mediaDevices.getUserMedia(constraintsMedia)
        .then((stream: MediaStream) => {
            localStream = stream;
            remoteVideo.srcObject = stream;
        }).catch((err) => {
            console.error(err);
            localStream = null;
            throw err;
        });
    return gettingCamera;
}

function addMedia () {
    if(peer) {
        peer.addStream(localStream) // <- add streams to peer dynamically
    }
}

function enabledCamera(){
    cinemaClose.style.display = "none";
    cinema.style.display = "block";
    constraintsMedia.video = true;
}

function disabledCamera(){
    cinemaClose.style.display = "block";
    cinema.style.display = "none";
    constraintsMedia.video = false;
}

function enabledMicrophone(){
    microphoneClose.style.display = "none";
    microphone.style.display = "block";
    constraintsMedia.audio = true;
}

function disabledMicrophone(){
    microphoneClose.style.display = "block";
    microphone.style.display = "none";
    constraintsMedia.audio = false;
}

function showWebRtc(){
    remoteVideo = document.getElementById('activeCamVideo');
    myCamVideo = document.getElementById('myCamVideo');

    microphoneClose = document.getElementById('microphone-close');
    microphoneClose.addEventListener('click', (e : any) => {
        e.preventDefault();
        enabledMicrophone();
        //update tracking
    });

    microphone = document.getElementById('microphone');
    microphone.addEventListener('click', (e : any) => {
        e.preventDefault();
        disabledMicrophone();
        //update tracking
    });

    cinemaClose = document.getElementById('cinema-close');
    cinemaClose.addEventListener('click', (e : any) => {
        e.preventDefault();
        enabledCamera();
        //update tracking
    });
    cinema = document.getElementById('cinema');
    cinema.addEventListener('click', (e : any) => {
        e.preventDefault();
        disabledCamera();
        //update tracking
    });

    enabledMicrophone();
    enabledCamera();

    let webRtc = document.getElementById('webRtc');
    webRtc.classList.add('active');
}

export const initialisation = (ConnexionInterface : ConnexionInterface) => {
    Connexion = ConnexionInterface;

    //show camera
    showWebRtc();

    //open the camera
    getCamera();

    //join room to create webrtc
    joinRoom();
};*/