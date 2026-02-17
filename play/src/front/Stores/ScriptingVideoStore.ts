import { writable } from "svelte/store";
import { v4 } from "uuid";
import type { VideoConfig } from "../Api/Events/Ui/PlayVideoEvent";
import { VideoBox } from "../Space/VideoBox";

import type { Streamable } from "../Space/Streamable";

function createStreamableFromVideo(url: string, config: VideoConfig): Streamable {
    return {
        uniqueId: v4(),
        media: {
            type: "scripting",
            url,
            config,
            isBlocked: writable(false),
        },
        volumeStore: undefined,
        spaceUserId: undefined,
        hasVideo: writable(true),
        hasAudio: writable(false),
        isMuted: writable(false),
        statusStore: writable("connected"),
        name: writable(config.name ?? ""),
        showVoiceIndicator: writable(false),
        flipX: false,
        muteAudio: writable(false),
        // FIXME: move this to fit after our tests
        displayMode: "cover",
        displayInPictureInPictureMode: false,
        usePresentationMode: false,
        volume: writable(1),
        closeStreamable: () => {},
        videoType: "scripting",
        webrtcStats: undefined,
    };
}

function createScriptingVideoStore() {
    const { subscribe, update } = writable<Map<string, VideoBox>>(new Map<string, VideoBox>());

    return {
        subscribe,

        addVideo: (url: string, config: VideoConfig): Streamable => {
            const streamable = createStreamableFromVideo(url, config);
            const videoBox = VideoBox.fromLocalStreamable(streamable, 0);
            update((videoBoxes) => {
                videoBoxes.set(videoBox.uniqueId, videoBox);
                return videoBoxes;
            });
            return streamable;
        },

        removeVideo: (id: string): void => {
            return update((videoBoxes) => {
                videoBoxes.get(id)?.destroy();
                videoBoxes.delete(id);
                return videoBoxes;
            });
        },
    };
}

export const scriptingVideoStore = createScriptingVideoStore();
