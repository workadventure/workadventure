import {HtmlUtils} from "./HtmlUtils";
import {isUndefined} from "generic-type-guard";
import {localUserStore} from "../Connexion/LocalUserStore";

enum audioStates {
    closed = 0,
    loading = 1,
    playing = 2
}

const audioPlayerDivId = "audioplayer";
const audioPlayerCtrlId = "audioplayerctrl";
const animationTime = 500;

class AudioManager {
    private opened = audioStates.closed;

    private audioPlayerDiv: HTMLDivElement;
    private audioPlayerCtrl: HTMLDivElement;
    private audioPlayerElem: HTMLAudioElement | undefined;

    private volume = 1;
    private muted = false;
    private decreaseWhileTalking = true;
    private volumeReduced = false;

    constructor() {
        this.audioPlayerDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(audioPlayerDivId);
        this.audioPlayerCtrl = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(audioPlayerCtrlId);
        this.volume = localUserStore.getAudioPlayerVolume();
        HtmlUtils.getElementByIdOrFail<HTMLInputElement>('audioplayer_volume').value = '' + localUserStore.getAudioPlayerVolume();

        this.muted = localUserStore.getAudioPlayerMuted();
        if (this.muted) {
            HtmlUtils.getElementByIdOrFail<HTMLInputElement>('audioplayer_volume_icon_playing').classList.add('muted');
        }
    }

    private close(): void {
        this.audioPlayerCtrl.classList.remove('loading');
        this.audioPlayerCtrl.classList.add('hidden');
        this.opened = audioStates.closed;
    }

    private load(): void {
        this.audioPlayerCtrl.classList.remove('hidden');
        this.audioPlayerCtrl.classList.add('loading');
        this.opened = audioStates.loading;
    }

    private open(): void {
        this.audioPlayerCtrl.classList.remove('hidden', 'loading');
        this.opened = audioStates.playing;
    }

    private changeVolume(talking = false): void {
        if (!isUndefined(this.audioPlayerElem)) {
            this.audioPlayerElem.volume = this.naturalVolume(talking && this.decreaseWhileTalking);
            this.audioPlayerElem.muted = this.muted;
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
        localUserStore.setAudioPlayerVolume(volume);
    }

    public loadAudio(url: string): void {
        this.load();

        /* Solution 1, remove whole audio player */
        this.audioPlayerDiv.innerHTML = ''; // necessary, if switching from one audio context to another! (else both streams would play simultaneously)

        this.audioPlayerElem = document.createElement('audio');
        this.audioPlayerElem.id = 'audioplayerelem';
        this.audioPlayerElem.controls = false;
        this.audioPlayerElem.preload = 'none';

        const srcElem = document.createElement('source');
        srcElem.type = "audio/mp3";
        srcElem.src = url;

        this.audioPlayerElem.append(srcElem);

        this.audioPlayerDiv.append(this.audioPlayerElem);
        this.changeVolume();
        this.audioPlayerElem.play();

        const muteElem = HtmlUtils.getElementByIdOrFail<HTMLInputElement>('audioplayer_mute');
        muteElem.onclick = (ev: Event)=> {
            this.muted = !this.muted;
            this.changeVolume();
            localUserStore.setAudioPlayerMuted(this.muted);

            if (this.muted) {
                localStorage.setItem('audioplayer_muted', 'true');
                HtmlUtils.getElementByIdOrFail<HTMLInputElement>('audioplayer_volume_icon_playing').classList.add('muted');
            } else {
                localStorage.setItem('audioplayer_muted', 'false');
                HtmlUtils.getElementByIdOrFail<HTMLInputElement>('audioplayer_volume_icon_playing').classList.remove('muted');
            }
        }

        const volumeElem = HtmlUtils.getElementByIdOrFail<HTMLInputElement>('audioplayer_volume');
        volumeElem.oninput = (ev: Event)=> {
            this.setVolume(parseFloat((<HTMLInputElement>ev.currentTarget).value));
            this.changeVolume();

            (<HTMLInputElement>ev.currentTarget).blur();
        }

        const decreaseElem = HtmlUtils.getElementByIdOrFail<HTMLInputElement>('audioplayer_decrease_while_talking');
        decreaseElem.oninput = (ev: Event)=> {
            this.decreaseWhileTalking = (<HTMLInputElement>ev.currentTarget).checked;
            this.changeVolume();
        }

        this.open();
    }

    public loop(): void {
        if (this.audioPlayerElem !== undefined) {
            this.audioPlayerElem.loop = true;
        }
    }

    public unloadAudio(): void {
        try {
            const audioElem = HtmlUtils.getElementByIdOrFail<HTMLAudioElement>('audioplayerelem');
            this.volume = audioElem.volume;
            this.muted = audioElem.muted;
            audioElem.pause();
            audioElem.loop = false;
            audioElem.src = "";
            audioElem.innerHTML = "";
            audioElem.load();
        } catch (e) {
            console.log('No audio element loaded to unload');
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

export const audioManager = new AudioManager();
