import {JITSI_URL} from "../Enum/EnvironmentVariable";
import {mediaManager} from "./MediaManager";
import {coWebsiteManager} from "./CoWebsiteManager";
declare const window:any; // eslint-disable-line @typescript-eslint/no-explicit-any

const getDefaultConfig = () => {
    return {
        startWithAudioMuted: !mediaManager.constraintsMedia.audio,
        startWithVideoMuted: mediaManager.constraintsMedia.video === false,
        prejoinPageEnabled: false
    }
}

const defaultInterfaceConfig = {
    SHOW_CHROME_EXTENSION_BANNER: false,
    MOBILE_APP_PROMO: false,

    HIDE_INVITE_MORE_HEADER: true,
    DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
    DISABLE_VIDEO_BACKGROUND: true,

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

const slugify = (...args: (string | number)[]): string => {
    const value = args.join(' ')

    return value
        .normalize('NFD') // split an accented letter in the base letter and the accent
        .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, '') // remove all chars not letters, numbers and spaces (to be replaced)
        .replace(/\s+/g, '-') // separator
}

class JitsiFactory {
    private jitsiApi: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    private audioCallback = this.onAudioChange.bind(this);
    private videoCallback = this.onVideoChange.bind(this);

    /**
     * Slugifies the room name and prepends the room name with the instance
     */
    public getRoomName(roomName: string, instance: string): string {
        return slugify(instance.replace('/', '-') + "-" + roomName);
    }

    public start(roomName: string, playerName:string, jwt?: string, config?: object, interfaceConfig?: object): void {
        coWebsiteManager.insertCoWebsite((cowebsiteDiv => {
            // Jitsi meet external API maintains some data in local storage
            // which is sent via the appData URL parameter when joining a
            // conference. Problem is that this data grows indefinitely. Thus
            // after some time the URLs get so huge that loading the iframe
            // becomes slow and eventually breaks completely. Thus lets just
            // clear jitsi local storage before starting a new conference.
            window.localStorage.removeItem("jitsiLocalStorage");

            const domain = JITSI_URL;
            const options: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
                roomName: roomName,
                jwt: jwt,
                width: "100%",
                height: "100%",
                parentNode: cowebsiteDiv,
                configOverwrite: {...config, ...getDefaultConfig()},
                interfaceConfigOverwrite: {...defaultInterfaceConfig, ...interfaceConfig}
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
