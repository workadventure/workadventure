import { Subject } from "rxjs";
import { customWebRTCLogger } from "../CustomWebRTCLogger";
import audioWorkletProcessorUrl from "./InputAudioWorkletProcessor.ts?worker&url";

export class InputPCMStreamer {
    private readonly audioContext: AudioContext;
    private workletNode: AudioWorkletNode | null = null;
    private isWorkletLoaded = false;
    private readonly _pcmDataStream: Subject<Float32Array> = new Subject();
    public readonly pcmDataStream = this._pcmDataStream.asObservable();
    private readonly _voiceEvent: Subject<{
        event: "voiceStart" | "voiceStop";
        userId: number;
    }> = new Subject();
    public readonly voiceEvent = this._voiceEvent.asObservable();
    private readonly inputUserIds: Map<MediaStream, number> = new Map();
    private readonly voiceState: Map<number, {
        startDate: Date,
        timeout: ReturnType<typeof setTimeout>|undefined,
    }> = new Map();

    constructor(sampleRate = 24000) {
        this.audioContext = new AudioContext({ sampleRate });
    }

    // Initialize the AudioWorklet and load the processor script
    public async initWorklet() {
        if (!this.isWorkletLoaded) {
            try {
                await this.audioContext.resume();
                await this.audioContext.audioWorklet.addModule(audioWorkletProcessorUrl);
                this.workletNode = new AudioWorkletNode(this.audioContext, "input-pcm-worklet-processor", {
                    // FIXME: hard coded max number of inputs
                    numberOfInputs: 4,
                });
                this.isWorkletLoaded = true;

                this.workletNode.port.onmessage = (event: MessageEvent) => {
                    const data = event.data.pcmData;
                    if (data instanceof Float32Array) {
                        this._pcmDataStream.next(data);
                    } else if (event.data.event === "voiceStart" || event.data.event === "voiceStop") {
                        const channel = event.data.channel;
                        const userId = Array.from(this.inputUserIds.values())[channel];
                        if (userId === undefined) {
                            console.error("User ID not found for channel", channel);
                            return;
                        }

                        if (event.data.event === "voiceStart") {
                            const oldVoiceState = this.voiceState.get(userId);
                            if (oldVoiceState) {
                                clearTimeout(oldVoiceState.timeout);
                                oldVoiceState.timeout = undefined;
                                oldVoiceState.startDate = new Date();
                            } else {
                                this.voiceState.set(userId, {
                                    startDate: new Date(),
                                    timeout: undefined,
                                });
                                this._voiceEvent.next({ event: "voiceStart", userId });
                            }
                        } else if (event.data.event === "voiceStop") {
                            const startVoiceState = this.voiceState.get(userId);
                            if (startVoiceState) {
                                clearTimeout(startVoiceState.timeout);
                                startVoiceState.timeout = undefined;
                                startVoiceState.timeout = setTimeout(() => {
                                    this._voiceEvent.next({ event: "voiceStop", userId });
                                    this.voiceState.delete(userId);
                                }, 1000 /*Math.min(startVoiceState.startDate.getTime() + 1000 - new Date().getTime(), 0)*/);
                            }
                        }
                    } else {
                        console.error("Invalid data type received in worklet", event.data);
                    }
                };
            } catch (err) {
                console.error("Failed to load AudioWorkletProcessor:", err);
            }
        }
    }

    private mediaStreams: Map<MediaStream, MediaStreamAudioSourceNode> = new Map();

    // Method to get the MediaStream that can be added to WebRTC
    public addMediaStream(mediaStream: MediaStream, userId: number): void {
        if (!this.isWorkletLoaded || !this.workletNode) {
            console.error("AudioWorklet is not loaded yet.");
            return;
        }

        const sourceNode = this.audioContext.createMediaStreamSource(mediaStream);
        this.mediaStreams.set(mediaStream, sourceNode);
        this.inputUserIds.set(mediaStream, userId);
        sourceNode.connect(this.workletNode);
    }

    public removeMediaStream(mediaStream: MediaStream): void {
        if (!this.isWorkletLoaded || !this.workletNode) {
            console.error("AudioWorklet is not loaded yet.");
            return;
        }
        const sourceNode = this.mediaStreams.get(mediaStream);
        if (!sourceNode) {
            console.error("MediaStream not found. Unable to remove.");
            return;
        }

        sourceNode.disconnect(this.workletNode);
        this.mediaStreams.delete(mediaStream);
        this.inputUserIds.delete(mediaStream);
    }

    // Method to close the AudioWorkletNode and clean up resources
    public close(): void {
        if (this.workletNode) {
            // Disconnect the worklet node from the audio context
            this.workletNode.disconnect();
            this.workletNode.port.close(); // Close the MessagePort

            // Set the worklet node to null to avoid further use
            this.workletNode = null;
        }

        // Optionally, stop the AudioContext if no longer needed
        if (this.audioContext.state !== "closed") {
            this.audioContext
                .close()
                .then(() => {
                    customWebRTCLogger.info("AudioContext closed.");
                })
                .catch((err) => {
                    console.error("Error closing AudioContext:", err);
                });
        }

        this.isWorkletLoaded = false;
    }
}
