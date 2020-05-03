const videoConstraint: {width : any, height: any, facingMode : string} = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: "user"
};
export class MediaManager {
    localStream: MediaStream;
    remoteVideo: Array<any> = new Array<any>();
    myCamVideo: any;
    cinemaClose: any = null;
    cinema: any = null;
    microphoneClose: any = null;
    microphone: any = null;
    constraintsMedia : {audio : any, video : any} = {
        audio: true,
        video: videoConstraint
    };
    getCameraPromise : Promise<any> = null;
    updatedLocalStreamCallBack : Function;

    constructor(updatedLocalStreamCallBack : Function) {
        this.updatedLocalStreamCallBack = updatedLocalStreamCallBack;

        this.myCamVideo = document.getElementById('myCamVideo');

        this.microphoneClose = document.getElementById('microphone-close');
        this.microphoneClose.style.display = "none";
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
        this.cinemaClose.style.display = "none";
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
    }

    activeVisio(){
        let webRtc = document.getElementById('webRtc');
        webRtc.classList.add('active');
    }

    enabledCamera() {
        this.cinemaClose.style.display = "none";
        this.cinema.style.display = "block";
        this.constraintsMedia.video = videoConstraint;
        this.localStream = null;
        this.myCamVideo.srcObject = null;
        this.getCamera().then((stream) => {
            this.updatedLocalStreamCallBack(stream);
        });
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
        this.getCamera().then((stream) => {
            this.updatedLocalStreamCallBack(stream);
        });
    }

    enabledMicrophone() {
        this.microphoneClose.style.display = "none";
        this.microphone.style.display = "block";
        this.constraintsMedia.audio = true;
        this.getCamera().then((stream) => {
            this.updatedLocalStreamCallBack(stream);
        });
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
        this.getCamera().then((stream) => {
            this.updatedLocalStreamCallBack(stream);
        });
    }

    //get camera
    getCamera() {
        return this.getCameraPromise = navigator.mediaDevices.getUserMedia(this.constraintsMedia)
            .then((stream: MediaStream) => {
                this.localStream = stream;
                this.myCamVideo.srcObject = this.localStream;

                //TODO resize remote cam
                /*console.log(this.localStream.getTracks());
                let videoMediaStreamTrack =  this.localStream.getTracks().find((media : MediaStreamTrack) => media.kind === "video");
                let {width, height} = videoMediaStreamTrack.getSettings();
                console.info(`${width}x${height}`); // 6*/

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
    addActiveVideo(userId : string){
        let elementRemoteVideo = document.getElementById("activeCam");
        elementRemoteVideo.insertAdjacentHTML('beforeend', '<video id="'+userId+'" autoplay></video>');
        this.remoteVideo[(userId as any)] = document.getElementById(userId);
    }

    /**
     *
     * @param userId
     * @param stream
     */
    addStreamRemoteVideo(userId : string, stream : MediaStream){
        this.remoteVideo[(userId as any)].srcObject = stream;
    }

    /**
     *
     * @param userId
     */
    removeActiveVideo(userId : string){
        let element = document.getElementById(userId);
        if(!element){
            return;
        }
        element.remove();
    }
}