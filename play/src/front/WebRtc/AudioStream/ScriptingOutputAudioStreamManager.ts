import { Deferred } from "@workadventure/shared-utils";
import { customWebRTCLogger } from "../CustomWebRTCLogger";
import type { SpaceInterface } from "../../Space/SpaceInterface";
import { OutputPCMStreamer } from "./OutputPCMStreamer";

/**
 * Class in charge of receiving audio streams from the scripting API and playing them.
 */
export class ScriptingOutputAudioStreamManager {
    private pcmStreamerDeferred: Deferred<OutputPCMStreamer> = new Deferred<OutputPCMStreamer>();
    private pcmStreamerResolved = false;
    private pcmStreamerResolving = false;

    constructor(private readonly space: SpaceInterface) {}

    public async startStream(sampleRate: number): Promise<void> {
        if (this.pcmStreamerResolved || this.pcmStreamerResolving) {
            throw new Error("A stream is already running");
        }
        const pcmStreamer = new OutputPCMStreamer(sampleRate);
        this.pcmStreamerResolving = true;
        try {
            await pcmStreamer.initWorklet();
            this.pcmStreamerResolved = true;
            this.pcmStreamerDeferred.resolve(pcmStreamer);
            this.space.spacePeerManager.dispatchStream(pcmStreamer.getMediaStream());
        } finally {
            this.pcmStreamerResolving = false;
        }
    }

    public async appendPCMData(float32Array: Float32Array): Promise<void> {
        const pcmStreamer = await this.pcmStreamerDeferred.promise;
        await pcmStreamer.appendPCMData(float32Array);
    }

    public stopStream(): void {
        if (this.pcmStreamerResolved || this.pcmStreamerResolving) {
            this.pcmStreamerDeferred.promise
                .then((pcmStreamer) => {
                    pcmStreamer.close();
                })
                .catch((e) => {
                    console.error("Error while stopping stream", e);
                });
        } else {
            console.error("stopStream called while no stream is running");
        }
        this.pcmStreamerResolved = false;
        this.pcmStreamerResolving = false;
        this.pcmStreamerDeferred = new Deferred<OutputPCMStreamer>();
    }

    public async resetAudioBuffer(): Promise<void> {
        customWebRTCLogger.info("Resetting audio buffer");
        const pcmStreamer = await this.pcmStreamerDeferred.promise;
        pcmStreamer.resetAudioBuffer();
    }

    public close(): void {
        if (this.pcmStreamerResolved || this.pcmStreamerResolving) {
            this.pcmStreamerDeferred.promise
                .then((pcmStreamer) => {
                    pcmStreamer.close();
                })
                .catch((e) => {
                    console.error("Error while closing stream", e);
                });
        }
    }
}
