import * as SimplePeerNamespace from "simple-peer";
import {DivImportance, layoutManager} from "./LayoutManager";

const videoConstraint: boolean|MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: "user"
};

type UpdatedLocalStreamCallback = (media: MediaStream) => void;
type UpdatedScreenSharingCallback = (media: MediaStream) => void;

// TODO: Split MediaManager in 2 classes: MediaManagerUI (in charge of HTML) and MediaManager (singleton in charge of the camera only)
// TODO: verify that microphone event listeners are not triggered plenty of time NOW (since MediaManager is created many times!!!!)
export class MediaManager {
    localStream: MediaStream|null = null;
    localScreenCapture: MediaStream|null = null;
    private remoteVideo: Map<string, HTMLVideoElement> = new Map<string, HTMLVideoElement>();
    myCamVideo: HTMLVideoElement;
    cinemaClose: HTMLImageElement;
    cinema: HTMLImageElement;
    monitorClose: HTMLImageElement;
    monitor: HTMLImageElement;
    microphoneClose: HTMLImageElement;
    microphone: HTMLImageElement;
    webrtcInAudio: HTMLAudioElement;
    constraintsMedia : MediaStreamConstraints = {
        audio: true,
        video: videoConstraint
    };
    updatedLocalStreamCallBacks : Set<UpdatedLocalStreamCallback> = new Set<UpdatedLocalStreamCallback>();
    updatedScreenSharingCallBacks : Set<UpdatedScreenSharingCallback> = new Set<UpdatedScreenSharingCallback>();


