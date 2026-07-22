import { get, type Unsubscriber } from "svelte/store";
import type { ScreenAnnotationElement } from "@workadventure/messages";
import type {
    DesktopOverlayDrawOp,
    DesktopOverlayElement,
    WorkAdventureDesktopApi,
} from "../../Interfaces/DesktopAppInterfaces";
import { activeScreenShareSourceStore, requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import {
    currentAnnotationColorStore,
    currentAnnotationToolStore,
    currentAnnotationWidthStore,
    localAnnotationActiveStore,
    screenAnnotationElementsStore,
    screenAnnotationLocallyHiddenStore,
} from "../../Stores/ScreenAnnotationStore";
import { screenAnnotationManager } from "../../Space/ScreenAnnotation/ScreenAnnotationManager";
import { presenterToolStore } from "../../Stores/PresenterEffectStore";

type WindowWithDesktop = Window & { WAD?: WorkAdventureDesktopApi };

/** Returns the native screen-overlay API when running inside the Electron desktop shell. */
function getScreenOverlayApi(): NonNullable<WorkAdventureDesktopApi["screenOverlay"]> | undefined {
    const wad = (window as WindowWithDesktop).WAD;
    if (!wad || !wad.desktop) {
        return undefined;
    }
    return wad.screenOverlay;
}

export function isScreenOverlayAvailable(): boolean {
    return Boolean(getScreenOverlayApi());
}

function toOverlayElement(element: ScreenAnnotationElement): DesktopOverlayElement {
    return {
        id: element.id,
        authorUserId: element.authorUserId,
        tool: element.tool,
        color: element.color,
        width: element.width,
        points: element.points.map((point) => ({ x: point.x, y: point.y })),
        text: element.text,
    };
}

/**
 * Bridges the transparent Electron annotation overlay to the WorkAdventure annotation system:
 * - opens the overlay when the presenter turns drawing on, keeps it open while sharing;
 * - mirrors the presenter's annotation elements + tool state onto the overlay;
 * - routes strokes drawn ON the overlay back through {@link ScreenAnnotationManager} so they sync to
 *   every viewer via the normal Space events (and appear baked into the shared screen).
 *
 * Overlay-generated element ids are remapped to real (manager-issued) ids; in-progress strokes are
 * broadcast network-only (no local store write) so the overlay's own live draft is never
 * double-rendered, and only the committed stroke is written to the store and pushed back.
 */
class ScreenOverlayBridge {
    private subscriptions: Unsubscriber[] = [];
    private onDrawUnsub: (() => void) | undefined;
    private onExitUnsub: (() => void) | undefined;
    private overlayOpen = false;
    private opening = false;
    private readonly overlayIdToReal = new Map<string, string>();

    public start(): void {
        const api = getScreenOverlayApi();
        if (!api) {
            return;
        }

        // Turning annotation on opens the overlay and enters draw mode; turning it off leaves the
        // overlay up (still displaying/baking existing strokes) but click-through.
        this.subscriptions.push(
            localAnnotationActiveStore.subscribe((active) => {
                if (active) {
                    this.ensureOpen()
                        .then(() => getScreenOverlayApi()?.setDrawMode(true))
                        .catch(() => {});
                } else if (this.overlayOpen) {
                    api.setDrawMode(false);
                }
            }),
        );

        // A presenter tool (laser / spotlight / loupe) also needs the overlay open — it's where
        // the local, presenter-only effect preview is drawn (content-protected, so not captured).
        // Stays click-through (no draw mode): the presenter is driving the shared app, not drawing.
        this.subscriptions.push(
            presenterToolStore.subscribe((tool) => {
                if (tool !== "none") {
                    this.ensureOpen().catch(() => {});
                }
            }),
        );

        // Close the overlay when the presenter stops sharing.
        let wasSharing = get(requestedScreenSharingState);
        this.subscriptions.push(
            requestedScreenSharingState.subscribe((sharing) => {
                if (wasSharing && !sharing) {
                    this.close();
                }
                wasSharing = sharing;
            }),
        );

        // Mirror elements + tool onto the overlay while it is open.
        this.subscriptions.push(screenAnnotationElementsStore.subscribe(() => this.pushElements()));
        // "Hide annotations locally": stop mirroring elements to the overlay (others keep drawing
        // and their strokes keep flowing to viewers; only the LOCAL rendering is suspended).
        this.subscriptions.push(screenAnnotationLocallyHiddenStore.subscribe(() => this.pushElements()));
        this.subscriptions.push(currentAnnotationToolStore.subscribe(() => this.pushTool()));
        this.subscriptions.push(currentAnnotationColorStore.subscribe(() => this.pushTool()));
        this.subscriptions.push(currentAnnotationWidthStore.subscribe(() => this.pushTool()));
    }

    public stop(): void {
        this.subscriptions.forEach((unsubscribe) => unsubscribe());
        this.subscriptions = [];
        this.close();
    }

    private async ensureOpen(): Promise<void> {
        const api = getScreenOverlayApi();
        if (!api || this.overlayOpen || this.opening) {
            return;
        }
        this.opening = true;
        try {
            // Pass the shared source so the main process places the overlay on the RIGHT screen
            // (resolves the display from the source's display_id / `screen:<id>` id).
            const source = get(activeScreenShareSourceStore);
            this.overlayOpen = await api.open({ displayId: source?.display_id, sourceId: source?.id });
        } finally {
            this.opening = false;
        }
        if (!this.overlayOpen) {
            return;
        }
        this.onDrawUnsub = api.onDraw((op) => this.handleDraw(op));
        this.onExitUnsub = api.onExit(() => localAnnotationActiveStore.set(false));
        this.pushElements();
        this.pushTool();
    }

    private close(): void {
        const api = getScreenOverlayApi();
        this.onDrawUnsub?.();
        this.onDrawUnsub = undefined;
        this.onExitUnsub?.();
        this.onExitUnsub = undefined;
        this.overlayIdToReal.clear();
        if (this.overlayOpen && api) {
            api.close().catch(() => {});
        }
        this.overlayOpen = false;
    }

    private pushElements(): void {
        const api = getScreenOverlayApi();
        const target = screenAnnotationManager.localUserId;
        if (!api || !this.overlayOpen || !target) {
            return;
        }
        if (get(screenAnnotationLocallyHiddenStore)) {
            api.pushElements([]);
            return;
        }
        const elements = get(screenAnnotationElementsStore).get(target) ?? [];
        api.pushElements(elements.map(toOverlayElement));
    }

    private pushTool(): void {
        const api = getScreenOverlayApi();
        if (!api || !this.overlayOpen) {
            return;
        }
        api.setTool({
            tool: get(currentAnnotationToolStore),
            color: get(currentAnnotationColorStore),
            width: get(currentAnnotationWidthStore),
        });
    }

    private handleDraw(op: DesktopOverlayDrawOp): void {
        const target = screenAnnotationManager.localUserId;
        if (!target) {
            return;
        }
        if (op.type === "remove") {
            screenAnnotationManager.removeElement(target, op.id);
            return;
        }
        if (op.type === "undo") {
            screenAnnotationManager.undoLastLocalElement(target);
            return;
        }
        if (op.type === "clear") {
            screenAnnotationManager.clearAll(target);
            return;
        }
        const overlayId = op.element.id;
        let realId = this.overlayIdToReal.get(overlayId);
        if (!realId) {
            realId = screenAnnotationManager.nextElementId();
            this.overlayIdToReal.set(overlayId, realId);
        }
        const element: ScreenAnnotationElement = {
            id: realId,
            authorUserId: target,
            tool: op.element.tool,
            color: op.element.color,
            width: op.element.width,
            points: op.element.points.map((point) => ({ x: point.x, y: point.y })),
            text: op.element.text,
        };
        if (op.commit) {
            screenAnnotationManager.upsertElement(target, element);
            this.overlayIdToReal.delete(overlayId);
        } else {
            screenAnnotationManager.emitUpsertElement(target, element);
        }
    }
}

export const screenOverlayBridge = new ScreenOverlayBridge();
