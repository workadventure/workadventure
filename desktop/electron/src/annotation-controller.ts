import { screen, type WebContents } from "electron";
import { openChildWindow } from "./child-windows";
import { closeHudWindow, getHudWindow } from "./hud-windows";
import { getControllingWorldContents } from "./tab-manager";
import { getPresenceSnapshot, onPresenceChange } from "./presence";
import { canHideWindowsFromCapture } from "./platform-capture-policy";

type AnnotationState = { visible: boolean; interactive: boolean; trackCursor: boolean };
let owner: WebContents | undefined;
let displayId: number | undefined;
let state: AnnotationState = { visible: false, interactive: false, trackCursor: false };
let generation = 0;
let opening = false;
let timer: ReturnType<typeof setInterval> | undefined;

export function resetAnnotations(): void {
    generation++;
    state = { visible: false, interactive: false, trackCursor: false };
    owner = undefined;
    if (timer) clearInterval(timer);
    timer = undefined;
    closeHudWindow("annotation");
}

export function setAnnotationSource(nextDisplayId: number | undefined): void {
    if (displayId === nextDisplayId) return;
    const previousOwner = owner;
    const previousState = state;
    resetAnnotations();
    displayId = nextDisplayId;
    if (previousOwner && nextDisplayId !== undefined) {
        void setAnnotationState(previousOwner, previousState).catch(() => resetAnnotations());
    }
}

function allowed(): boolean {
    return (
        canHideWindowsFromCapture(process.platform) &&
        displayId !== undefined &&
        getPresenceSnapshot().screenSharing &&
        owner === getControllingWorldContents() &&
        !!owner &&
        !owner.isDestroyed()
    );
}

function applyState(): void {
    const window = getHudWindow("annotation");
    if (!window) return;
    window.setIgnoreMouseEvents(!state.interactive, { forward: true });
    window.setFocusable(state.interactive);
    if (state.interactive && !window.isFocused()) window.focus();
    getHudWindow("meeting-bar")?.moveTop();
}

export async function setAnnotationState(contents: WebContents, raw: unknown): Promise<void> {
    if (contents !== getControllingWorldContents() || !raw || typeof raw !== "object") return;
    const flag = (key: string) => Reflect.get(raw, key) === true;
    state = { visible: flag("visible"), interactive: flag("interactive"), trackCursor: flag("trackCursor") };
    owner = contents;
    if (!state.visible || !getPresenceSnapshot().screenSharing || owner !== getControllingWorldContents()) {
        resetAnnotations();
        return;
    }
    // The source may still be resolving asynchronously. Keep the request until it arrives.
    if (displayId === undefined) return;
    if (!allowed()) {
        resetAnnotations();
        return;
    }
    if (!getHudWindow("annotation") && !opening) {
        const requested = generation;
        opening = true;
        try {
            await openChildWindow("annotation", displayId);
        } finally {
            opening = false;
        }
        if (requested !== generation || !allowed()) {
            closeHudWindow("annotation");
            // A source change can arrive while the old child is still opening. Reconcile the
            // latest request once, after that child has finished, rather than dropping it.
            if (state.visible && owner && allowed()) await setAnnotationState(owner, state);
            return;
        }
    }
    applyState();
    if (!state.trackCursor && timer) {
        clearInterval(timer);
        timer = undefined;
    }
    if (state.trackCursor && !timer) {
        timer = setInterval(() => {
            if (!allowed()) {
                resetAnnotations();
                return;
            }
            const display = screen.getAllDisplays().find((item) => item.id === displayId);
            if (!display || !owner) return;
            const point = screen.getCursorScreenPoint();
            const { x, y, width, height } = display.bounds;
            if (width <= 0 || height <= 0) return;
            owner.send(
                "app:windows:annotation-cursor",
                Math.max(0, Math.min(1, (point.x - x) / width)),
                Math.max(0, Math.min(1, (point.y - y) / height)),
            );
        }, 50);
        timer.unref();
    }
}

onPresenceChange(() => {
    if (
        owner &&
        (!getPresenceSnapshot().screenSharing || owner !== getControllingWorldContents() || owner.isDestroyed())
    ) {
        resetAnnotations();
    }
});
