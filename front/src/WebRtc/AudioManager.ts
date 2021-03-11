import {HtmlUtils} from "./HtmlUtils";
import {isUndefined} from "generic-type-guard";

enum audioStates {
    closed = 0,
    loading = 1,
    playing = 2
}

const audioPlayerDivId = "audioplayer";
const audioPlayerCtrlId = "audioplayerctrl";
const audioPlayerVolId = "audioplayer_volume";
const animationTime = 500;

class AudioManager {
    private opened = audioStates.closed;

    private audioPlayerDiv: HTMLDivElement;
    private audioPlayerCtrl: HTMLDivElement;
    private audioPlayerElem: HTMLAudioElement | undefined;
    private audioPlayerVol: HTMLInputElement;

    private volume = 1;
    private muted = false;
    private decreaseWhileTalking = true;
    private volumeReduced = false;

    constructor() {
        this.audioPlayerDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(audioPlayerDivId);
        this.audioPlayerCtrl = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(audioPlayerCtrlId);
        this.audioPlayerVol = HtmlUtils.getElementByIdOrFail<HTMLInputElement>(audioPlayerVolId);

        const storedVolume = localStorage.getItem('volume')
        if (storedVolume === null) {
            this.setVolume(1);
        } else {
            this.volume = parseFloat(storedVolume);
            this.audioPlayerVol.value = storedVolume;
        }

        this.audioPlayerVol.value = '' + this.volume;
    }

    public playAudio(url: string|number|boolean, mapDirUrl: string, loop=false): void {
        const audioPath = url as string;
        let realAudioPath = '';

        if (audioPath.indexOf('://') > 0) {
            // remote file or stream
            realAudioPath = audioPath;
        } else {
            // local file, include it relative to map directory
            realAudioPath = mapDirUrl + '/' + url;
        }

        this.loadAudio(realAudioPath);

        if (loop) {
            this.loop();
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
        if (isUndefined(this.audioPlayerElem)) {
            return;
        }

        const reduceVolume = talking && this.decreaseWhileTalking;
        if (reduceVolume && !this.volumeReduced) {
            this.volume *= 0.5;
        } else if (!reduceVolume && this.volumeReduced) {
            this.volume *= 2.0;
        }
        this.volumeReduced = reduceVolume;

        this.audioPlayerElem.volume = this.volume;
        this.audioPlayerVol.value = '' + this.volume;
        this.audioPlayerElem.muted = this.muted;
    }

    private setVolume(volume: number): void {
        this.volume = volume;
        localStorage.setItem('volume', '' + volume);
    }


    private loadAudio(url: string): void {
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

            if (this.muted) {
                HtmlUtils.getElementByIdOrFail<HTMLInputElement>('audioplayer_volume_icon_playing').classList.add('muted');
            } else {
                HtmlUtils.getElementByIdOrFail<HTMLInputElement>('audioplayer_volume_icon_playing').classList.remove('muted');
            }
        }

        this.audioPlayerVol.oninput = (ev: Event)=> {
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

    private loop(): void {
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
