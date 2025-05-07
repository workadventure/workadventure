import { Subscription } from "rxjs";
import { Deferred } from "ts-deferred";
import { get, Readable, Unsubscriber } from "svelte/store";
import { iframeListener } from "../../Api/IframeListener";
import { SimplePeer } from "../SimplePeer";
import { peerStore } from "../../Stores/PeerStore";
import { InputPCMStreamer } from "./InputPCMStreamer";

/**
 * Class in charge of receiving audio streams from the scripting API and playing them.
 */
export class ScriptingInputAudioStreamManager {
    private appendPCMDataStreamUnsubscriber: Subscription | undefined;
    private startListeningToStreamInBubbleStreamUnsubscriber: Subscription;
    private stopListeningToStreamInBubbleStreamUnsubscriber: Subscription;
    private pcmStreamerDeferred: Deferred<InputPCMStreamer> = new Deferred<InputPCMStreamer>();
    private pcmStreamerResolved = false;
    private pcmStreamerResolving = false;
    private isListening = false;
    private streams: Map<Readable<MediaStream | undefined>, Unsubscriber> = new Map();
    private videoPeerAddedUnsubscriber: Subscription;
    private videoPeerRemovedUnsubscriber: Subscription;

    constructor(simplePeer: SimplePeer) {
        this.startListeningToStreamInBubbleStreamUnsubscriber =
            iframeListener.startListeningToStreamInBubbleStream.subscribe((message) => {
                (async () => {
                    if (this.isListening) {
                        throw new Error("Already listening");
                    }

                    this.isListening = true;

                    // Start listening to the stream
                    if (this.pcmStreamerResolved || this.pcmStreamerResolving) {
                        throw new Error("Already listening");
                    }
                    const pcmStreamer = new InputPCMStreamer(message.sampleRate);
                    this.pcmStreamerResolving = true;
                    await pcmStreamer.initWorklet();
                    this.pcmStreamerResolved = true;
                    this.pcmStreamerResolving = false;
                    this.pcmStreamerDeferred.resolve(pcmStreamer);

                    // eslint-disable-next-line @smarttools/rxjs/no-nested-subscribe
                    this.appendPCMDataStreamUnsubscriber = pcmStreamer.pcmDataStream.subscribe((data) => {
                        iframeListener.postMessage(
                            {
                                type: "appendPCMData",
                                data: { data: data as Float32Array<ArrayBuffer> },
                            },
                            undefined /*, [data.buffer]*/
                        );
                        // Note: if we try to transfer the buffer, we get the following error:
                        //      ArrayBuffer already detached.
                        // It looks like a bug in the browser to me (the ArrayBuffer was detached from the worklet process
                        // and should be attached to the main process and detachable again to the scripting iframe).
                    });

                    // Let's add all the peers to the stream
                    get(peerStore).forEach((peer) => {
                        this.addMediaStreamStore(peer.streamStore);
                    });
                })().catch((e) => {
                    console.error("Error while starting listening to streams", e);
                });
            });

        this.stopListeningToStreamInBubbleStreamUnsubscriber =
            iframeListener.stopListeningToStreamInBubbleStream.subscribe(() => {
                this.isListening = false;

                this.appendPCMDataStreamUnsubscriber?.unsubscribe();
                this.appendPCMDataStreamUnsubscriber = undefined;

                // Let's remove all the peers to the stream
                get(peerStore).forEach((peer) => {
                    this.removeMediaStreamStore(peer.streamStore);
                });

                if (this.pcmStreamerResolved || this.pcmStreamerResolving) {
                    this.pcmStreamerDeferred.promise
                        .then((pcmStreamer) => {
                            pcmStreamer.close();
                            this.pcmStreamerDeferred = new Deferred<InputPCMStreamer>();
                        })
                        .catch((e) => {
                            console.error("Error while stopping stream", e);
                        });
                } else {
                    console.error("stopListeningToStreamInBubble called while no stream is running");
                }

                this.pcmStreamerResolved = false;
                this.pcmStreamerResolving = false;
                this.pcmStreamerDeferred = new Deferred<InputPCMStreamer>();
            });

        this.videoPeerAddedUnsubscriber = simplePeer.videoPeerAdded.subscribe((peer) => {
            if (this.isListening) {
                this.addMediaStreamStore(peer.streamStore);
            }
        });

        this.videoPeerRemovedUnsubscriber = simplePeer.videoPeerRemoved.subscribe((peer) => {
            if (this.isListening) {
                this.removeMediaStreamStore(peer.streamStore);
            }
        });
    }

    private addMediaStreamStore(streamStore: Readable<MediaStream | undefined>): void {
        let lastValue: MediaStream | undefined = undefined;
        const unsubscriber = streamStore.subscribe((stream) => {
            if (stream) {
                this.pcmStreamerDeferred.promise
                    .then((pcmStreamer) => {
                        pcmStreamer.addMediaStream(stream);
                        lastValue = stream;
                    })
                    .catch((e) => {
                        console.error("Error while adding stream", e);
                    });
            } else {
                this.pcmStreamerDeferred.promise
                    .then((pcmStreamer) => {
                        if (lastValue) {
                            pcmStreamer.removeMediaStream(lastValue);
                            lastValue = undefined;
                        }
                    })
                    .catch((e) => {
                        console.error("Error while removing stream", e);
                    });
            }
        });
        this.streams.set(streamStore, unsubscriber);
    }

    private removeMediaStreamStore(streamStore: Readable<MediaStream | undefined>): void {
        const unsubscriber = this.streams.get(streamStore);
        if (unsubscriber) {
            unsubscriber();
            this.streams.delete(streamStore);
        } else {
            console.error("Stream not found. Unable to remove.");
        }
    }

    public close(): void {
        this.startListeningToStreamInBubbleStreamUnsubscriber.unsubscribe();
        this.stopListeningToStreamInBubbleStreamUnsubscriber.unsubscribe();
        this.videoPeerAddedUnsubscriber.unsubscribe();
        this.videoPeerRemovedUnsubscriber.unsubscribe();
        this.appendPCMDataStreamUnsubscriber?.unsubscribe();

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
