const videoConstraint: boolean|MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: "user"
};

type UpdatedLocalStreamCallback = (media: MediaStream) => void;

// TODO: Split MediaManager in 2 classes: MediaManagerUI (in charge of HTML) and MediaManager (singleton in charge of the camera only)
// TODO: verify that microphone event listeners are not triggered plenty of time NOW (since MediaManager is created many times!!!!)
export class MediaManager {
    localStream: MediaStream|null = null;
    private remoteVideo: Map<string, HTMLVideoElement> = new Map<string, HTMLVideoElement>();
    myCamVideo: HTMLVideoElement;
    cinemaClose: HTMLImageElement;
    cinema: HTMLImageElement;
    microphoneClose: HTMLImageElement;
    microphone: HTMLImageElement;
    webrtcInAudio: HTMLAudioElement;
    constraintsMedia : MediaStreamConstraints = {
        audio: true,
        video: videoConstraint
    };
    updatedLocalStreamCallBacks : Set<UpdatedLocalStreamCallback> = new Set<UpdatedLocalStreamCallback>();

    constructor() {
        this.myCamVideo = this.getElementByIdOrFail<HTMLVideoElement>('myCamVideo');
        this.webrtcInAudio = this.getElementByIdOrFail<HTMLAudioElement>('audio-webrtc-in');
        this.webrtcInAudio.volume = 0.2;

        this.microphoneClose = this.getElementByIdOrFail<HTMLImageElement>('microphone-close');
        this.microphoneClose.style.display = "none";
        this.microphoneClose.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            this.enabledMicrophone();
            //update tracking
        });
        this.microphone = this.getElementByIdOrFail<HTMLImageElement>('microphone');
        this.microphone.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            this.disabledMicrophone();
            //update tracking
        });

        this.cinemaClose = this.getElementByIdOrFail<HTMLImageElement>('cinema-close');
        this.cinemaClose.style.display = "none";
        this.cinemaClose.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            this.enabledCamera();
            //update tracking
        });
        this.cinema = this.getElementByIdOrFail<HTMLImageElement>('cinema');
        this.cinema.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            this.disabledCamera();
            //update tracking
        });
    }

    onUpdateLocalStream(callback: UpdatedLocalStreamCallback): void {

        this.updatedLocalStreamCallBacks.add(callback);
    }

    removeUpdateLocalStreamEventListener(callback: UpdatedLocalStreamCallback): void {
        this.updatedLocalStreamCallBacks.delete(callback);
    }

    private triggerUpdatedLocalStreamCallbacks(stream: MediaStream): void {
        for (const callback of this.updatedLocalStreamCallBacks) {
            callback(stream);
        }
    }

    activeVisio(){
        const webRtc = this.getElementByIdOrFail('webRtc');
        webRtc.classList.add('active');
    }

    enabledCamera() {
        this.cinemaClose.style.display = "none";
        this.cinema.style.display = "block";
        this.constraintsMedia.video = videoConstraint;
        this.getCamera().then((stream: MediaStream) => {
            this.triggerUpdatedLocalStreamCallbacks(stream);
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
            this.triggerUpdatedLocalStreamCallbacks(stream);
        });
    }

    enabledMicrophone() {
        this.microphoneClose.style.display = "none";
        this.microphone.style.display = "block";
        this.constraintsMedia.audio = true;
        this.getCamera().then((stream) => {
            this.triggerUpdatedLocalStreamCallbacks(stream);
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
            this.triggerUpdatedLocalStreamCallbacks(stream);
        });
    }

    //get camera
    async getCamera(): Promise<MediaStream> {
        if (navigator.mediaDevices === undefined) {
            if (window.location.protocol === 'http:') {
                throw new Error('Unable to access your camera or microphone. You need to use a HTTPS connection.');
            } else {
                throw new Error('Unable to access your camera or microphone. Your browser is too old.');
            }
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia(this.constraintsMedia);

            this.localStream = stream;
            this.myCamVideo.srcObject = this.localStream;

            return stream;

            //TODO resize remote cam
            /*console.log(this.localStream.getTracks());
            let videoMediaStreamTrack =  this.localStream.getTracks().find((media : MediaStreamTrack) => media.kind === "video");
            let {width, height} = videoMediaStreamTrack.getSettings();
            console.info(`${width}x${height}`); // 6*/
        } catch (err) {
            console.info("error get media ", this.constraintsMedia.video, this.constraintsMedia.audio, err);
            this.localStream = null;
            throw err;
        }
    }

    setCamera(id: string): Promise<MediaStream> {
        let video = this.constraintsMedia.video;
        if (typeof(video) === 'boolean' || video === undefined) {
            video = {}
        }
        video.deviceId = {
            exact: id
        };

        return this.getCamera();
    }

    setMicrophone(id: string): Promise<MediaStream> {
        let audio = this.constraintsMedia.audio;
        if (typeof(audio) === 'boolean' || audio === undefined) {
            audio = {}
        }
        audio.deviceId = {
            exact: id
        };

        return this.getCamera();
    }

    /**
     *
     * @param userId
     */
    addActiveVideo(userId : string, userName: string = ""){
        this.webrtcInAudio.play();
        const elementRemoteVideo = this.getElementByIdOrFail("activeCam");
        userName = userName.toUpperCase();
        const color = this.getColorByString(userName);
        elementRemoteVideo.insertAdjacentHTML('beforeend', `
            <div id="div-${userId}" class="video-container" style="border-color: ${color};">
                <div class="connecting-spinner"></div>
                <div class="rtc-error" style="display: none"></div>
                <i style="background-color: ${color};">${userName}</i>
                <img id="microphone-${userId}" src="resources/logos/microphone-close.svg">
                <video id="${userId}" autoplay></video>
            </div>
        `);
        this.remoteVideo.set(userId, this.getElementByIdOrFail<HTMLVideoElement>(userId));
    }

    /**
     *
     * @param userId
     */
    disabledMicrophoneByUserId(userId: string){
        const element = document.getElementById(`microphone-${userId}`);
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
        const element = document.getElementById(`microphone-${userId}`);
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
        const remoteVideo = this.remoteVideo.get(userId);
        if (remoteVideo === undefined) {
            console.error('Unable to find video for ', userId);
            return;
        }
        remoteVideo.srcObject = stream;
    }

    /**
     *
     * @param userId
     */
    removeActiveVideo(userId : string){
        const element = document.getElementById(`div-${userId}`);
        if(!element){
            return;
        }
        element.remove();
        this.remoteVideo.delete(userId);
    }

    isConnecting(userId : string): void {
        const connectingSpinnerDiv = this.getSpinner(userId);
        if (connectingSpinnerDiv === null) {
            return;
        }
        connectingSpinnerDiv.style.display = 'block';
    }

    isConnected(userId : string): void {
        const connectingSpinnerDiv = this.getSpinner(userId);
        if (connectingSpinnerDiv === null) {
            return;
        }
        connectingSpinnerDiv.style.display = 'none';
    }

    isError(userId : string): void {
        const element = document.getElementById(`div-${userId}`);
        if(!element){
            return;
        }
        const errorDiv = element.getElementsByClassName('rtc-error').item(0) as HTMLDivElement|null;
        if (errorDiv === null) {
            return;
        }
        errorDiv.style.display = 'block';
    }

    private getSpinner(userId : string): HTMLDivElement|null {
        const element = document.getElementById(`div-${userId}`);
        if(!element){
            return null;
        }
        const connnectingSpinnerDiv = element.getElementsByClassName('connecting-spinner').item(0) as HTMLDivElement|null;
        return connnectingSpinnerDiv;
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
            const value = (hash >> (i * 8)) & 255;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }

    private getElementByIdOrFail<T extends HTMLElement>(id: string): T {
        const elem = document.getElementById(id);
        if (elem === null) {
            throw new Error("Cannot find HTML element with id '"+id+"'");
        }
        // FIXME: does not check the type of the returned type
        return elem as T;
    }

}

export const mediaManager = new MediaManager();
