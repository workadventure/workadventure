import {JITSI_URL} from "../Enum/EnvironmentVariable";
import {mediaManager} from "./MediaManager";
import {coWebsiteManager} from "./CoWebsiteManager";
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
        coWebsiteManager.insertCoWebsite((cowebsiteDiv => {
            // Jitsi meet external API maintains some data in local storage
            // which is sent via an URL parameter when opening a new
            // conference. Problem is that this data grows indefinitely. Thus
            // after some time the URLs are so huge that loading the iframe
            // becomes slow. Thus lets just clear jitsi local storage whenever
            // this class is loaded.
            //
            // see:
            // https://github.com/jitsi/jitsi-meet/blob/684d12115974a65b48f36c7d4fe74d8f17da6ff6/modules/API/external/external_api.js#L269-L281
            //
            // It looks like the demo at play.workadventu.re is not affected by
            // this problem. This is likely due to how they run their own jitsi
            // infra.
            window.localStorage.removeItem("jitsiLocalStorage");

            const domain = JITSI_URL;
            const options: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
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
            
            return new Promise((resolve, reject) => {
                options.onload = () => resolve(); //we want for the iframe to be loaded before triggering animations.
                setTimeout(() => resolve(), 2000); //failsafe in case the iframe is deleted before loading or too long to load
                this.jitsiApi = new window.JitsiMeetExternalAPI(domain, options);
                this.jitsiApi.executeCommand('displayName', playerName);

                this.jitsiApi.addListener('audioMuteStatusChanged', this.audioCallback);
                this.jitsiApi.addListener('videoMuteStatusChanged', this.videoCallback);
            });
        }));
    }

    public async stop(): Promise<void> {
        if(!this.jitsiApi){
            return;
        }
        await coWebsiteManager.closeCoWebsite();
        this.jitsiApi.removeListener('audioMuteStatusChanged', this.audioCallback);
        this.jitsiApi.removeListener('videoMuteStatusChanged', this.videoCallback);
        this.jitsiApi?.dispose();
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