import { Subscription } from "rxjs";
import { Deferred } from "ts-deferred";
import { get, Readable, Unsubscriber } from "svelte/store";
import { iframeListener } from "../../Api/IframeListener";
import { videoStreamElementsStore } from "../../Stores/PeerStore";
import { Streamable } from "../../Stores/StreamableCollectionStore";
import { VideoBox } from "../../Space/Space";
import { observeArrayStoreChanges } from "../../Stores/Utils/observeArrayStoreWithNestedChanges";
import { InputPCMStreamer } from "./InputPCMStreamer";

/**
 * Class in charge of receiving audio streams from the users and forwarding them to the scripting API for analysis.
 */
export class ScriptingInputAudioStreamManager {
    private appendPCMDataStreamUnsubscriber: Subscription | undefined;
    private pcmStreamerDeferred: Deferred<InputPCMStreamer> = new Deferred<InputPCMStreamer>();
    private pcmStreamerResolved = false;
    private pcmStreamerResolving = false;
    private isListening = false;
    private streams: Map<Readable<MediaStream | undefined>, Unsubscriber> = new Map();
    private videoStreamElementsChangesUnsubscriber: Subscription | undefined;
    private streamableUnsubscribers: Map<string, Unsubscriber> = new Map();

    constructor() {
        // No longer needs space parameter as we observe videoStreamElementsStore directly
        // videoPeerAdded and videoPeerRemoved subscriptions are no longer needed
        // as observeArrayStoreWithNestedChanges on videoStreamElementsStore captures all changes
    }

    public async startListeningToAudioStream(sampleRate: number): Promise<void> {
        if (this.isListening) {
            throw new Error("Already listening");
        }

        this.isListening = true;

        // Start listening to the stream
        if (this.pcmStreamerResolved || this.pcmStreamerResolving) {
            throw new Error("Already listening");
        }
        const pcmStreamer = new InputPCMStreamer(sampleRate);
        this.pcmStreamerResolving = true;
        await pcmStreamer.initWorklet();
        this.pcmStreamerResolved = true;
        this.pcmStreamerResolving = false;
        this.pcmStreamerDeferred.resolve(pcmStreamer);

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

        // Observe changes in videoStreamElementsStore
        const videoStreamElementsChanges$ = observeArrayStoreChanges<VideoBox, string>(videoStreamElementsStore);

        this.videoStreamElementsChangesUnsubscriber = videoStreamElementsChanges$.subscribe((event) => {
            console.log("[ScriptingInputAudioStreamManager] Array store event:", event.type, {
                peerId: event.item.uniqueId,
                key: event.key,
            });
            if (event.type === "add") {
                this.handlePeerAdded(event.item);
            } else if (event.type === "delete") {
                this.handlePeerRemoved(event.item);
            } else if (event.type === "update") {
                console.log("[ScriptingInputAudioStreamManager] Peer updated:", {
                    peerId: event.item.uniqueId,
                    previousPeerId: event.previousItem.uniqueId,
                });
                this.handlePeerRemoved(event.previousItem);
                this.handlePeerAdded(event.item);
            }
        });
    }

    public stopListeningToAudioStream(): void {
        this.isListening = false;

        this.appendPCMDataStreamUnsubscriber?.unsubscribe();
        this.appendPCMDataStreamUnsubscriber = undefined;

        // Unsubscribe from video stream elements changes
        if (this.videoStreamElementsChangesUnsubscriber) {
            this.videoStreamElementsChangesUnsubscriber.unsubscribe();
            this.videoStreamElementsChangesUnsubscriber = undefined;
        }

        // Unsubscribe from all streamable stores
        for (const unsubscriber of this.streamableUnsubscribers.values()) {
            unsubscriber();
        }
        this.streamableUnsubscribers.clear();

        // Remove all tracked streams
        for (const [streamStore] of this.streams.entries()) {
            this.removeMediaStreamStore(streamStore);
        }

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
    }

