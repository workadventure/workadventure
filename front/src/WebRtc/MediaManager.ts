const videoConstraint: {width : any, height: any, facingMode : string} = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: "user"
};
export class MediaManager {
    localStream: MediaStream|null = null;
    remoteVideo: Array<any> = new Array<any>();
    myCamVideo: HTMLVideoElement;
    cinemaClose: any = null;
    cinema: any = null;
    microphoneClose: any = null;
    microphone: any = null;
    webrtcInAudio: HTMLAudioElement;
    constraintsMedia : {audio : any, video : any} = {
        audio: true,
        video: videoConstraint
    };
    updatedLocalStreamCallBack : Function;

    constructor(updatedLocalStreamCallBack : Function) {
        this.updatedLocalStreamCallBack = updatedLocalStreamCallBack;

        this.myCamVideo = this.getElementByIdOrFail<HTMLVideoElement>('myCamVideo');
        this.webrtcInAudio = this.getElementByIdOrFail<HTMLAudioElement>('audio-webrtc-in');
        this.webrtcInAudio.volume = 0.2;

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
        let webRtc = this.getElementByIdOrFail('webRtc');
        webRtc.classList.add('active');
    }

    enabledCamera() {
        this.cinemaClose.style.display = "none";
        this.cinema.style.display = "block";
        this.constraintsMedia.video = videoConstraint;
        this.getCamera().then((stream) => {
            this.updatedLocalStreamCallBack(stream);
        });
    }

    disabledCamera() {
        this.cinemaClose.style.display = "block";
        this.cinema.style.display = "none";
        this.constraintsMedia.video = false;
        this.myCamVideo.srcObject = null;
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach((MediaStreamTrack: MediaStreamTrack) => {
                MediaStreamTrack.stop();
            });
        }
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
            this.localStream.getAudioTracks().forEach((MediaStreamTrack: MediaStreamTrack) => {
                MediaStreamTrack.stop();
            });
        }
        this.getCamera().then((stream) => {
            this.updatedLocalStreamCallBack(stream);
        });
    }

    //get camera
    getCamera() {
        let promise = null;
        try {
            promise = navigator.mediaDevices.getUserMedia(this.constraintsMedia)
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
                    console.info(`error get media {video: ${this.constraintsMedia.video}},{audio: ${this.constraintsMedia.audio}}`,err);
                    this.localStream = null;
                });
        } catch (e) {
            promise = Promise.reject(false);
        }
        return promise;
    }

    /**
     *
     * @param userId
     */
    addActiveVideo(userId : string, userName: string = ""){
        this.webrtcInAudio.play();
        let elementRemoteVideo = this.getElementByIdOrFail("activeCam");
        userName = userName.toUpperCase();
        let color = this.getColorByString(userName);
        elementRemoteVideo.insertAdjacentHTML('beforeend', `
            <div id="div-${userId}" class="video-container" style="border-color: ${color};">
                <i style="background-color: ${color};">${userName}</i>
                <img id="microphone-${userId}" src="resources/logos/microphone-close.svg">
                <video id="${userId}" autoplay></video>
            </div>
        `);
        this.remoteVideo[(userId as any)] = document.getElementById(userId);
    }

    /**
     *
     * @param userId
     */
    disabledMicrophoneByUserId(userId: string){
        let element = document.getElementById(`microphone-${userId}`);
        if(!element){
            return;
        }
        element.classList.add('active')
    }

    /**
     *
     * @param userId
     */
    enabledMicrophoneByUserId(userId: string){
        let element = document.getElementById(`microphone-${userId}`);
        if(!element){
            return;
        }
        element.classList.remove('active')
    }

    /**
     *
     * @param userId
     */
    disabledVideoByUserId(userId: string) {
        let element = document.getElementById(`${userId}`);
        if (element) {
            element.style.opacity = "0";
        }
        element = document.getElementById(`div-${userId}`);
        if (!element) {
            return;
        }
        element.style.borderStyle = "solid";
    }

    /**
     *
     * @param userId
     */
    enabledVideoByUserId(userId: string){
        let element = document.getElementById(`${userId}`);
        if(element){
            element.style.opacity = "1";
        }
        element = document.getElementById(`div-${userId}`);
        if(!element){
            return;
        }
        element.style.borderStyle = "none";
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
        let element = document.getElementById(`div-${userId}`);
        if(!element){
            return;
        }
        element.remove();
    }

    /**
     *
     * @param str
     */
    private getColorByString(str: String) : String|null {
        let hash = 0;
        if (str.length === 0) return null;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash;
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            let value = (hash >> (i * 8)) & 255;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }

    private getElementByIdOrFail<T extends HTMLElement>(id: string): T {
        let elem = document.getElementById("activeCam");
        if (elem === null) {
            throw new Error("Cannot find HTML element with id '"+id+"'");
        }
        // FIXME: does not check the type of the returned type
        return elem as T;
    }

}
