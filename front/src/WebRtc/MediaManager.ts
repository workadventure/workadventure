export class MediaManager {
    localStream: MediaStream;
    remoteStream: MediaStream;
    remoteVideo: any;
    myCamVideo: any;
    cinemaClose: any = null;
    cinema: any = null;
    microphoneClose: any = null;
    microphone: any = null;
    constraintsMedia = {audio: true, video: true};
    getCameraPromise : Promise<any> = null;

    constructor() {
        this.remoteVideo = document.getElementById('activeCamVideo');
        this.myCamVideo = document.getElementById('myCamVideo');

        this.microphoneClose = document.getElementById('microphone-close');
        this.microphoneClose.addEventListener('click', (e: any) => {
            e.preventDefault();
            this.enabledMicrophone();
            //update tracking
        });

        this.microphone = document.getElementById('microphone');
        this.microphone.addEventListener('click', (e: any) => {
            e.preventDefault();
            this.disabledMicrophone();
            //update tracking
        });

        this.cinemaClose = document.getElementById('cinema-close');
        this.cinemaClose.addEventListener('click', (e: any) => {
            e.preventDefault();
            this.enabledCamera();
            //update tracking
        });
        this.cinema = document.getElementById('cinema');
        this.cinema.addEventListener('click', (e: any) => {
            e.preventDefault();
            this.disabledCamera();
            //update tracking
        });

        this.enabledMicrophone();
        this.enabledCamera();

        let webRtc = document.getElementById('webRtc');
        webRtc.classList.add('active');

        this.getCamera();
    }

    enabledCamera() {
        this.cinemaClose.style.display = "none";
        this.cinema.style.display = "block";
        this.constraintsMedia.video = true;
    }

    disabledCamera() {
        this.cinemaClose.style.display = "block";
        this.cinema.style.display = "none";
        this.constraintsMedia.video = false;
    }

    enabledMicrophone() {
        this.microphoneClose.style.display = "none";
        this.microphone.style.display = "block";
        this.constraintsMedia.audio = true;
    }

    disabledMicrophone() {
        this.microphoneClose.style.display = "block";
        this.microphone.style.display = "none";
        this.constraintsMedia.audio = false;
    }

    //get camera
    getCamera() {
        this.getCameraPromise = navigator.mediaDevices.getUserMedia(this.constraintsMedia)
            .then((stream: MediaStream) => {
                this.localStream = stream;
                this.myCamVideo.srcObject = this.localStream;
            }).catch((err) => {
                console.error(err);
                this.localStream = null;
                throw err;
            });
    }
}