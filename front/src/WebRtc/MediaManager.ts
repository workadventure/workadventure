import {DivImportance, layoutManager} from "./LayoutManager";
import {HtmlUtils} from "./HtmlUtils";
import {discussionManager, SendMessageCallback} from "./DiscussionManager";
import type {UserInputManager} from "../Phaser/UserInput/UserInputManager";
import {localUserStore} from "../Connexion/LocalUserStore";
import type {UserSimplePeerInterface} from "./SimplePeer";
import {SoundMeter} from "../Phaser/Components/SoundMeter";
import {DISABLE_NOTIFICATIONS} from "../Enum/EnvironmentVariable";
import {
    gameOverlayVisibilityStore, localStreamStore,
} from "../Stores/MediaStore";
import {
    screenSharingLocalStreamStore
} from "../Stores/ScreenSharingStore";
import {helpCameraSettingsVisibleStore} from "../Stores/HelpCameraSettingsStore";

export type UpdatedLocalStreamCallback = (media: MediaStream|null) => void;
export type StartScreenSharingCallback = (media: MediaStream) => void;
export type StopScreenSharingCallback = (media: MediaStream) => void;
export type ReportCallback = (message: string) => void;
export type ShowReportCallBack = (userId: string, userName: string|undefined) => void;
export type HelpCameraSettingsCallBack = () => void;

import {cowebsiteCloseButtonId} from "./CoWebsiteManager";

export class MediaManager {
    private remoteVideo: Map<string, HTMLVideoElement> = new Map<string, HTMLVideoElement>();
    //FIX ME SOUNDMETER: check stalability of sound meter calculation
    //mySoundMeterElement: HTMLDivElement;
    startScreenSharingCallBacks : Set<StartScreenSharingCallback> = new Set<StartScreenSharingCallback>();
    stopScreenSharingCallBacks : Set<StopScreenSharingCallback> = new Set<StopScreenSharingCallback>();
    showReportModalCallBacks : Set<ShowReportCallBack> = new Set<ShowReportCallBack>();

    private focused : boolean = true;

    private triggerCloseJistiFrame : Map<String, Function> = new Map<String, Function>();

    private userInputManager?: UserInputManager;

    //FIX ME SOUNDMETER: check stalability of sound meter calculation
    /*private mySoundMeter?: SoundMeter|null;
    private soundMeters: Map<string, SoundMeter> = new Map<string, SoundMeter>();
    private soundMeterElements: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();*/

