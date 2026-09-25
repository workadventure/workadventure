import { get } from "svelte/store";
import type { Observable } from "rxjs";
import type { ScreenAnnotationElement, ScreenAnnotationEvent } from "@workadventure/messages";
import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import type { Streamable } from "../Streamable";
import {
    clearAnnotations,
    removeAnnotationElement,
    resetAllAnnotations,
    screenAnnotationElementsStore,
    setAnnotationEnabled,
    upsertAnnotationElement,
} from "../../Stores/ScreenAnnotationStore";
import type { SpaceInterface } from "../SpaceInterface";

type AnnotationOperation = NonNullable<ScreenAnnotationEvent["operation"]>;

/** A reversible local-user action for the undo / redo history: a drawn stroke, or an erased one. */
type UndoOp = { kind: "add" | "remove"; element: ScreenAnnotationElement };

/**
 * Singleton in charge of synchronizing screen-sharing annotations across the members of a
 * proximity space.
 *
 * It is bound to the active proximity space (see `bindScreenAnnotationEventsToSpace`, wired
 * in {@link SpacePeerManager}). Incoming public events update the local
 * {@link ScreenAnnotationStore}; local user actions update the store AND broadcast a public
 * event to the rest of the space.
 *
 * Annotations of a screen share are automatically dropped when that screen share stops
 * (remote: `screenSharingPeerRemoved`; local: `requestedScreenSharingState` going false).
 */
class ScreenAnnotationManager {
    private space: SpaceInterface | undefined;
    // Normalized teardown callbacks (rxjs Subscriptions and Svelte store unsubscribers).
    private unsubscribers: (() => void)[] = [];
    private elementCounter = 0;
    // Per-target undo / redo history of the LOCAL user's reversible actions (draw a stroke / erase
    // one). undo reverses the last op, redo re-applies it; a fresh action clears the redo side.
    // `replaying` suppresses recording while an undo/redo mutates the store.
    private undoStacks = new Map<string, UndoOp[]>();
    private redoStacks = new Map<string, UndoOp[]>();
    private replaying = false;

    // `screenSharingPeerRemoved` is passed in (rather than read from `space.spacePeerManager`)
    // because this runs from the SpacePeerManager constructor, before the Space has stored its
    // `spacePeerManager` reference.
    public bindToSpace(space: SpaceInterface, screenSharingPeerRemoved: Observable<Streamable>): void {
        this.unbind();
        this.space = space;

        const publicEventSubscription = space.observePublicEvent("screenAnnotation").subscribe((event) => {
            // Our own events are already applied locally before being sent.
            if (event.sender === space.mySpaceUserId) {
                return;
            }
            this.applyRemote(event.screenAnnotation);
        });
        this.unsubscribers.push(() => publicEventSubscription.unsubscribe());

        // Backstop: drop a remote screen share's annotations if its media track disappears without
        // a clearAll (e.g. an ungraceful presenter disconnect).
        const screenSharingRemovedSubscription = screenSharingPeerRemoved.subscribe((streamable) => {
            if (streamable.spaceUserId) {
                clearAnnotations(streamable.spaceUserId);
                this.clearHistory(streamable.spaceUserId);
            }
        });
        this.unsubscribers.push(() => screenSharingRemovedSubscription.unsubscribe());

        // When we stop sharing our screen, authoritatively clear its annotations for everyone
        // through the same public-event channel (a viewer's screenSharingPeerRemoved below is
        // only a backstop for ungraceful disconnects and can race the annotation channel).
        let wasSharing = get(requestedScreenSharingState);
        const screenSharingStateUnsubscriber = requestedScreenSharingState.subscribe((isSharing) => {
            if (wasSharing && !isSharing && this.space) {
                this.clearAll(space.mySpaceUserId);
            }
            wasSharing = isSharing;
        });
        this.unsubscribers.push(screenSharingStateUnsubscriber);

        const leaveSpaceSubscription = space.onLeaveSpace.subscribe(() => {
            this.unbind();
        });
        this.unsubscribers.push(() => leaveSpaceSubscription.unsubscribe());
    }

    public unbind(): void {
        this.unsubscribers.forEach((unsubscribe) => unsubscribe());
        this.unsubscribers = [];
        this.space = undefined;
        this.undoStacks.clear();
        this.redoStacks.clear();
        resetAllAnnotations();
    }

    public get localUserId(): string | undefined {
        return this.space?.mySpaceUserId;
    }

    /** Generate a unique element id scoped to the local user. */
    public nextElementId(): string {
        this.elementCounter += 1;
        return `${this.space?.mySpaceUserId ?? "local"}-${Date.now()}-${this.elementCounter}`;
    }

    private applyRemote(event: ScreenAnnotationEvent): void {
        const target = event.targetUserId;
        const operation = event.operation;
        switch (operation?.$case) {
            case "upsertElement":
                upsertAnnotationElement(target, operation.upsertElement);
                break;
            case "removeElementId":
                removeAnnotationElement(target, operation.removeElementId);
                break;
            case "clearAll":
                clearAnnotations(target);
                this.clearHistory(target);
                break;
            case "annotationEnabled":
                setAnnotationEnabled(target, operation.annotationEnabled);
                break;
            default:
                break;
        }
    }

