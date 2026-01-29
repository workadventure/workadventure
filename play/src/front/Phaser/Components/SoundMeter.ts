import { audioContextManager } from "../../WebRtc/AudioContextManager";
/**
 * Class to measure the sound volume of a media stream
 */
export class SoundMeter {
    private instant: number;
    private clip: number;
    private analyser: AnalyserNode | undefined;
    private dataArray: Uint8Array | undefined;
    private context: AudioContext | undefined;
    private source: MediaStreamAudioSourceNode | undefined;
    private readonly NB_OF_BAR = 7;
    private stream: MediaStream | undefined;

    constructor(mediaStream: MediaStream) {
        this.instant = 0.0;
        this.clip = 0.0;
        this.connectToSource(mediaStream, audioContextManager.getContext());
    }

    public getVolume(): number[] {
        if (this.context === undefined || this.dataArray === undefined || this.analyser === undefined) {
            return [];
        }
        this.analyser.getByteFrequencyData(this.dataArray);

        return this.getFrequenciesByBar();
    }

    public getFrequenciesByBar() {
        const spectrum: number[] = [0, 0, 0, 0, 0, 0, 0];

        if (!this.dataArray) {
            return spectrum;
        }

        this.analyser?.getByteFrequencyData(this.dataArray);
        for (let i = 0; i < this.NB_OF_BAR; i++) {
            const index = (i + 10) * 2; //Covers more steps from the whole spectrum.
            spectrum[i] = this.dataArray[index];
        }
        return spectrum;
    }

    public stop(): void {
        if (this.context === undefined) {
            return;
        }
        if (this.source !== undefined) {
            this.source.disconnect();
        }
        this.context = undefined;
        this.analyser = undefined;
        this.dataArray = undefined;
        this.source = undefined;
        this.stream = undefined;
    }

    private init(context: AudioContext) {
        this.context = context;
        this.analyser = this.context.createAnalyser();

        this.analyser.fftSize = 256;
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
    }

    private connectToSource(stream: MediaStream, context: AudioContext): void {
        if (this.source !== undefined) {
            this.stop();
        }

        this.init(context);
        this.stream = stream;

        this.source = this.context?.createMediaStreamSource(stream);
        if (this.analyser !== undefined) {
            this.source?.connect(this.analyser);
        }
    }
}