    private addMediaStreamStore(streamStore: Readable<MediaStream | undefined>): void {
        let lastValue: MediaStream | undefined = undefined;
        const unsubscriber = streamStore.subscribe((stream) => {
            if (stream) {
                console.log("[ScriptingInputAudioStreamManager] MediaStream added:", {
                    id: stream.id,
                    audioTracks: stream.getAudioTracks().length,
                    videoTracks: stream.getVideoTracks().length,
                    audioTrackIds: stream.getAudioTracks().map((t) => t.id),
                });
                this.pcmStreamerDeferred.promise
                    .then((pcmStreamer) => {
                        pcmStreamer.addMediaStream(stream);
                        lastValue = stream;
                        console.log("[ScriptingInputAudioStreamManager] MediaStream added to PCM streamer:", stream.id);
                    })
                    .catch((e) => {
                        console.error("[ScriptingInputAudioStreamManager] Error while adding stream", e);
                    });
            } else {
                console.log("[ScriptingInputAudioStreamManager] MediaStream removed (stream is null/undefined)");
                this.pcmStreamerDeferred.promise
                    .then((pcmStreamer) => {
                        if (lastValue) {
                            console.log(
                                "[ScriptingInputAudioStreamManager] Removing MediaStream from PCM streamer:",
                                lastValue.id
                            );
                            pcmStreamer.removeMediaStream(lastValue);
                            lastValue = undefined;
                        }
                    })
                    .catch((e) => {
                        console.error("[ScriptingInputAudioStreamManager] Error while removing stream", e);
                    });
            }
        });
        this.streams.set(streamStore, unsubscriber);
        console.log(
            "[ScriptingInputAudioStreamManager] Subscribed to streamStore, total streams tracked:",
            this.streams.size
        );
    }

    private removeMediaStreamStore(streamStore: Readable<MediaStream | undefined>): void {
        const unsubscriber = this.streams.get(streamStore);
        if (unsubscriber) {
            unsubscriber();
            this.streams.delete(streamStore);
            console.log(
                "[ScriptingInputAudioStreamManager] Unsubscribed from streamStore, remaining streams:",
                this.streams.size
            );
        } else {
            console.error("[ScriptingInputAudioStreamManager] Stream not found. Unable to remove.");
        }
    }

    private handlePeerAdded(peer: VideoBox): void {
        const peerId = peer.uniqueId;
        console.log("[ScriptingInputAudioStreamManager] Peer added:", {
            peerId,
            spaceUserId: peer.spaceUser?.spaceUserId,
        });

        // Clean up existing subscription if any
        const existingUnsubscriber = this.streamableUnsubscribers.get(peerId);
        if (existingUnsubscriber) {
            console.log(
                "[ScriptingInputAudioStreamManager] Cleaning up existing streamable subscription for peer:",
                peerId
            );
            existingUnsubscriber();
        }

        // Observe the streamable store for this peer
        let lastStreamable: Streamable | undefined = get(peer.streamable);
        console.log("[ScriptingInputAudioStreamManager] Initial streamable for peer:", {
            peerId,
            streamableType: lastStreamable?.media.type,
            hasStreamable: !!lastStreamable,
        });
        this.updateStreamForStreamable(peerId, lastStreamable);

        const streamableUnsubscriber = peer.streamable.subscribe((streamable) => {
            // Only update if streamable actually changed
            if (lastStreamable !== streamable) {
                console.log("[ScriptingInputAudioStreamManager] Streamable changed for peer:", {
                    peerId,
                    previousType: lastStreamable?.media.type,
                    newType: streamable?.media.type,
                    hasPrevious: !!lastStreamable,
                    hasNew: !!streamable,
                });
                this.updateStreamForStreamable(peerId, streamable, lastStreamable);
                lastStreamable = streamable;
            }
        });

        this.streamableUnsubscribers.set(peerId, streamableUnsubscriber);
        console.log(
            "[ScriptingInputAudioStreamManager] Subscribed to streamable for peer:",
            peerId,
            "Total streamable subscriptions:",
            this.streamableUnsubscribers.size
        );
    }