    private emit(targetUserId: string, operation: AnnotationOperation): void {
        this.space?.emitPublicMessage({
            $case: "screenAnnotation",
            screenAnnotation: { targetUserId, operation },
        });
    }

    public upsertElement(targetUserId: string, element: ScreenAnnotationElement): void {
        this.recordLocalOp(targetUserId, { kind: "add", element });
        upsertAnnotationElement(targetUserId, element);
        this.emit(targetUserId, { $case: "upsertElement", upsertElement: element });
    }

    /**
     * Broadcast an element WITHOUT updating the local store. Used while a stroke is being
     * drawn: the local store is updated on every pointer move (smooth feedback) but the
     * network emit is throttled to avoid flooding the space.
     */
    public emitUpsertElement(targetUserId: string, element: ScreenAnnotationElement): void {
        this.emit(targetUserId, { $case: "upsertElement", upsertElement: element });
    }

    public removeElement(targetUserId: string, elementId: string): void {
        // Capture the element BEFORE it leaves the store so an eraser removal can be undone (i.e.
        // re-added). Transient drafts that were only broadcast (never stored) aren't found here, so
        // dropping them doesn't pollute the undo history.
        const element = (get(screenAnnotationElementsStore).get(targetUserId) ?? []).find((e) => e.id === elementId);
        if (element) {
            this.recordLocalOp(targetUserId, { kind: "remove", element });
        }
        removeAnnotationElement(targetUserId, elementId);
        this.emit(targetUserId, { $case: "removeElementId", removeElementId: elementId });
    }

    public clearAll(targetUserId: string): void {
        this.clearHistory(targetUserId);
        clearAnnotations(targetUserId);
        this.emit(targetUserId, { $case: "clearAll", clearAll: true });
    }

    /** Drop the local undo/redo history for a share whose annotations are being cleared or dropped. */
    private clearHistory(targetUserId: string): void {
        this.undoStacks.delete(targetUserId);
        this.redoStacks.delete(targetUserId);
    }

    public setAnnotationEnabled(targetUserId: string, enabled: boolean): void {
        setAnnotationEnabled(targetUserId, enabled);
        this.emit(targetUserId, { $case: "annotationEnabled", annotationEnabled: enabled });
    }

    /**
     * Record a local user action on the undo history and drop the redo history. Successive updates
     * of the same in-progress stroke collapse into one entry. No-op while replaying an undo/redo,
     * for remote elements, or before the local user id is known.
     */
    private recordLocalOp(targetUserId: string, op: UndoOp): void {
        if (this.replaying || !this.localUserId) {
            return;
        }
        // Any fresh local action invalidates the redo history — including erasing a remote peer's
        // element, which isn't itself individually undoable (so it's not pushed onto the undo stack).
        this.redoStacks.delete(targetUserId);
        if (op.element.authorUserId !== this.localUserId) {
            return;
        }
        const stack = this.undoStacks.get(targetUserId) ?? [];
        const top = stack[stack.length - 1];
        if (op.kind === "add" && top && top.kind === "add" && top.element.id === op.element.id) {
            top.element = op.element; // same stroke being drawn — keep a single undo entry
        } else {
            stack.push(op);
            this.undoStacks.set(targetUserId, stack);
        }
    }

    /** Apply an op in the undo (reverse=true) or redo (reverse=false) direction, without recording it. */
    private replayOp(targetUserId: string, op: UndoOp, reverse: boolean): void {
        const add = reverse ? op.kind === "remove" : op.kind === "add";
        this.replaying = true;
        try {
            if (add) {
                this.upsertElement(targetUserId, op.element);
            } else {
                this.removeElement(targetUserId, op.element.id);
            }
        } finally {
            this.replaying = false;
        }
    }

    private pushOp(stacks: Map<string, UndoOp[]>, targetUserId: string, op: UndoOp): void {
        const stack = stacks.get(targetUserId) ?? [];
        stack.push(op);
        stacks.set(targetUserId, stack);
    }

    /** Reverse the local user's last action (undo): un-draw a stroke, or restore an erased one. */
    public undoLastLocalElement(targetUserId: string): void {
        const op = this.undoStacks.get(targetUserId)?.pop();
        if (!op) {
            return;
        }
        // Move to the redo stack BEFORE mutating the store: the store change synchronously re-pushes
        // the HUD state, so canRedo must already be true by then.
        this.pushOp(this.redoStacks, targetUserId, op);
        this.replayOp(targetUserId, op, true);
    }

    /** Re-apply the local user's last undone action (redo). */
    public redoLastLocalElement(targetUserId: string): void {
        const op = this.redoStacks.get(targetUserId)?.pop();
        if (!op) {
            return;
        }
        this.pushOp(this.undoStacks, targetUserId, op);
        this.replayOp(targetUserId, op, false);
    }

    /** Whether the local user has an action to undo / redo on the given screen share. */
    public canUndoLocal(targetUserId: string): boolean {
        return (this.undoStacks.get(targetUserId)?.length ?? 0) > 0;
    }
    public canRedoLocal(targetUserId: string): boolean {
        return (this.redoStacks.get(targetUserId)?.length ?? 0) > 0;
    }
}

export const screenAnnotationManager = new ScreenAnnotationManager();
