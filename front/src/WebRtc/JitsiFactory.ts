import {CoWebsiteManager} from "./CoWebsiteManager";
import {JITSI_URL} from "../Enum/EnvironmentVariable";
import {mediaManager} from "./MediaManager";
declare const window:any; // eslint-disable-line @typescript-eslint/no-explicit-any

const interfaceConfig = {
    SHOW_CHROME_EXTENSION_BANNER: false,
    MOBILE_APP_PROMO: false,

    HIDE_INVITE_MORE_HEADER: true,

    // Note: hiding brand does not seem to work, we probably need to put this on the server side.
    SHOW_BRAND_WATERMARK: false,
    SHOW_JITSI_WATERMARK: false,
    SHOW_POWERED_BY: false,
    SHOW_PROMOTIONAL_CLOSE_PAGE: false,
    SHOW_WATERMARK_FOR_GUESTS: false,

    TOOLBAR_BUTTONS: [
        'microphone', 'camera', 'closedcaptions', 'desktop', /*'embedmeeting',*/ 'fullscreen',
        'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
        'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
        'videoquality', 'filmstrip', /*'invite',*/ 'feedback', 'stats', 'shortcuts',
        'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone', /*'security'*/
    ],
};

class JitsiFactory {
    private jitsiApi: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    private audioCallback = this.onAudioChange.bind(this);
    private videoCallback = this.onVideoChange.bind(this);
    
    public start(roomName: string, playerName:string, jwt?: string): void {
        CoWebsiteManager.insertCoWebsite((cowebsiteDiv => {
            const domain = JITSI_URL;
            const options = {
                roomName: roomName,
                jwt: jwt,
                width: "100%",
                height: "100%",
                parentNode: cowebsiteDiv,
                configOverwrite: {
                    startWithAudioMuted: !mediaManager.constraintsMedia.audio,
                    startWithVideoMuted: mediaManager.constraintsMedia.video === false,
                    prejoinPageEnabled: false
                },
                interfaceConfigOverwrite: interfaceConfig,
            };
            if (!options.jwt) {
                delete options.jwt;
            }
            this.jitsiApi = new window.JitsiMeetExternalAPI(domain, options);
            this.jitsiApi.executeCommand('displayName', playerName);

            this.jitsiApi.addListener('audioMuteStatusChanged', this.audioCallback);
            this.jitsiApi.addListener('videoMuteStatusChanged', this.videoCallback);
        }));
    }

    public stop(): void {
        this.jitsiApi.removeListener('audioMuteStatusChanged', this.audioCallback);
        this.jitsiApi.removeListener('videoMuteStatusChanged', this.videoCallback);
        this.jitsiApi?.dispose();
        CoWebsiteManager.closeCoWebsite();
    }

    private onAudioChange({muted}: {muted: boolean}): void {
        if (muted && mediaManager.constraintsMedia.audio === true) {
            mediaManager.disableMicrophone();
        } else if(!muted && mediaManager.constraintsMedia.audio === false) {
            mediaManager.enableMicrophone();
        }
    }

    private onVideoChange({muted}: {muted: boolean}): void {
        if (muted && mediaManager.constraintsMedia.video !== false) {
            mediaManager.disableCamera();
        } else if(!muted && mediaManager.constraintsMedia.video === false) {
            mediaManager.enableCamera();
        }
    }

}

export const jitsiFactory = new JitsiFactory();