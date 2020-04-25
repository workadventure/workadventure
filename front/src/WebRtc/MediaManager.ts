export class MediaManager {
    localStream: MediaStream;
    remoteStream: MediaStream;
    remoteVideo: Array<any> = new Array<any>();
    myCamVideo: any;
    cinemaClose: any = null;
    cinema: any = null;
    microphoneClose: any = null;
    microphone: any = null;
    constraintsMedia = {audio: true, video: true};
    getCameraPromise : Promise<any> = null;

    constructor() {
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

        //this.getCamera();
    }

    enabledCamera() {
        this.cinemaClose.style.display = "none";
        this.cinema.style.display = "block";
        this.constraintsMedia.video = true;
        this.localStream = null;
        this.myCamVideo.srcObject = null;
        //this.getCamera();
    }

    disabledCamera() {
        this.cinemaClose.style.display = "block";
        this.cinema.style.display = "none";
        this.constraintsMedia.video = false;

        this.myCamVideo.pause();
        if(this.localStream) {
            this.localStream.getTracks().forEach((MediaStreamTrack: MediaStreamTrack) => {
                if (MediaStreamTrack.kind === "video") {
                    MediaStreamTrack.stop();
                }
            });
        }
        this.localStream = null;
        this.myCamVideo.srcObject = null;
        //this.getCamera();
    }

    enabledMicrophone() {
        this.microphoneClose.style.display = "none";
        this.microphone.style.display = "block";
        this.constraintsMedia.audio = true;
        //this.getCamera();
    }

    disabledMicrophone() {
        this.microphoneClose.style.display = "block";
        this.microphone.style.display = "none";
        this.constraintsMedia.audio = false;
        if(this.localStream) {
            this.localStream.getTracks().forEach((MediaStreamTrack: MediaStreamTrack) => {
                if (MediaStreamTrack.kind === "audio") {
                    MediaStreamTrack.stop();
                }
            });
        }
        //this.getCamera();
    }

    //get camera
    getCamera() {
        return this.getCameraPromise = navigator.mediaDevices.getUserMedia(this.constraintsMedia)
            .then((stream: MediaStream) => {
                this.localStream = stream;
                this.myCamVideo.srcObject = this.localStream;
                this.myCamVideo.play();
                return stream;
            }).catch((err) => {
                console.error(err);
                this.localStream = null;
                throw err;
            });
    }

    /**
     *
     * @param userId
     */
    addActiveVideo(userId : any){
        let elementRemoteVideo = document.getElementById("activeCam");
        elementRemoteVideo.insertAdjacentHTML('beforeend', '<video id="myCamVideo'+userId+'" autoplay></video>');

        this.remoteVideo[userId] = document.getElementById('myCamVideo'+userId);
    }
}