import type { Subscription } from "rxjs";
import type { Readable, Unsubscriber } from "svelte/store";
import { derived } from "svelte/store";
import { iframeListener } from "../../Api/IframeListener";
import type { SpaceInterface } from "../../Space/SpaceInterface";
import type { Streamable } from "../../Space/Streamable";
import { InputPCMStreamer } from "./InputPCMStreamer";

/**
 * Class in charge of receiving audio streams from the users and forwarding them to the scripting API for analysis.
 */
export class ScriptingInputAudioStreamManager {
    private pcmStreamer: InputPCMStreamer | undefined;
    private appendPCMDataStreamUnsubscriber: Subscription | undefined;
    private peerAudioStreamsUnsubscriber: Unsubscriber | undefined;

    constructor(private readonly space: SpaceInterface) {}

    public async startListeningToAudioStream(sampleRate: number, meetingId?: string): Promise<void> {
        if (this.pcmStreamer) {
            throw new Error("Already listening");
        }

        const pcmStreamer = new InputPCMStreamer(sampleRate);
        this.pcmStreamer = pcmStreamer;
        await pcmStreamer.initWorklet();
        if (this.pcmStreamer !== pcmStreamer) {
            // stopListeningToAudioStream() was called while the worklet was loading
            pcmStreamer.close();
            return;
        }

        this.appendPCMDataStreamUnsubscriber = pcmStreamer.pcmDataStream.subscribe((data) => {
            if (meetingId !== undefined) {
                iframeListener.postMessage(
                    {
                        type: "appendMeetingPCMData",
                        data: { meetingId, data: data as Float32Array<ArrayBuffer> },
                    },
                    undefined /*, [data.buffer]*/,
                );
            } else {
                iframeListener.postMessage(
                    {
                        type: "appendPCMData",
                        data: { data: data as Float32Array<ArrayBuffer> },
                    },
                    undefined /*, [data.buffer]*/,
                );
            }
            // Note: if we try to transfer the buffer, we get the following error:
            //      ArrayBuffer already detached.
            // It looks like a bug in the browser to me (the ArrayBuffer was detached from the worklet process
            // and should be attached to the main process and detachable again to the scripting iframe).
        });

        let listenedStreams = new Set<MediaStream>();
        this.peerAudioStreamsUnsubscriber = this.peerAudioStreams().subscribe((streams) => {
            const nextStreams = new Set(streams);
            for (const stream of listenedStreams) {
                if (!nextStreams.has(stream)) {
                    pcmStreamer.removeMediaStream(stream);
                }
            }
            for (const stream of nextStreams) {
                if (!listenedStreams.has(stream)) {
                    pcmStreamer.addMediaStream(stream);
                }
            }
            listenedStreams = nextStreams;
        });
    }

    public stopListeningToAudioStream(): void {
        this.appendPCMDataStreamUnsubscriber?.unsubscribe();
        this.appendPCMDataStreamUnsubscriber = undefined;
        this.peerAudioStreamsUnsubscriber?.();
        this.peerAudioStreamsUnsubscriber = undefined;
        this.pcmStreamer?.close();
        this.pcmStreamer = undefined;
    }

    /**
     * The audio stream currently played for each user of the space.
     * A user's video box switches streamables over time (from P2P to LiveKit, on a reconnection...): we follow the
     * one the box plays rather than the one it played when the listening started.
     */
    private peerAudioStreams(): Readable<MediaStream[]> {
        return derived<SpaceInterface["videoStreamStore"], MediaStream[]>(
            this.space.videoStreamStore,
            ($videoBoxes, set) =>
                derived(
                    Array.from($videoBoxes.values(), (videoBox) =>
                        derived<Readable<Streamable | undefined>, MediaStream | undefined>(
                            videoBox.streamable,
                            ($streamable, setStream) => {
                                if ($streamable?.media.type !== "webrtc" && $streamable?.media.type !== "livekit") {
                                    setStream(undefined);
                                    return;
                                }
                                return $streamable.media.streamStore.subscribe(setStream);
                            },
                        ),
                    ),
                    ($streams) => $streams.filter((stream) => stream !== undefined),
                ).subscribe(set),
            [],
        );
    }

    public close(): void {
        this.stopListeningToAudioStream();
    }
}
