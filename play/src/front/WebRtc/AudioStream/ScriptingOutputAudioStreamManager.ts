import { Deferred } from "ts-deferred";
import { iframeListener } from "../../Api/IframeListener";
import { SimplePeer } from "../SimplePeer";
import { customWebRTCLogger } from "../CustomWebRTCLogger";
import { OutputPCMStreamer } from "./OutputPCMStreamer";

/**
 * Class in charge of receiving audio streams from the scripting API and playing them.
 */
export class ScriptingOutputAudioStreamManager {
    private pcmStreamerDeferred: Deferred<OutputPCMStreamer> = new Deferred<OutputPCMStreamer>();
    private pcmStreamerResolved = false;
    private pcmStreamerResolving = false;

    constructor(simplePeer: SimplePeer) {
        iframeListener.registerAnswerer("startStreamInBubble", async (message) => {
            if (this.pcmStreamerResolved || this.pcmStreamerResolving) {
                throw new Error("A stream is already running");
            }
            const pcmStreamer = new OutputPCMStreamer(message.sampleRate);
            this.pcmStreamerResolving = true;
            await pcmStreamer.initWorklet();
            this.pcmStreamerResolved = true;
            this.pcmStreamerResolving = false;
            this.pcmStreamerDeferred.resolve(pcmStreamer);
            simplePeer.dispatchStream(pcmStreamer.getMediaStream());
        });

        iframeListener.registerAnswerer("appendPCMData", async (message) => {
            const pcmStreamer = await this.pcmStreamerDeferred.promise;
            await pcmStreamer.appendPCMData(message.data);
        });

        iframeListener.registerAnswerer("stopStreamInBubble", () => {
            if (this.pcmStreamerResolved || this.pcmStreamerResolving) {
                this.pcmStreamerDeferred.promise
                    .then((pcmStreamer) => {
                        pcmStreamer.close();
                    })
                    .catch((e) => {
                        console.error("Error while stopping stream", e);
                    });
            } else {
                console.error("stopStreamInBubble called while no stream is running");
            }
            this.pcmStreamerResolved = false;
            this.pcmStreamerResolving = false;
            this.pcmStreamerDeferred = new Deferred<OutputPCMStreamer>();
        });

        iframeListener.registerAnswerer("resetAudioBuffer", async () => {
            customWebRTCLogger.info("Resetting audio buffer");
            const pcmStreamer = await this.pcmStreamerDeferred.promise;
            pcmStreamer.resetAudioBuffer();
        });
    }

    public close(): void {
        iframeListener.unregisterAnswerer("startStreamInBubble");
        iframeListener.unregisterAnswerer("stopStreamInBubble");
        iframeListener.unregisterAnswerer("resetAudioBuffer");
        iframeListener.unregisterAnswerer("appendPCMData");

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
