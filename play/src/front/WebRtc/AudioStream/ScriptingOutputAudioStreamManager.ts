import { Subscription } from "rxjs";
import { Deferred } from "ts-deferred";
import { iframeListener } from "../../Api/IframeListener";
import { SimplePeer } from "../SimplePeer";
import { OutputPCMStreamer } from "./OutputPCMStreamer";

/**
 * Class in charge of receiving audio streams from the scripting API and playing them.
 */
export class ScriptingOutputAudioStreamManager {
    private appendPCMDataStreamUnsubscriber: Subscription;
    private pcmStreamerDeferred: Deferred<OutputPCMStreamer> = new Deferred<OutputPCMStreamer>();
    private pcmStreamerResolved = false;
    private pcmStreamerResolving = false;
    private isListening = false;

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

        this.appendPCMDataStreamUnsubscriber = iframeListener.appendPCMDataStream.subscribe((message) => {
            this.pcmStreamerDeferred.promise
                .then((pcmStreamer) => {
                    pcmStreamer.appendPCMData(message.data);
                })
                .catch((e) => {
                    console.error("Error while appending PCM data", e);
                });
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
            console.log("Resetting audio buffer");
            const pcmStreamer = await this.pcmStreamerDeferred.promise;
            pcmStreamer.resetAudioBuffer();
        });
    }

    public close(): void {
        this.appendPCMDataStreamUnsubscriber.unsubscribe();
        iframeListener.unregisterAnswerer("startStreamInBubble");
        iframeListener.unregisterAnswerer("stopStreamInBubble");
        iframeListener.unregisterAnswerer("resetAudioBuffer");

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
