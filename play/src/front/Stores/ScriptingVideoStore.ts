import { writable } from "svelte/store";
import { v4 } from "uuid";
import { VideoConfig } from "../Api/Events/Ui/PlayVideoEvent";
import { Streamable } from "./StreamableCollectionStore";

function createStreamableFromVideo(url: string, config: VideoConfig): Streamable {
    return {
        uniqueId: v4(),
        media: {
            type: "scripting",
            url,
            config,
        },
        volumeStore: undefined,
        hasVideo: writable(true),
        hasAudio: writable(false),
        isMuted: writable(false),
        statusStore: writable("connected"),
        getExtendedSpaceUser: () => undefined,
        name: writable(config.name ?? ""),
        showVoiceIndicator: writable(false),
        pictureStore: writable(config.avatar),
        flipX: false,
        muteAudio: false,
        // FIXME: move this to fit after our tests
        displayMode: "cover",
        displayInPictureInPictureMode: false,
        usePresentationMode: false,
        once: (event: string, callback: (...args: unknown[]) => void) => {
            callback();
        },
        priority: 0,
    };
}

function createScriptingVideoStore() {
    const { subscribe, update } = writable<Map<string, Streamable>>(new Map<string, Streamable>());

    return {
        subscribe,

        addVideo: (url: string, config: VideoConfig): Streamable => {
            const streamable = createStreamableFromVideo(url, config);
            update((streamables) => {
                streamables.set(streamable.uniqueId, streamable);
                return streamables;
            });
            return streamable;
        },

        removeVideo: (id: string): void => {
            return update((streamables) => {
                streamables.delete(id);
                return streamables;
            });
        },
    };
}

export const scriptingVideoStore = createScriptingVideoStore();
