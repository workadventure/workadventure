import {HtmlUtils} from "./HtmlUtils";
import {isUndefined} from "generic-type-guard";

enum videoStates {
    closed = 0,
    loading = 1,
    playing = 2
}

const videoPlayerDivId = "videoplayer";
const videoPlayerCtrlId = "videoplayerctrl";
const animationTime = 500;

class VideoManager {
    private opened = videoStates.closed;

    private videoPlayerDiv: HTMLDivElement;
    private videoPlayerCtrl: HTMLDivElement;
    private videoPlayerElem: HTMLVideoElement | undefined;

    private volume = 1;
    private muted = false;
    private decreaseWhileTalking = true;
    private volumeReduced = false;

    constructor() {
        this.videoPlayerDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(videoPlayerDivId);
        this.videoPlayerCtrl = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(videoPlayerCtrlId);

        const storedVolume = localStorage.getItem('volume')
        if (storedVolume === null) {
            this.setVolume(1);
        } else {
            this.volume = parseFloat(storedVolume);
            //HtmlUtils.getElementByIdOrFail<HTMLInputElement>('videoplayer_volume').value = storedVolume;
        }

        //HtmlUtils.getElementByIdOrFail<HTMLInputElement>('videoplayer_volume').value = '' + this.volume;
    }

    private close(): void {
        this.videoPlayerCtrl.classList.remove('loading');
        this.videoPlayerCtrl.classList.add('hidden');
        this.opened = videoStates.closed;
    }

    private load(): void {
        this.videoPlayerCtrl.classList.remove('hidden');
        this.videoPlayerCtrl.classList.add('loading');
        this.opened = videoStates.loading;
    }

    private open(): void {
        this.videoPlayerCtrl.classList.remove('hidden', 'loading');
        this.opened = videoStates.playing;
    }

    private changeVolume(talking = false): void {
        if (!isUndefined(this.videoPlayerElem)) {
            this.videoPlayerElem.volume = this.naturalVolume(talking && this.decreaseWhileTalking);
            this.videoPlayerElem.muted = this.muted;
        }
    }

    private naturalVolume(makeSofter: boolean = false): number {
        const volume = this.volume
        const retVol = makeSofter && !this.volumeReduced ? Math.pow(volume * 0.5, 3) : volume
        this.volumeReduced = makeSofter
        return retVol;
    }

    private setVolume(volume: number): void {
        this.volume = volume;
        localStorage.setItem('volume', '' + volume);
    }


    public loadVideo(url: string): void {
        this.load();

        /* Solution 1, remove whole video player */
        this.videoPlayerDiv.innerHTML = ''; // necessary, if switching from one video context to another! (else both streams would play simultaneously)

        this.videoPlayerElem = document.createElement('video');
        this.videoPlayerElem.id = 'videoplayerelem';
        this.videoPlayerElem.controls = true;
        this.videoPlayerElem.preload = 'none';

        const srcElem = document.createElement('source');
        srcElem.src = url;

        this.videoPlayerElem.append(srcElem);

        this.videoPlayerDiv.append(this.videoPlayerElem);
        this.changeVolume();
        this.videoPlayerElem.play();

        /*const muteElem = HtmlUtils.getElementByIdOrFail<HTMLInputElement>('videoplayer_mute');
        muteElem.onclick = (ev: Event)=> {
            this.muted = !this.muted;
            this.changeVolume();

            if (this.muted) {
                HtmlUtils.getElementByIdOrFail<HTMLInputElement>('videoplayer_volume_icon_playing').classList.add('muted');
            } else {
                HtmlUtils.getElementByIdOrFail<HTMLInputElement>('videoplayer_volume_icon_playing').classList.remove('muted');
            }
        }

        const volumeElem = HtmlUtils.getElementByIdOrFail<HTMLInputElement>('videoplayer_volume');
        volumeElem.oninput = (ev: Event)=> {
            this.setVolume(parseFloat((<HTMLInputElement>ev.currentTarget).value));
            this.changeVolume();

            (<HTMLInputElement>ev.currentTarget).blur();
        }*/

        const decreaseElem = HtmlUtils.getElementByIdOrFail<HTMLInputElement>('videoplayer_decrease_while_talking');
        decreaseElem.oninput = (ev: Event)=> {
            this.decreaseWhileTalking = (<HTMLInputElement>ev.currentTarget).checked;
            this.changeVolume();
        }

        this.open();
    }

    public loop(): void {
        if (this.videoPlayerElem !== undefined) {
            this.videoPlayerElem.loop = true;
        }
    }

    public unloadVideo(): void {
        try {
            const videoElem = HtmlUtils.getElementByIdOrFail<HTMLVideoElement>('videoplayerelem');
            this.volume = videoElem.volume;
            this.muted = videoElem.muted;
            videoElem.pause();
            videoElem.loop = false;
            videoElem.src = "";
            videoElem.innerHTML = "";
            videoElem.load();
        } catch (e) {
            console.log('No video element loaded to unload');
        }

        this.close();
    }

    public decreaseVolume(): void {
        this.changeVolume(true);
    }

    public restoreVolume(): void {
        this.changeVolume(false);
    }
}

export const videoManager = new VideoManager();
