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
    localAnnotationTargetStore,
    screenAnnotationElementsStore,
    screenAnnotationLocallyHiddenStore,
} from "../../Stores/ScreenAnnotationStore";
import { screenAnnotationManager } from "../../Space/ScreenAnnotation/ScreenAnnotationManager";

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

/** Whether the local user draws on their own screen share: the only case the native overlay is for. */
function drawingOnMyShare(): boolean {
    const me = screenAnnotationManager.localUserId;
    return me !== undefined && get(localAnnotationTargetStore) === me && get(requestedScreenSharingState);
}

/**
 * Bridges the transparent Electron annotation overlay to the WorkAdventure annotation system. The
 * desktop app decides when the overlay shows (while the user draws on their own share or uses a
 * presenter tool); this bridge:
 * - reports whether the user draws on their share (setDrawMode);
 * - mirrors the presenter's annotation elements + tool state, replayed by the app when it opens;
 * - routes strokes drawn ON the overlay back through {@link ScreenAnnotationManager} so they sync to
 *   every viewer via the space;
 * - clears the annotations when another screen is shared (they were drawn over the previous one).
 *
 * Overlay-generated element ids are remapped to real (manager-issued) ids; in-progress strokes are
 * broadcast network-only (no local store write) so the overlay's own live draft is never
 * double-rendered, and only the committed stroke is written to the store and pushed back.
 */
class ScreenOverlayBridge {
    private subscriptions: Unsubscriber[] = [];
    private readonly overlayIdToReal = new Map<string, string>();

    public start(): void {
        const api = getScreenOverlayApi();
        if (!api) {
            return;
        }

        this.subscriptions.push(
            api.onDraw((op) => this.handleDraw(op)),
            // The overlay closed (share stopped, another screen shared) or the user left it (Escape).
            api.onExit(() => localAnnotationTargetStore.set(undefined)),
        );

        const reportDrawing = () => {
            const drawing = drawingOnMyShare();
            if (!drawing) {
                this.overlayIdToReal.clear();
            }
            api.setDrawMode(drawing);
        };
        this.subscriptions.push(localAnnotationTargetStore.subscribe(reportDrawing));
        this.subscriptions.push(requestedScreenSharingState.subscribe(reportDrawing));

        let sharedSourceId = get(activeScreenShareSourceStore)?.id;
        this.subscriptions.push(
            activeScreenShareSourceStore.subscribe((source) => {
                if (source && sharedSourceId !== undefined && source.id !== sharedSourceId) {
                    screenAnnotationManager.clearAll();
                }
                sharedSourceId = source?.id;
            }),
        );

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
        getScreenOverlayApi()?.setDrawMode(false);
    }

    private pushElements(): void {
        const api = getScreenOverlayApi();
        const target = screenAnnotationManager.localUserId;
        if (!api || !target) {
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
        if (!api) {
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
            screenAnnotationManager.clearAll();
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
            screenAnnotationManager.emitDraft(target, element);
        }
    }
}

export const screenOverlayBridge = new ScreenOverlayBridge();
