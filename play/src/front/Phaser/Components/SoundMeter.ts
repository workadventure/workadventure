import type { IAnalyserNode, IAudioContext, IMediaStreamAudioSourceNode } from "standardized-audio-context";
import { AudioContext } from "standardized-audio-context";
/**
 * Class to measure the sound volume of a media stream
 */
export class SoundMeter {
    private instant: number;
    private clip: number;
    private analyser: IAnalyserNode<IAudioContext> | undefined;
    private dataArray: Uint8Array | undefined;
    private context: IAudioContext | undefined;
    private source: IMediaStreamAudioSourceNode<IAudioContext> | undefined;
    private readonly NB_OF_BAR = 7;
    private stream: MediaStream | undefined;
    private onAddTrackListener: ((event: MediaStreamTrackEvent) => void) | undefined;

    constructor(mediaStream: MediaStream) {
        this.instant = 0.0;
        this.clip = 0.0;
        this.connectToSource(mediaStream, new AudioContext());
    }

    public getVolume(): number[] {
        if (this.context === undefined || this.dataArray === undefined || this.analyser === undefined) {
            return [];
        }
        this.analyser.getByteFrequencyData(this.dataArray);

        // const input = this.dataArray;
        // let i;
        // let sum = 0.0;
        // //let clipcount = 0;
        // for (i = 0; i < input.length; ++i) {
        //     sum += input[i] * input[i];
        //     //    if (Math.abs(input[i]) > 0.99) {
        //     //        clipcount += 1;0
        //     //    }
        // }
        // this.instant = Math.sqrt(sum / input.length);
        // //this.slow = 0.95 * that.slow + 0.05 * that.instant;
        // //this.clip = clipcount / input.length;

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
        if (this.stream !== undefined && this.onAddTrackListener !== undefined) {
            this.stream.removeEventListener("addtrack", this.onAddTrackListener);
        }
        this.context = undefined;
        this.analyser = undefined;
        this.dataArray = undefined;
        this.source = undefined;
        this.stream = undefined;
        this.onAddTrackListener = undefined;
    }

    private init(context: IAudioContext) {
        this.context = context;
        this.analyser = this.context.createAnalyser();

        this.analyser.fftSize = 256;
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
    }

    private connectToSource(stream: MediaStream, context: IAudioContext): void {
        if (this.source !== undefined) {
            this.stop();
        }

        this.init(context);
        this.stream = stream;

        this.source = this.context?.createMediaStreamSource(stream);
        if (this.analyser !== undefined) {
            this.source?.connect(this.analyser);
        }

        // Listen for new tracks being added to the stream
        this.onAddTrackListener = (event: MediaStreamTrackEvent) => {
            if (event.track.kind === "audio" && this.context !== undefined) {
                // Reconnect the source to include the new track
                if (this.source !== undefined) {
                    this.source.disconnect();
                }
                this.source = this.context.createMediaStreamSource(stream);
                if (this.analyser !== undefined) {
                    this.source.connect(this.analyser);
                }
            }
        };
        this.stream.addEventListener("addtrack", this.onAddTrackListener);
        //analyser.connect(distortion);
        //distortion.connect(this.context.destination);
        //this.analyser.connect(this.context.destination);
    }
}
