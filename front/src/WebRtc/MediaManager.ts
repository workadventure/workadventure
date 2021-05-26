import { DivImportance, layoutManager } from "./LayoutManager";
import { HtmlUtils } from "./HtmlUtils";
import { discussionManager, SendMessageCallback } from "./DiscussionManager";
import type { UserInputManager } from "../Phaser/UserInput/UserInputManager";
import { localUserStore } from "../Connexion/LocalUserStore";
import type { UserSimplePeerInterface } from "./SimplePeer";
import { SoundMeter } from "../Phaser/Components/SoundMeter";
import { DISABLE_NOTIFICATIONS } from "../Enum/EnvironmentVariable";
import {
    gameOverlayVisibilityStore, localStreamStore,
    mediaStreamConstraintsStore,
    requestedCameraState,
    requestedMicrophoneState
} from "../Stores/MediaStore";
import {
    requestedScreenSharingState,
    screenSharingAvailableStore,
    screenSharingLocalStreamStore
} from "../Stores/ScreenSharingStore";

declare const navigator: any; // eslint-disable-line @typescript-eslint/no-explicit-any

const videoConstraint: boolean | MediaTrackConstraints = {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 400, ideal: 720 },
    frameRate: { ideal: localUserStore.getVideoQualityValue() },
    facingMode: "user",
    resizeMode: 'crop-and-scale',
    aspectRatio: 1.777777778
};
const audioConstraint: boolean | MediaTrackConstraints = {
    //TODO: make these values configurable in the game settings menu and store them in localstorage
    autoGainControl: false,
    echoCancellation: true,
    noiseSuppression: true
};

export type UpdatedLocalStreamCallback = (media: MediaStream | null) => void;
export type StartScreenSharingCallback = (media: MediaStream) => void;
export type StopScreenSharingCallback = (media: MediaStream) => void;
export type ReportCallback = (message: string) => void;
export type ShowReportCallBack = (userId: string, userName: string | undefined) => void;
export type HelpCameraSettingsCallBack = () => void;

export class MediaManager {
    localStream: MediaStream | null = null;
    localScreenCapture: MediaStream | null = null;
    private remoteVideo: Map<string, HTMLVideoElement> = new Map<string, HTMLVideoElement>();
    myCamVideo: HTMLVideoElement;
    cinemaClose: HTMLImageElement;
    cinema: HTMLImageElement;
    monitorClose: HTMLImageElement;
    monitor: HTMLImageElement;
    microphoneClose: HTMLImageElement;
    microphone: HTMLImageElement;
    webrtcInAudio: HTMLAudioElement;
    //FIX ME SOUNDMETER: check stalability of sound meter calculation
    //mySoundMeterElement: HTMLDivElement;
    private webrtcOutAudio: HTMLAudioElement;

    updatedLocalStreamCallBacks: Set<UpdatedLocalStreamCallback> = new Set<UpdatedLocalStreamCallback>();
    startScreenSharingCallBacks: Set<StartScreenSharingCallback> = new Set<StartScreenSharingCallback>();
    stopScreenSharingCallBacks: Set<StopScreenSharingCallback> = new Set<StopScreenSharingCallback>();
    showReportModalCallBacks: Set<ShowReportCallBack> = new Set<ShowReportCallBack>();
    helpCameraSettingsCallBacks: Set<HelpCameraSettingsCallBack> = new Set<HelpCameraSettingsCallBack>();

    private microphoneBtn: HTMLDivElement;
    private cinemaBtn: HTMLDivElement;
    private monitorBtn: HTMLDivElement;


    private focused: boolean = true;

    private triggerCloseJistiFrame: Map<String, Function> = new Map<String, Function>();

    private userInputManager?: UserInputManager;

    //FIX ME SOUNDMETER: check stalability of sound meter calculation
    /*private mySoundMeter?: SoundMeter|null;
    private soundMeters: Map<string, SoundMeter> = new Map<string, SoundMeter>();
    private soundMeterElements: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();*/