    constructor() {

        this.myCamVideo = this.getElementByIdOrFail<HTMLVideoElement>('myCamVideo');
        this.webrtcInAudio = this.getElementByIdOrFail<HTMLAudioElement>('audio-webrtc-in');
        this.webrtcInAudio.volume = 0.2;

        this.microphoneClose = this.getElementByIdOrFail<HTMLImageElement>('microphone-close');
        this.microphoneClose.style.display = "none";
        this.microphoneClose.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            this.enableMicrophone();
            //update tracking
        });
        this.microphone = this.getElementByIdOrFail<HTMLImageElement>('microphone');
        this.microphone.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            this.disableMicrophone();
            //update tracking
        });

        this.cinemaClose = this.getElementByIdOrFail<HTMLImageElement>('cinema-close');
        this.cinemaClose.style.display = "none";
        this.cinemaClose.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            this.enableCamera();
            //update tracking
        });
        this.cinema = this.getElementByIdOrFail<HTMLImageElement>('cinema');
        this.cinema.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            this.disableCamera();
            //update tracking
        });

        this.monitorClose = this.getElementByIdOrFail<HTMLImageElement>('monitor-close');
        this.monitorClose.style.display = "block";
        this.monitorClose.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            this.enableScreenSharing();
            //update tracking
        });
        this.monitor = this.getElementByIdOrFail<HTMLImageElement>('monitor');
        this.monitor.style.display = "none";
        this.monitor.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            this.disableScreenSharing();
            //update tracking
        });
    }

    public onUpdateLocalStream(callback: UpdatedLocalStreamCallback): void {

        this.updatedLocalStreamCallBacks.add(callback);
    }

    public onUpdateScreenSharing(callback: UpdatedScreenSharingCallback): void {

        this.updatedScreenSharingCallBacks.add(callback);
    }

    removeUpdateLocalStreamEventListener(callback: UpdatedLocalStreamCallback): void {
        this.updatedLocalStreamCallBacks.delete(callback);
    }

    private triggerUpdatedLocalStreamCallbacks(stream: MediaStream): void {
        for (const callback of this.updatedLocalStreamCallBacks) {
            callback(stream);
        }
    }

    private triggerUpdatedScreenSharingCallbacks(stream: MediaStream): void {
        for (const callback of this.updatedScreenSharingCallBacks) {
            callback(stream);
        }
    }

    showGameOverlay(){
        const gameOverlay = this.getElementByIdOrFail('game-overlay');
        gameOverlay.classList.add('active');
    }

    private enableCamera() {
        this.cinemaClose.style.display = "none";
        this.cinema.style.display = "block";
        this.constraintsMedia.video = videoConstraint;
        this.getCamera().then((stream: MediaStream) => {
            this.triggerUpdatedLocalStreamCallbacks(stream);
        });
    }

    private disableCamera() {
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

    private enableMicrophone() {
        this.microphoneClose.style.display = "none";
        this.microphone.style.display = "block";
        this.constraintsMedia.audio = true;
        this.getCamera().then((stream) => {
            this.triggerUpdatedLocalStreamCallbacks(stream);
        });
    }

    private disableMicrophone() {
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

    private enableScreenSharing() {
        this.monitorClose.style.display = "none";
        this.monitor.style.display = "block";
        this.getScreenMedia().then((stream) => {
            this.triggerUpdatedScreenSharingCallbacks(stream);
        });
    }

    private disableScreenSharing() {
        this.monitorClose.style.display = "block";
        this.monitor.style.display = "none";
        this.localScreenCapture?.getTracks().forEach((track: MediaStreamTrack) => {
            track.stop();
        });
        this.localScreenCapture = null;
        this.getCamera().then((stream) => {
            this.triggerUpdatedScreenSharingCallbacks(stream);
        });
    }

    //get screen
    getScreenMedia() : Promise<MediaStream>{
        try {
            return this._startScreenCapture()
                .then((stream: MediaStream) => {
                    this.localScreenCapture = stream;

                    // If stream ends (for instance if user clicks the stop screen sharing button in the browser), let's close the view
                    for (const track of stream.getTracks()) {
                        track.onended = () => {
                            this.disableScreenSharing();
                        };
                    }

                    return stream;
                })
                .catch((err: unknown) => {
                    console.error("Error => getScreenMedia => ", err);
                    throw err;
                });
        }catch (err) {
            return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
                reject(err);
            });
        }
    }

    private _startScreenCapture() {
        // getDisplayMedia was moved to mediaDevices in 2018. Typescript definitions are not up to date yet.
        // See: https://github.com/w3c/mediacapture-screen-share/pull/86
        //      https://github.com/microsoft/TypeScript/issues/31821
        if ((navigator as any).getDisplayMedia) { // eslint-disable-line @typescript-eslint/no-explicit-any
            return (navigator as any).getDisplayMedia({video: true}); // eslint-disable-line @typescript-eslint/no-explicit-any
        } else if ((navigator.mediaDevices as any).getDisplayMedia) { // eslint-disable-line @typescript-eslint/no-explicit-any
            return (navigator.mediaDevices as any).getDisplayMedia({video: true}); // eslint-disable-line @typescript-eslint/no-explicit-any
        } else {
            //return navigator.mediaDevices.getUserMedia(({video: {mediaSource: 'screen'}} as any));
            return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
                reject("error sharing screen");
            });
        }
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

        userName = userName.toUpperCase();
        const color = this.getColorByString(userName);

        const html =  `
            <div id="div-${userId}" class="video-container">
                <div class="connecting-spinner"></div>
                <div class="rtc-error" style="display: none"></div>
                <i id="name-${userId}" style="background-color: ${color};">${userName}</i>
                <img id="microphone-${userId}" src="resources/logos/microphone-close.svg">
                <video id="${userId}" autoplay></video>
            </div>
        `;

        layoutManager.add(DivImportance.Normal, userId, html);

        this.remoteVideo.set(userId, this.getElementByIdOrFail<HTMLVideoElement>(userId));
    }

    /**
     *
     * @param userId
     */
    addScreenSharingActiveVideo(userId : string){
        this.webrtcInAudio.play();

        userId = `screen-sharing-${userId}`;
        const html = `
            <div id="div-${userId}" class="video-container">
                <video id="${userId}" autoplay></video>
            </div>
        `;

        layoutManager.add(DivImportance.Important, userId, html);

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
        element = document.getElementById(`name-${userId}`);
        if (element) {
            element.style.display = "block";
        }
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
        element = document.getElementById(`name-${userId}`);
        if(element){
            element.style.display = "none";
        }
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
    addStreamRemoteScreenSharing(userId : string, stream : MediaStream){
        this.addStreamRemoteVideo(`screen-sharing-${userId}`, stream);
    }

    /**
     *
     * @param userId
     */
    removeActiveVideo(userId : string){
        layoutManager.remove(userId);
        this.remoteVideo.delete(userId);
    }
    removeActiveScreenSharingVideo(userId : string) {
        this.removeActiveVideo(`screen-sharing-${userId}`)
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
        console.log("isError", `div-${userId}`);
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
    isErrorScreenSharing(userId : string): void {
        this.isError(`screen-sharing-${userId}`);
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
