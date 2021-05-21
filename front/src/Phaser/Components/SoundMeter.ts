/**
 * Class to measure the sound volume of a media stream
 */
export class SoundMeter {
    private instant: number;
    private clip: number;
    //private script: ScriptProcessorNode;
    private analyser: AnalyserNode|undefined;
    private dataArray: Uint8Array|undefined;
    private context: AudioContext|undefined;
    private source: MediaStreamAudioSourceNode|undefined;

    constructor() {
        this.instant = 0.0;
        this.clip = 0.0;
        //this.script = context.createScriptProcessor(2048, 1, 1);
    }

    private init(context: AudioContext) {
        this.context = context;
        this.analyser = this.context.createAnalyser();

        this.analyser.fftSize = 2048;
        const bufferLength = this.analyser.fftSize;
        this.dataArray = new Uint8Array(bufferLength);
    }

    public connectToSource(stream: MediaStream, context: AudioContext): void
    {
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

        //console.log('instant', this.instant, 'clip', this.clip);

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


// Meter class that generates a number correlated to audio volume.
// The meter class itself displays nothing, but it makes the
// instantaneous and time-decaying volumes available for inspection.
// It also reports on the fraction of samples that were at or near
// the top of the measurement range.
/*function SoundMeter(context) {
    this.context = context;
    this.instant = 0.0;
    this.slow = 0.0;
    this.clip = 0.0;
    this.script = context.createScriptProcessor(2048, 1, 1);
    const that = this;
    this.script.onaudioprocess = function(event) {
        const input = event.inputBuffer.getChannelData(0);
        let i;
        let sum = 0.0;
        let clipcount = 0;
        for (i = 0; i < input.length; ++i) {
            sum += input[i] * input[i];
            if (Math.abs(input[i]) > 0.99) {
                clipcount += 1;
            }
        }
        that.instant = Math.sqrt(sum / input.length);
        that.slow = 0.95 * that.slow + 0.05 * that.instant;
        that.clip = clipcount / input.length;
    };
}

SoundMeter.prototype.connectToSource = function(stream, callback) {
    console.log('SoundMeter connecting');
    try {
        this.mic = this.context.createMediaStreamSource(stream);
        this.mic.connect(this.script);
        // necessary to make sample run, but should not be.
        this.script.connect(this.context.destination);
        if (typeof callback !== 'undefined') {
            callback(null);
        }
    } catch (e) {
        console.error(e);
        if (typeof callback !== 'undefined') {
            callback(e);
        }
    }
};

SoundMeter.prototype.stop = function() {
    this.mic.disconnect();
    this.script.disconnect();
};
*/
