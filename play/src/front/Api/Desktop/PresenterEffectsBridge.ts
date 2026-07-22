import { get, type Unsubscriber } from "svelte/store";
import type { WorkAdventureDesktopApi } from "../../Interfaces/DesktopAppInterfaces";
import { activeScreenShareSourceStore, requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import { presenterToolStore, type ActivePresenterTool } from "../../Stores/PresenterEffectStore";
import { presenterEffectManager } from "../../Space/ScreenAnnotation/PresenterEffectManager";

type WindowWithDesktop = Window & { WAD?: WorkAdventureDesktopApi };

function getPresenterApi(): NonNullable<WorkAdventureDesktopApi["presenter"]> | undefined {
    const wad = (window as WindowWithDesktop).WAD;
    if (!wad || !wad.desktop) {
        return undefined;
    }
    return wad.presenter;
}

/** Per-tool parameter sent alongside the cursor: loupe magnification, spotlight radius fraction. */
function defaultScale(tool: ActivePresenterTool): number {
    if (tool === "loupe") {
        return 2.4;
    }
    if (tool === "spotlight") {
        return 0.18;
    }
    return 0;
}

/**
 * Bridges the local presenter's cursor tools to the space. When a tool is selected
 * (presenterToolStore), it asks the main process to track the global cursor over the shared
 * display; each reported position is broadcast to viewers via {@link PresenterEffectManager}.
 * Stationary positions are de-duplicated so an idle cursor doesn't flood the space.
 *
 * Started/stopped with the other desktop bridges in PictureInPicture.svelte.
 */
class PresenterEffectsBridge {
    private subscriptions: Unsubscriber[] = [];
    private onCursorUnsub: (() => void) | undefined;
    private lastX = -1;
    private lastY = -1;

    public start(): void {
        const api = getPresenterApi();
        if (!api) {
            return;
        }

        this.onCursorUnsub = api.onCursor((x, y) => {
            const tool = get(presenterToolStore);
            if (tool === "none") {
                return;
            }
            // Round to 1e-3 and skip unchanged positions — a still cursor needs one event, not 30/s.
            const rx = Math.round(x * 1000) / 1000;
            const ry = Math.round(y * 1000) / 1000;
            if (rx === this.lastX && ry === this.lastY) {
                return;
            }
            this.lastX = rx;
            this.lastY = ry;
            presenterEffectManager.emitEffect(tool, rx, ry, defaultScale(tool));
        });

        this.subscriptions.push(
            presenterToolStore.subscribe((tool) => {
                this.lastX = -1;
                this.lastY = -1;
                if (tool === "none") {
                    api.setTool("none");
                    const target = presenterEffectManager.localUserId;
                    if (target) {
                        presenterEffectManager.emitStop(target);
                    }
                } else {
                    const source = get(activeScreenShareSourceStore);
                    api.setTool(tool, source?.display_id);
                }
            }),
        );

        // A tool has no meaning once the share ends — turn it off (the store subscription then
        // stops cursor tracking and clears the effect for viewers).
        let wasSharing = get(requestedScreenSharingState);
        this.subscriptions.push(
            requestedScreenSharingState.subscribe((sharing) => {
                if (wasSharing && !sharing) {
                    presenterToolStore.set("none");
                }
                wasSharing = sharing;
            }),
        );
    }

    public stop(): void {
        this.subscriptions.forEach((unsubscribe) => unsubscribe());
        this.subscriptions = [];
        this.onCursorUnsub?.();
        this.onCursorUnsub = undefined;
        getPresenterApi()?.setTool("none");
        presenterToolStore.set("none");
    }
}

export const presenterEffectsBridge = new PresenterEffectsBridge();
