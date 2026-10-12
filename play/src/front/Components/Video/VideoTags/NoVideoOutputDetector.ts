import type { Readable, Unsubscriber } from "svelte/store";
import { activePictureInPictureStore } from "../../../Stores/PeerStore";

/**
 * Detects if no video frames are being rendered on a video element.
 * If no video frames are rendered within 3 seconds, it calls the onNoVideo callback.
 * If a video frame is rendered, it calls the onVideo callback.
 */
export class NoVideoOutputDetector {
    private noVideoTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
    private callbackId: number | undefined = undefined;
    private activePictureInPictureStoreUnsubscriber: Unsubscriber;

    constructor(
        private videoElement: HTMLVideoElement,
        private onNoVideo: () => void,
        private onVideo: () => void,
        activePiPStore: Readable<boolean> = activePictureInPictureStore,
    ) {
        // PictureInPicture tends to make the no_video_stream_received message appear when it should not.
        // Not sure why, probably a bug due to the fact the video element is moved in the DOM.
        // We reset the displayNoVideoWarning flag when the PictureInPicture mode is changed.
        this.activePictureInPictureStoreUnsubscriber = activePiPStore.subscribe(() => {
            if (this.noVideoTimeout) {
                clearTimeout(this.noVideoTimeout);
                this.noVideoTimeout = undefined;
                onVideo();
            }
        });
    }

    public expectVideoWithin5Seconds() {
        if ("requestVideoFrameCallback" in this.videoElement) {
            if (this.noVideoTimeout) {
                clearTimeout(this.noVideoTimeout);
            }
            // Let's wait 3 seconds before displaying a warning.
            this.noVideoTimeout = setTimeout(() => {
                this.noVideoTimeout = undefined;
                // A hidden page renders no frame at all (minimized window, the desktop app's window behind
                // its companion, a background tab): there is nothing to judge until it shows again.
                if (document.visibilityState === "hidden") {
                    document.addEventListener("visibilitychange", this.onVisibilityChange);
                    return;
                }
                this.onNoVideo();
            }, 5000);

            if (this.callbackId !== undefined) {
                // We need to cancel the previous callback if it exists.
                this.videoElement.cancelVideoFrameCallback(this.callbackId);
            }
            this.callbackId = this.videoElement.requestVideoFrameCallback(() => {
                // A video frame was displayed. No need to display a warning.
                this.onVideo();
                clearTimeout(this.noVideoTimeout);
                this.noVideoTimeout = undefined;
                if (this.callbackId !== undefined && this.videoElement) {
                    // We need to cancel the previous callback if it exists.
                    this.videoElement.cancelVideoFrameCallback(this.callbackId);
                }
            });
        }
    }

    private readonly onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            document.removeEventListener("visibilitychange", this.onVisibilityChange);
            this.expectVideoWithin5Seconds();
        }
    };

    public destroy() {
        document.removeEventListener("visibilitychange", this.onVisibilityChange);
        if (this.noVideoTimeout) {
            clearTimeout(this.noVideoTimeout);
            this.noVideoTimeout = undefined;
        }
        if (this.callbackId !== undefined && this.videoElement) {
            // We need to cancel the previous callback if it exists.
            this.videoElement.cancelVideoFrameCallback(this.callbackId);
            this.callbackId = undefined;
        }
        this.activePictureInPictureStoreUnsubscriber();
    }
}