    constructor() {

        this.myCamVideo = HtmlUtils.getElementByIdOrFail<HTMLVideoElement>('myCamVideo');
        this.webrtcInAudio = HtmlUtils.getElementByIdOrFail<HTMLAudioElement>('audio-webrtc-in');
        this.webrtcOutAudio = HtmlUtils.getElementByIdOrFail<HTMLAudioElement>('audio-webrtc-out');
        this.webrtcInAudio.volume = 0.2;
        this.webrtcOutAudio.volume = 0.2;

        this.microphoneBtn = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('btn-micro');
        this.microphoneClose = HtmlUtils.getElementByIdOrFail<HTMLImageElement>('microphone-close');
        this.microphoneClose.style.display = "none";
        this.microphoneClose.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            requestedMicrophoneState.enableMicrophone();
        });
        this.microphone = HtmlUtils.getElementByIdOrFail<HTMLImageElement>('microphone');
        this.microphone.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            requestedMicrophoneState.disableMicrophone();
        });

        this.cinemaBtn = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('btn-video');
        this.cinemaClose = HtmlUtils.getElementByIdOrFail<HTMLImageElement>('cinema-close');
        this.cinemaClose.style.display = "none";
        this.cinemaClose.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            requestedCameraState.enableWebcam();
        });
        this.cinema = HtmlUtils.getElementByIdOrFail<HTMLImageElement>('cinema');
        this.cinema.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            requestedCameraState.disableWebcam();
        });

        this.monitorBtn = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('btn-monitor');
        this.monitorClose = HtmlUtils.getElementByIdOrFail<HTMLImageElement>('monitor-close');
        this.monitorClose.style.display = "block";
        this.monitorClose.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            //this.enableScreenSharing();
            requestedScreenSharingState.enableScreenSharing();
        });
        this.monitor = HtmlUtils.getElementByIdOrFail<HTMLImageElement>('monitor');
        this.monitor.style.display = "none";
        this.monitor.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            //this.disableScreenSharing();
            requestedScreenSharingState.disableScreenSharing();
        });

        this.pingCameraStatus();

        //FIX ME SOUNDMETER: check stability of sound meter calculation
        /*this.mySoundMeterElement = (HtmlUtils.getElementByIdOrFail('mySoundMeter'));
        this.mySoundMeterElement.childNodes.forEach((value: ChildNode, index) => {
            this.mySoundMeterElement.children.item(index)?.classList.remove('active');
        });*/

        //Check of ask notification navigator permission
        this.getNotification();

        localStreamStore.subscribe((result) => {
            if (result.type === 'error') {
                console.error(result.error);
                layoutManager.addInformation('warning', 'Camera access denied. Click here and check navigators permissions.', () => {
                    this.showHelpCameraSettingsCallBack();
                }, this.userInputManager);
                return;
            }

            if (result.constraints.video !== false) {
                HtmlUtils.getElementByIdOrFail('div-myCamVideo').classList.remove('hide');
            } else {
                HtmlUtils.getElementByIdOrFail('div-myCamVideo').classList.add('hide');
            }/*
            if (result.constraints.audio !== false) {
                this.enableMicrophoneStyle();
            } else {
                this.disableMicrophoneStyle();
            }*/

            this.localStream = result.stream;
            this.myCamVideo.srcObject = this.localStream;

            // TODO: migrate all listeners to the store directly.
            this.triggerUpdatedLocalStreamCallbacks(result.stream);
        });

        requestedCameraState.subscribe((enabled) => {
            if (enabled) {
                this.enableCameraStyle();
            } else {
                this.disableCameraStyle();
            }
        });
        requestedMicrophoneState.subscribe((enabled) => {
            if (enabled) {
                this.enableMicrophoneStyle();
            } else {
                this.disableMicrophoneStyle();
            }
        });
        //let screenSharingStream : MediaStream|null;
        screenSharingLocalStreamStore.subscribe((result) => {
            if (result.type === 'error') {
                console.error(result.error);
                layoutManager.addInformation('warning', 'Screen sharing denied. Click here and check navigators permissions.', () => {
                    this.showHelpCameraSettingsCallBack();
                }, this.userInputManager);
                return;
            }

            if (result.stream !== null) {
                this.enableScreenSharingStyle();
                mediaManager.localScreenCapture = result.stream;

                // TODO: migrate this out of MediaManager
                this.triggerStartedScreenSharingCallbacks(result.stream);

                //screenSharingStream = result.stream;

                this.addScreenSharingActiveVideo('me', DivImportance.Normal);
                HtmlUtils.getElementByIdOrFail<HTMLVideoElement>('screen-sharing-me').srcObject = result.stream;
            } else {
                this.disableScreenSharingStyle();
                this.removeActiveScreenSharingVideo('me');

                // FIXME: we need the old stream that is being stopped!
                if (this.localScreenCapture) {
                    this.triggerStoppedScreenSharingCallbacks(this.localScreenCapture);
                    this.localScreenCapture = null;
                }

                //screenSharingStream = null;
            }

        });

        screenSharingAvailableStore.subscribe((available) => {
            if (available) {
                document.querySelector('.btn-monitor')?.classList.remove('hide');
            } else {
                document.querySelector('.btn-monitor')?.classList.add('hide');
            }
        });
    }

    public updateScene(){
        //FIX ME SOUNDMETER: check stability of sound meter calculation
        //this.updateSoudMeter();
    }

    public onUpdateLocalStream(callback: UpdatedLocalStreamCallback): void {
        this.updatedLocalStreamCallBacks.add(callback);
    }

    public onStartScreenSharing(callback: StartScreenSharingCallback): void {
        this.startScreenSharingCallBacks.add(callback);
    }

    public onStopScreenSharing(callback: StopScreenSharingCallback): void {
        this.stopScreenSharingCallBacks.add(callback);
    }

    removeUpdateLocalStreamEventListener(callback: UpdatedLocalStreamCallback): void {
        this.updatedLocalStreamCallBacks.delete(callback);
    }

    private triggerUpdatedLocalStreamCallbacks(stream: MediaStream | null): void {
        for (const callback of this.updatedLocalStreamCallBacks) {
            callback(stream);
        }
    }

    private triggerStartedScreenSharingCallbacks(stream: MediaStream): void {
        for (const callback of this.startScreenSharingCallBacks) {
            callback(stream);
        }
    }

    private triggerStoppedScreenSharingCallbacks(stream: MediaStream): void {
        for (const callback of this.stopScreenSharingCallBacks) {
            callback(stream);
        }
    }

    public showGameOverlay(): void {
        const gameOverlay = HtmlUtils.getElementByIdOrFail('game-overlay');
        gameOverlay.classList.add('active');

        const buttonCloseFrame = HtmlUtils.getElementByIdOrFail('cowebsite-close');
        const functionTrigger = () => {
            this.triggerCloseJitsiFrameButton();
        }
        buttonCloseFrame.removeEventListener('click', functionTrigger);

        gameOverlayVisibilityStore.showGameOverlay();
    }

    public hideGameOverlay(): void {
        const gameOverlay = HtmlUtils.getElementByIdOrFail('game-overlay');
        gameOverlay.classList.remove('active');

        const buttonCloseFrame = HtmlUtils.getElementByIdOrFail('cowebsite-close');
        const functionTrigger = () => {
            this.triggerCloseJitsiFrameButton();
        }
        buttonCloseFrame.addEventListener('click', functionTrigger);

        gameOverlayVisibilityStore.hideGameOverlay();
    }

    private enableCameraStyle() {
        this.cinemaClose.style.display = "none";
        this.cinemaBtn.classList.remove("disabled");
        this.cinema.style.display = "block";
    }

    private disableCameraStyle() {
        this.cinemaClose.style.display = "block";
        this.cinema.style.display = "none";
        this.cinemaBtn.classList.add("disabled");
    }

    private enableMicrophoneStyle() {
        this.microphoneClose.style.display = "none";
        this.microphone.style.display = "block";
        this.microphoneBtn.classList.remove("disabled");
    }

    private disableMicrophoneStyle() {
        this.microphoneClose.style.display = "block";
        this.microphone.style.display = "none";
        this.microphoneBtn.classList.add("disabled");
    }

    private enableScreenSharingStyle(){
        this.monitorClose.style.display = "none";
        this.monitor.style.display = "block";
        this.monitorBtn.classList.add("enabled");
    }

    private disableScreenSharingStyle(){
        this.monitorClose.style.display = "block";
        this.monitor.style.display = "none";
        this.monitorBtn.classList.remove("enabled");
    }

    addActiveVideo(user: UserSimplePeerInterface, userName: string = "") {
        this.webrtcInAudio.play();
        const userId = '' + user.userId

        userName = userName.toUpperCase();
        const color = this.getColorByString(userName);

        const html = `
            <div id="div-${userId}" class="video-container">
                <div class="connecting-spinner"></div>
                <div class="rtc-error" style="display: none"></div>
                <i id="name-${userId}" style="background-color: ${color};">${userName}</i>
                <img id="microphone-${userId}" title="mute" src="resources/logos/microphone-close.svg">
                <button id="report-${userId}" class="report">
                    <img title="report this user" src="resources/logos/report.svg">
                    <span>Report/Block</span>
                </button>
                <video id="${userId}" autoplay></video>
                <img src="resources/logos/blockSign.svg" id="blocking-${userId}" class="block-logo">
                <div id="soundMeter-${userId}" class="sound-progress">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        layoutManager.add(DivImportance.Normal, userId, html);

        this.remoteVideo.set(userId, HtmlUtils.getElementByIdOrFail<HTMLVideoElement>(userId));

        //permit to create participant in discussion part
        const showReportUser = () => {
            for (const callBack of this.showReportModalCallBacks) {
                callBack(userId, userName);
            }
        };
        this.addNewParticipant(userId, userName, undefined, showReportUser);

        const reportBanUserActionEl: HTMLImageElement = HtmlUtils.getElementByIdOrFail<HTMLImageElement>(`report-${userId}`);
        reportBanUserActionEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showReportUser();
        });
    }

    addScreenSharingActiveVideo(userId: string, divImportance: DivImportance = DivImportance.Important){

        userId = this.getScreenSharingId(userId);
        const html = `
            <div id="div-${userId}" class="video-container">
                <video id="${userId}" autoplay></video>
            </div>
        `;

        layoutManager.add(divImportance, userId, html);

        this.remoteVideo.set(userId, HtmlUtils.getElementByIdOrFail<HTMLVideoElement>(userId));
    }

    private getScreenSharingId(userId: string): string {
        return `screen-sharing-${userId}`;
    }

    disabledMicrophoneByUserId(userId: number) {
        const element = document.getElementById(`microphone-${userId}`);
        if (!element) {
            return;
        }
        element.classList.add('active') //todo: why does a method 'disable' add a class 'active'?
    }

    enabledMicrophoneByUserId(userId: number) {
        const element = document.getElementById(`microphone-${userId}`);
        if (!element) {
            return;
        }
        element.classList.remove('active') //todo: why does a method 'enable' remove a class 'active'?
    }

    disabledVideoByUserId(userId: number) {
        let element = document.getElementById(`${userId}`);
        if (element) {
            element.style.opacity = "0";
        }
        element = document.getElementById(`name-${userId}`);
        if (element) {
            element.style.display = "block";
        }
    }

    enabledVideoByUserId(userId: number) {
        let element = document.getElementById(`${userId}`);
        if (element) {
            element.style.opacity = "1";
        }
        element = document.getElementById(`name-${userId}`);
        if (element) {
            element.style.display = "none";
        }
    }

    toggleBlockLogo(userId: number, show: boolean): void {
        const blockLogoElement = HtmlUtils.getElementByIdOrFail<HTMLImageElement>('blocking-' + userId);
        show ? blockLogoElement.classList.add('active') : blockLogoElement.classList.remove('active');
    }
    addStreamRemoteVideo(userId: string, stream: MediaStream): void {
        const remoteVideo = this.remoteVideo.get(userId);
        if (remoteVideo === undefined) {
            throw `Unable to find video for ${userId}`;
        }
        remoteVideo.srcObject = stream;

        //FIX ME SOUNDMETER: check stalability of sound meter calculation
        //sound metter
        /*const soundMeter = new SoundMeter();
        soundMeter.connectToSource(stream, new AudioContext());
        this.soundMeters.set(userId, soundMeter);
        this.soundMeterElements.set(userId, HtmlUtils.getElementByIdOrFail<HTMLImageElement>('soundMeter-'+userId));*/
    }
    addStreamRemoteScreenSharing(userId: string, stream: MediaStream) {
        // In the case of screen sharing (going both ways), we may need to create the HTML element if it does not exist yet
        const remoteVideo = this.remoteVideo.get(this.getScreenSharingId(userId));
        if (remoteVideo === undefined) {
            this.addScreenSharingActiveVideo(userId);
        }

        this.addStreamRemoteVideo(this.getScreenSharingId(userId), stream);
    }

    removeActiveVideo(userId: string) {
        layoutManager.remove(userId);
        this.remoteVideo.delete(userId);

        //FIX ME SOUNDMETER: check stalability of sound meter calculation
        /*this.soundMeters.get(userId)?.stop();
        this.soundMeters.delete(userId);
        this.soundMeterElements.delete(userId);*/

        //permit to remove user in discussion part
        this.removeParticipant(userId);
    }
    removeActiveScreenSharingVideo(userId: string) {
        this.removeActiveVideo(this.getScreenSharingId(userId))
    }

    playWebrtcOutSound(): void {
        this.webrtcOutAudio.play();
    }

    isConnecting(userId: string): void {
        const connectingSpinnerDiv = this.getSpinner(userId);
        if (connectingSpinnerDiv === null) {
            return;
        }
        connectingSpinnerDiv.style.display = 'block';
    }

    isConnected(userId: string): void {
        const connectingSpinnerDiv = this.getSpinner(userId);
        if (connectingSpinnerDiv === null) {
            return;
        }
        connectingSpinnerDiv.style.display = 'none';
    }

    isError(userId: string): void {
        console.info("isError", `div-${userId}`);
        const element = document.getElementById(`div-${userId}`);
        if (!element) {
            return;
        }
        const errorDiv = element.getElementsByClassName('rtc-error').item(0) as HTMLDivElement | null;
        if (errorDiv === null) {
            return;
        }
        errorDiv.style.display = 'block';
    }
    isErrorScreenSharing(userId: string): void {
        this.isError(this.getScreenSharingId(userId));
    }


    private getSpinner(userId: string): HTMLDivElement | null {
        const element = document.getElementById(`div-${userId}`);
        if (!element) {
            return null;
        }
        const connnectingSpinnerDiv = element.getElementsByClassName('connecting-spinner').item(0) as HTMLDivElement | null;
        return connnectingSpinnerDiv;
    }

    private getColorByString(str: String): String | null {
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

    public addNewParticipant(userId: number | string, name: string | undefined, img?: string, showReportUserCallBack?: ShowReportCallBack) {
        discussionManager.addParticipant(userId, name, img, false, showReportUserCallBack);
    }

    public removeParticipant(userId: number | string) {
        discussionManager.removeParticipant(userId);
    }
    public addTriggerCloseJitsiFrameButton(id: String, Function: Function) {
        this.triggerCloseJistiFrame.set(id, Function);
    }

    public removeTriggerCloseJitsiFrameButton(id: String) {
        this.triggerCloseJistiFrame.delete(id);
    }

    private triggerCloseJitsiFrameButton(): void {
        for (const callback of this.triggerCloseJistiFrame.values()) {
            callback();
        }
    }
    /**
     * For some reasons, the microphone muted icon or the stream is not always up to date.
     * Here, every 30 seconds, we are "reseting" the streams and sending again the constraints to the other peers via the data channel again (see SimplePeer::pushVideoToRemoteUser)
    **/
    private pingCameraStatus() {
        /*setInterval(() => {
            console.log('ping camera status');
            this.triggerUpdatedLocalStreamCallbacks(this.localStream);
        }, 30000);*/
    }

    public addNewMessage(name: string, message: string, isMe: boolean = false) {
        discussionManager.addMessage(name, message, isMe);

        //when there are new message, show discussion
        if (!discussionManager.activatedDiscussion) {
            discussionManager.showDiscussionPart();
        }
    }

    public addSendMessageCallback(userId: string | number, callback: SendMessageCallback) {
        discussionManager.onSendMessageCallback(userId, callback);
    }

    get activatedDiscussion() {
        return discussionManager.activatedDiscussion;
    }

    public setUserInputManager(userInputManager: UserInputManager) {
        this.userInputManager = userInputManager;
        discussionManager.setUserInputManager(userInputManager);
    }

    public setShowReportModalCallBacks(callback: ShowReportCallBack) {
        this.showReportModalCallBacks.add(callback);
    }

    public setHelpCameraSettingsCallBack(callback: HelpCameraSettingsCallBack) {
        this.helpCameraSettingsCallBacks.add(callback);
    }

    private showHelpCameraSettingsCallBack() {
        for (const callBack of this.helpCameraSettingsCallBacks) {
            callBack();
        }
    }

    //FIX ME SOUNDMETER: check stalability of sound meter calculation
    /*updateSoudMeter(){
        try{
            const volume = parseInt(((this.mySoundMeter ? this.mySoundMeter.getVolume() : 0) / 10).toFixed(0));
            this.setVolumeSoundMeter(volume, this.mySoundMeterElement);

            for(const indexUserId of this.soundMeters.keys()){
                const soundMeter = this.soundMeters.get(indexUserId);
                const soundMeterElement = this.soundMeterElements.get(indexUserId);
                if (!soundMeter || !soundMeterElement) {
                    return;
                }
                const volumeByUser = parseInt((soundMeter.getVolume() / 10).toFixed(0));
                this.setVolumeSoundMeter(volumeByUser, soundMeterElement);
            }
        } catch (err) {
            //console.error(err);
        }
    }*/

    private setVolumeSoundMeter(volume: number, element: HTMLDivElement) {
        if (volume <= 0 && !element.classList.contains('active')) {
            return;
        }
        element.classList.remove('active');
        if (volume <= 0) {
            return;
        }
        element.classList.add('active');
        element.childNodes.forEach((value: ChildNode, index) => {
            const elementChildre = element.children.item(index);
            if (!elementChildre) {
                return;
            }
            elementChildre.classList.remove('active');
            if ((index + 1) > volume) {
                return;
            }
            elementChildre.classList.add('active');
        });
    }

    public getNotification(){
        //Get notification
        if (!DISABLE_NOTIFICATIONS && window.Notification && Notification.permission !== "granted") {
            Notification.requestPermission().catch((err) => {
                console.error(`Notification permission error`, err);
            });
        }
    }

    public createNotification(userName: string){
        if(this.focused){
            return;
        }
        if (window.Notification && Notification.permission === "granted") {
            const title = 'WorkAdventure';
            const options = {
                body: `Hi! ${userName} wants to discuss with you, don't be afraid!`,
                icon: '/resources/logos/logo-WA-min.png',
                image: '/resources/logos/logo-WA-min.png',
                badge: '/resources/logos/logo-WA-min.png',
            };
            new Notification(title, options);
            //new Notification(`Hi! ${userName} wants to discuss with you, don't be afraid!`);
        }
    }
}

export const mediaManager = new MediaManager();
