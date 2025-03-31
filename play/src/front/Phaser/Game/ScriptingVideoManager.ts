import { iframeListener } from "../../Api/IframeListener";
import { PlayVideoEvent } from "../../Api/Events/Ui/PlayVideoEvent";
import { scriptingVideoStore } from "../../Stores/ScriptingVideoStore";

/**
 * Handles calls to WA.ui.playVideo() and video.stop()
 */
export class ScriptingVideoManager {
    constructor() {
        iframeListener.registerAnswerer("playVideo", (event: PlayVideoEvent, source) => {
            const streamable = scriptingVideoStore.addVideo(event.url, event.config ?? {});

            return streamable.uniqueId;
        });

        iframeListener.registerAnswerer("stopVideo", (videoId: string, source) => {
            scriptingVideoStore.removeVideo(videoId);
        });
    }

    public close(): void {
        iframeListener.unregisterAnswerer("playVideo");
        iframeListener.unregisterAnswerer("stopVideo");
    }
}