    private handlePeerRemoved(peer: VideoBox): void {
        const peerId = peer.uniqueId;
        console.log("[ScriptingInputAudioStreamManager] Peer removed:", {
            peerId,
            spaceUserId: peer.spaceUser?.spaceUserId,
        });

        // Unsubscribe from streamable store
        const streamableUnsubscriber = this.streamableUnsubscribers.get(peerId);
        if (streamableUnsubscriber) {
            streamableUnsubscriber();
            this.streamableUnsubscribers.delete(peerId);
            console.log(
                "[ScriptingInputAudioStreamManager] Unsubscribed from streamable for peer:",
                peerId,
                "Remaining streamable subscriptions:",
                this.streamableUnsubscribers.size
            );
        }

        // Remove stream if it was being tracked
        const streamable = get(peer.streamable);
        if (streamable && (streamable.media.type === "webrtc" || streamable.media.type === "livekit")) {
            console.log("[ScriptingInputAudioStreamManager] Removing streamStore for removed peer:", {
                peerId,
                streamableType: streamable.media.type,
            });
            this.removeMediaStreamStore(streamable.media.streamStore);
        }
    }

    private updateStreamForStreamable(
        peerId: string,
        streamable: Streamable | undefined,
        previousStreamable?: Streamable
    ): void {
        const previousWasTracked =
            previousStreamable &&
            (previousStreamable.media.type === "webrtc" || previousStreamable.media.type === "livekit");
        const currentIsTracked =
            streamable && (streamable.media.type === "webrtc" || streamable.media.type === "livekit");

        console.log("[ScriptingInputAudioStreamManager] updateStreamForStreamable:", {
            peerId,
            previousWasTracked,
            currentIsTracked,
            previousType: previousStreamable?.media.type,
            currentType: streamable?.media.type,
        });

        // If streamable changed from tracked to untracked, remove it
        if (previousWasTracked && !currentIsTracked && previousStreamable) {
            console.log("[ScriptingInputAudioStreamManager] Streamable changed from tracked to untracked, removing:", {
                peerId,
                previousType: previousStreamable.media.type,
            });
            this.removeMediaStreamStore(previousStreamable.media.streamStore);
        }
        // If streamable changed from untracked to tracked, add it
        else if (!previousWasTracked && currentIsTracked && streamable) {
            console.log("[ScriptingInputAudioStreamManager] Streamable changed from untracked to tracked, adding:", {
                peerId,
                currentType: streamable.media.type,
            });
            this.addMediaStreamStore(streamable.media.streamStore);
        }
        // If both are tracked but the streamStore reference changed, update it
        else if (previousWasTracked && currentIsTracked && previousStreamable && streamable) {
            if (previousStreamable.media.streamStore !== streamable.media.streamStore) {
                console.log("[ScriptingInputAudioStreamManager] StreamStore reference changed, updating:", {
                    peerId,
                    previousStreamStore: previousStreamable.media.streamStore,
                    newStreamStore: streamable.media.streamStore,
                });
                this.removeMediaStreamStore(previousStreamable.media.streamStore);
                this.addMediaStreamStore(streamable.media.streamStore);
            } else {
                console.log(
                    "[ScriptingInputAudioStreamManager] Streamable type changed but streamStore reference unchanged:",
                    {
                        peerId,
                        previousType: previousStreamable.media.type,
                        currentType: streamable.media.type,
                    }
                );
            }
        }
        // If streamable is newly tracked (no previous), add it
        else if (!previousStreamable && currentIsTracked && streamable) {
            console.log("[ScriptingInputAudioStreamManager] New streamable tracked, adding:", {
                peerId,
                currentType: streamable.media.type,
            });
            this.addMediaStreamStore(streamable.media.streamStore);
        } else {
            console.log("[ScriptingInputAudioStreamManager] No action needed for streamable update:", {
                peerId,
                previousWasTracked,
                currentIsTracked,
            });
        }
    }

    public close(): void {
        this.appendPCMDataStreamUnsubscriber?.unsubscribe();
        this.videoStreamElementsChangesUnsubscriber?.unsubscribe();

        // Unsubscribe from all streamable stores
        for (const unsubscriber of this.streamableUnsubscribers.values()) {
            unsubscriber();
        }
        this.streamableUnsubscribers.clear();

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
