import type { IAnalyserNode, IAudioContext, IMediaStreamAudioSourceNode } from "standardized-audio-context";

/**
 * Class to measure the sound volume of a media stream
 */
export class SoundMeter {
    private instant: number;
    private clip: number;
    //private script: ScriptProcessorNode;
    private analyser: IAnalyserNode<IAudioContext> | undefined;
    private dataArray: Uint8Array | undefined;
    private context: IAudioContext | undefined;
    private source: IMediaStreamAudioSourceNode<IAudioContext> | undefined;

    constructor() {
        this.instant = 0.0;
        this.clip = 0.0;
        //this.script = context.createScriptProcessor(2048, 1, 1);
    }

    private init(context: IAudioContext) {
        this.context = context;
        this.analyser = this.context.createAnalyser();

        this.analyser.fftSize = 2048;
        const bufferLength = this.analyser.fftSize;
        this.dataArray = new Uint8Array(bufferLength);
    }

    public connectToSource(stream: MediaStream, context: IAudioContext): void {
        if (this.source !== undefined) {
            this.stop();
        }

        this.init(context);

        this.source = this.context?.createMediaStreamSource(stream);
        if (this.analyser !== undefined) {
            this.source?.connect(this.analyser);
        }
        //analyser.connect(distortion);
        //distortion.connect(this.context.destination);
        //this.analyser.connect(this.context.destination);
    }

    public getVolume(): number {
        if (this.context === undefined || this.dataArray === undefined || this.analyser === undefined) {
            return 0;
        }
        this.analyser.getByteFrequencyData(this.dataArray);

        const input = this.dataArray;
        let i;
        let sum = 0.0;
        //let clipcount = 0;
        for (i = 0; i < input.length; ++i) {
            sum += input[i] * input[i];
            //    if (Math.abs(input[i]) > 0.99) {
            //        clipcount += 1;
            //    }
        }
        this.instant = Math.sqrt(sum / input.length);
        //this.slow = 0.95 * that.slow + 0.05 * that.instant;
        //this.clip = clipcount / input.length;

        return this.instant;
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
    }
}