    constructor() {

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
                layoutManager.addInformation('warning', 'Camera access denied. Click here and check your browser permissions.', () => {
                    helpCameraSettingsVisibleStore.set(true);
                }, this.userInputManager);
                return;
            }
        });

        screenSharingLocalStreamStore.subscribe((result) => {
            if (result.type === 'error') {
                console.error(result.error);
                layoutManager.addInformation('warning', 'Screen sharing denied. Click here and check your browser permissions.', () => {
                    helpCameraSettingsVisibleStore.set(true);
                }, this.userInputManager);
                return;
            }

            if (result.stream !== null) {
                this.addScreenSharingActiveVideo('me', DivImportance.Normal);
                HtmlUtils.getElementByIdOrFail<HTMLVideoElement>('screen-sharing-me').srcObject = result.stream;
            } else {
                this.removeActiveScreenSharingVideo('me');
            }

        });

        /*screenSharingAvailableStore.subscribe((available) => {
            if (available) {
                document.querySelector('.btn-monitor')?.classList.remove('hide');
            } else {
                document.querySelector('.btn-monitor')?.classList.add('hide');
            }
        });*/
    }

    public updateScene(){
        //FIX ME SOUNDMETER: check stability of sound meter calculation
        //this.updateSoudMeter();
    }

    public showGameOverlay(): void {
        const gameOverlay = HtmlUtils.getElementByIdOrFail('game-overlay');
        gameOverlay.classList.add('active');

        const buttonCloseFrame = HtmlUtils.getElementByIdOrFail(cowebsiteCloseButtonId);
        const functionTrigger = () => {
            this.triggerCloseJitsiFrameButton();
        }
        buttonCloseFrame.removeEventListener('click', () => {
            buttonCloseFrame.blur();
            functionTrigger();
        });

        gameOverlayVisibilityStore.showGameOverlay();
    }

    public hideGameOverlay(): void {
        const gameOverlay = HtmlUtils.getElementByIdOrFail('game-overlay');
        gameOverlay.classList.remove('active');

        const buttonCloseFrame = HtmlUtils.getElementByIdOrFail(cowebsiteCloseButtonId);
        const functionTrigger = () => {
            this.triggerCloseJitsiFrameButton();
        }
        buttonCloseFrame.addEventListener('click', () => {
            buttonCloseFrame.blur();
            functionTrigger();
        });

        gameOverlayVisibilityStore.hideGameOverlay();
    }

    addActiveVideo(user: UserSimplePeerInterface, userName: string = ""){
        const userId = ''+user.userId

        userName = userName.toUpperCase();
        const color = this.getColorByString(userName);

        const html =  `
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
            for(const callBack of this.showReportModalCallBacks){
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

    disabledMicrophoneByUserId(userId: number){
        const element = document.getElementById(`microphone-${userId}`);
        if(!element){
            return;
        }
        element.classList.add('active') //todo: why does a method 'disable' add a class 'active'?
    }

    enabledMicrophoneByUserId(userId: number){
        const element = document.getElementById(`microphone-${userId}`);
        if(!element){
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

    enabledVideoByUserId(userId: number){
        let element = document.getElementById(`${userId}`);
        if(element){
            element.style.opacity = "1";
        }
        element = document.getElementById(`name-${userId}`);
        if(element){
            element.style.display = "none";
        }
    }

    toggleBlockLogo(userId: number, show: boolean): void {
        const blockLogoElement = HtmlUtils.getElementByIdOrFail<HTMLImageElement>('blocking-'+userId);
        show ? blockLogoElement.classList.add('active') : blockLogoElement.classList.remove('active');
    }
    addStreamRemoteVideo(userId: string, stream : MediaStream): void {
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
    addStreamRemoteScreenSharing(userId: string, stream : MediaStream){
        // In the case of screen sharing (going both ways), we may need to create the HTML element if it does not exist yet
        const remoteVideo = this.remoteVideo.get(this.getScreenSharingId(userId));
        if (remoteVideo === undefined) {
            this.addScreenSharingActiveVideo(userId);
        }

        this.addStreamRemoteVideo(this.getScreenSharingId(userId), stream);
    }

    removeActiveVideo(userId: string){
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
        if(!element){
            return;
        }
        const errorDiv = element.getElementsByClassName('rtc-error').item(0) as HTMLDivElement|null;
        if (errorDiv === null) {
            return;
        }
        errorDiv.style.display = 'block';
    }
    isErrorScreenSharing(userId: string): void {
        this.isError(this.getScreenSharingId(userId));
    }


    private getSpinner(userId: string): HTMLDivElement|null {
        const element = document.getElementById(`div-${userId}`);
        if(!element){
            return null;
        }
        const connnectingSpinnerDiv = element.getElementsByClassName('connecting-spinner').item(0) as HTMLDivElement|null;
        return connnectingSpinnerDiv;
    }

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

    public addNewParticipant(userId: number|string, name: string|undefined, img?: string, showReportUserCallBack?: ShowReportCallBack){
        discussionManager.addParticipant(userId, name, img, false, showReportUserCallBack);
    }

    public removeParticipant(userId: number|string){
        discussionManager.removeParticipant(userId);
    }
    public addTriggerCloseJitsiFrameButton(id: String, Function: Function){
        this.triggerCloseJistiFrame.set(id, Function);
    }

    public removeTriggerCloseJitsiFrameButton(id: String){
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
    private pingCameraStatus(){
        /*setInterval(() => {
            console.log('ping camera status');
            this.triggerUpdatedLocalStreamCallbacks(this.localStream);
        }, 30000);*/
    }

    public addNewMessage(name: string, message: string, isMe: boolean = false){
        discussionManager.addMessage(name, message, isMe);

        //when there are new message, show discussion
        if(!discussionManager.activatedDiscussion) {
            discussionManager.showDiscussionPart();
        }
    }

    public addSendMessageCallback(userId: string|number, callback: SendMessageCallback){
        discussionManager.onSendMessageCallback(userId, callback);
    }

    get activatedDiscussion(){
        return discussionManager.activatedDiscussion;
    }

    public setUserInputManager(userInputManager : UserInputManager){
        this.userInputManager = userInputManager;
        discussionManager.setUserInputManager(userInputManager);
    }

    public setShowReportModalCallBacks(callback: ShowReportCallBack){
        this.showReportModalCallBacks.add(callback);
    }

    //FIX ME SOUNDMETER: check stalability of sound meter calculation
    /*updateSoudMeter(){
        try{
            const volume = parseInt(((this.mySoundMeter ? this.mySoundMeter.getVolume() : 0) / 10).toFixed(0));
            this.setVolumeSoundMeter(volume, this.mySoundMeterElement);

            for(const indexUserId of this.soundMeters.keys()){
                const soundMeter = this.soundMeters.get(indexUserId);
                const soundMeterElement = this.soundMeterElements.get(indexUserId);
                if(!soundMeter || !soundMeterElement){
                    return;
                }
                const volumeByUser = parseInt((soundMeter.getVolume() / 10).toFixed(0));
                this.setVolumeSoundMeter(volumeByUser, soundMeterElement);
            }
        }catch(err){
            //console.error(err);
        }
    }*/

    private setVolumeSoundMeter(volume: number, element: HTMLDivElement){
        if(volume <= 0 && !element.classList.contains('active')){
            return;
        }
        element.classList.remove('active');
        if(volume <= 0){
            return;
        }
        element.classList.add('active');
        element.childNodes.forEach((value: ChildNode, index) => {
            const elementChildre = element.children.item(index);
            if(!elementChildre){
                return;
            }
            elementChildre.classList.remove('active');
            if((index +1) > volume){
                return;
            }
            elementChildre.classList.add('active');
        });
    }

    public getNotification(){
        //Get notification
        if (!DISABLE_NOTIFICATIONS && window.Notification && Notification.permission !== "granted") {
            if (this.checkNotificationPromise()) {
                Notification.requestPermission().catch((err) => {
                    console.error(`Notification permission error`, err);
                });
            } else {
                Notification.requestPermission();
            }
        }
    }

    /**
     * Return true if the browser supports the modern version of the Notification API (which is Promise based) or false
     * if we are on Safari...
     *
     * See https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API
     */
    private checkNotificationPromise(): boolean {
        try {
            Notification.requestPermission().then();
        } catch(e) {
            return false;
        }

        return true;
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
