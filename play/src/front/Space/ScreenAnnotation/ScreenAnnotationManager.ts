import { get } from "svelte/store";
import type { Observable } from "rxjs";
import type { ScreenAnnotationElement, ScreenAnnotationEvent } from "@workadventure/messages";
import type { SpaceState } from "@workadventure/shared-utils";
import { screenAnnotationElementSchema } from "@workadventure/shared-utils";
import { activeScreenShareSourceStore, requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import type { Streamable } from "../Streamable";
import {
    localAnnotationTargetStore,
    resetAllAnnotations,
    screenAnnotationElementsStore,
    screenAnnotationEnabledStore,
    screenAnnotationFinishedCountStore,
} from "../../Stores/ScreenAnnotationStore";
import type { SpaceInterface } from "../SpaceInterface";

type DraftOperation = NonNullable<ScreenAnnotationEvent["operation"]>;

/** A reversible local-user action for the undo / redo history: a drawn stroke, or an erased one. */
type UndoOp = { kind: "add" | "remove"; element: ScreenAnnotationElement };

/**
 * Singleton in charge of the screen-sharing annotations of the bound video space.
 *
 * Finished elements and the presenter's "others may annotate" setting live in the space state: the back checks
 * every change, keeps them for whoever joins later, and drops them when the share stops or the presenter leaves.
 * Only the element being drawn travels as a public event (a draft), so the others see it grow.
 *
 * What the components read is published to {@link screenAnnotationElementsStore} and
 * {@link screenAnnotationEnabledStore}. The manager also takes the local user out of drawing mode as soon as the
 * screen they draw on can no longer be drawn on.
 */
class ScreenAnnotationManager {
    private space: SpaceInterface | undefined;
    // Normalized teardown callbacks (rxjs Subscriptions and Svelte store unsubscribers).
    private unsubscribers: (() => void)[] = [];
    private elementCounter = 0;
    private annotations: SpaceState["annotations"] = {};
    // Per target, the element each other member is drawing (keyed by author: one draft each at most).
    private drafts = new Map<string, Map<string, ScreenAnnotationElement>>();
    // Per-target undo / redo history of the LOCAL user's reversible actions (draw a stroke / erase
    // one). undo reverses the last op, redo re-applies it; a fresh action clears the redo side.
    // `replaying` suppresses recording while an undo/redo is applied.
    private undoStacks = new Map<string, UndoOp[]>();
    private redoStacks = new Map<string, UndoOp[]>();
    private replaying = false;
    private pointerExpirations = new Map<string, ReturnType<typeof setTimeout>>();

    private clearPointerTimer(target: string, author: string): void {
        const key = JSON.stringify([target, author]);
        clearTimeout(this.pointerExpirations.get(key));
        this.pointerExpirations.delete(key);
    }

    // `screenSharingPeerRemoved` is passed in (rather than read from `space.spacePeerManager`)
    // because this runs from the SpacePeerManager constructor, before the Space has stored its
    // `spacePeerManager` reference.
    public bindToSpace(space: SpaceInterface, screenSharingPeerRemoved: Observable<Streamable>): void {
        this.unbind();
        this.space = space;

        this.unsubscribers.push(
            space.state.observe("annotations").subscribe((annotations) => {
                this.annotations = annotations;
                // A finished element replaces its draft.
                for (const [target, drafts] of this.drafts) {
                    for (const [author, draft] of drafts) {
                        if (annotations[target]?.elements[draft.id]) {
                            drafts.delete(author);
                        }
                    }
                }
                this.publish();
            }),
        );

        const publicEventSubscription = space.observePublicEvent("screenAnnotation").subscribe((event) => {
            if (event.sender !== space.mySpaceUserId) {
                this.applyRemoteDraft(event.sender, event.screenAnnotation);
            }
        });
        this.unsubscribers.push(() => publicEventSubscription.unsubscribe());

        // A draft whose author or presenter went away never gets finished.
        const screenSharingRemovedSubscription = screenSharingPeerRemoved.subscribe((streamable) => {
            if (streamable.spaceUserId && this.drafts.delete(streamable.spaceUserId)) {
                this.publish();
            }
        });
        this.unsubscribers.push(() => screenSharingRemovedSubscription.unsubscribe());
        const userLeftSubscription = space.observeUserLeft.subscribe((user) => {
            let changed = this.drafts.delete(user.spaceUserId);
            for (const drafts of this.drafts.values()) {
                changed = drafts.delete(user.spaceUserId) || changed;
            }
            if (changed) {
                this.publish();
            }
        });
        this.unsubscribers.push(() => userLeftSubscription.unsubscribe());

        // The back drops what was drawn on our share when it stops; our history of it goes too.
        this.unsubscribers.push(
            requestedScreenSharingState.subscribe((isSharing) => {
                if (!isSharing) {
                    this.clearHistory(space.mySpaceUserId);
                }
                this.exitDrawingModeIfNotDrawable();
            }),
        );

        // Another screen picked during the share: strokes were placed on the previous screen's
        // content, so they are cleared for everyone (the share and its tools stay up).
        let sharedSourceId = get(activeScreenShareSourceStore)?.id;
        this.unsubscribers.push(
            activeScreenShareSourceStore.subscribe((source) => {
                if (source && sharedSourceId && source.id !== sharedSourceId) {
                    this.clearAll();
                }
                sharedSourceId = source?.id;
            }),
        );

        this.unsubscribers.push(localAnnotationTargetStore.subscribe(() => this.exitDrawingModeIfNotDrawable()));

        const leaveSpaceSubscription = space.onLeaveSpace.subscribe(() => {
            this.unbind();
        });
        this.unsubscribers.push(() => leaveSpaceSubscription.unsubscribe());
    }

    public unbind(): void {
        this.unsubscribers.forEach((unsubscribe) => unsubscribe());
        this.unsubscribers = [];
        this.space = undefined;
        this.annotations = {};
        this.drafts.clear();
        for (const timer of this.pointerExpirations.values()) clearTimeout(timer);
        this.pointerExpirations.clear();
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

    /** The presenter's own drawing mode (meeting bar, picture-in-picture): on their share, or off. */
    public toggleDrawingOnMyShare(): void {
        const me = this.localUserId;
        const drawing = get(localAnnotationTargetStore) !== undefined;
        localAnnotationTargetStore.set(!drawing && me && this.canDraw(me) ? me : undefined);
    }

    /** Whether the local user may draw on the screen shared by `targetUserId`. */
    public canDraw(targetUserId: string): boolean {
        if (targetUserId === this.localUserId) {
            return get(requestedScreenSharingState);
        }
        return this.annotations[targetUserId]?.othersAllowed === true;
    }

    /** Space events are relayed as sent: a draft only shows if its sender may draw on that screen. */
    private applyRemoteDraft(sender: string, event: ScreenAnnotationEvent): void {
        const target = event.targetUserId;
        const operation = event.operation;
        const drafts = this.drafts.get(target);
        switch (operation?.$case) {
            case "draft": {
                const allowed = sender === target || this.annotations[target]?.othersAllowed === true;
                const valid = screenAnnotationElementSchema.safeParse({
                    ...operation.draft,
                    // Pointers are transient, so they are deliberately absent from the persisted schema.
                    tool: operation.draft.tool === "pointer" ? "pen" : operation.draft.tool,
                    authorUserId: sender,
                    at: 0,
                }).success;
                if (!allowed || !valid || this.annotations[target]?.elements[operation.draft.id]) {
                    return;
                }
                const next = drafts ?? new Map<string, ScreenAnnotationElement>();
                this.clearPointerTimer(target, sender);
                next.set(sender, { ...operation.draft, authorUserId: sender });
                if (operation.draft.tool === "pointer") {
                    const key = JSON.stringify([target, sender]);
                    this.pointerExpirations.set(
                        key,
                        setTimeout(() => {
                            next.delete(sender);
                            this.pointerExpirations.delete(key);
                            this.publish();
                        }, 1500),
                    );
                }
                this.drafts.set(target, next);
                break;
            }
            case "dropDraftId":
                if (drafts?.get(sender)?.id !== operation.dropDraftId) {
                    return;
                }
                this.clearPointerTimer(target, sender);
                drafts.delete(sender);
                break;
            default:
                return;
        }
        this.publish();
    }

    private publish(): void {
        const elements = new Map<string, ScreenAnnotationElement[]>();
        const finishedCounts = new Map<string, number>();
        const enabled = new Map<string, boolean>();
        for (const [target, annotations] of Object.entries(this.annotations)) {
            elements.set(target, Object.values(annotations.elements));
            finishedCounts.set(target, Object.keys(annotations.elements).length);
            enabled.set(target, annotations.othersAllowed);
        }
        for (const [target, drafts] of this.drafts) {
            for (const author of drafts.keys()) {
                if (author !== target && this.annotations[target]?.othersAllowed !== true) {
                    this.clearPointerTimer(target, author);
                    drafts.delete(author);
                }
            }
            if (drafts.size > 0) {
                elements.set(target, [...(elements.get(target) ?? []), ...drafts.values()]);
            }
        }
        screenAnnotationElementsStore.set(elements);
        screenAnnotationFinishedCountStore.set(finishedCounts);
        screenAnnotationEnabledStore.set(enabled);
        this.exitDrawingModeIfNotDrawable();
    }

    /**
     * Drawing mode ends when the screen drawn on can no longer be drawn on: the share stopped, the presenter left,
     * or stopped letting the others draw. Nobody is put back in drawing mode when it can be drawn on again.
     */
    private exitDrawingModeIfNotDrawable(): void {
        const target = get(localAnnotationTargetStore);
        if (target !== undefined && !this.canDraw(target)) {
            localAnnotationTargetStore.set(undefined);
        }
    }

    private emitDraftOperation(targetUserId: string, operation: DraftOperation): void {
        this.space?.emitPublicMessage({
            $case: "screenAnnotation",
            screenAnnotation: { targetUserId, operation },
        });
    }

    /** Commits a finished element (or a new version of one of ours). */
    public upsertElement(targetUserId: string, element: ScreenAnnotationElement): void {
        if (element.tool === "pointer") return;
        this.recordLocalOp(targetUserId, { kind: "add", element });
        this.space?.state.upsertScreenAnnotation(targetUserId, element).catch((error) => {
            // Its draft would otherwise stay on the others' screens.
            console.warn("Annotation refused", error);
            this.dropDraft(targetUserId, element.id);
        });
    }

    /**
     * Shows the element being drawn to the others. Throttled by the caller: the local rendering of
     * the stroke is the caller's own, and only the finished element is committed.
     */
    public emitDraft(targetUserId: string, element: ScreenAnnotationElement): void {
        this.emitDraftOperation(targetUserId, { $case: "draft", draft: element });
    }

    /** The element being drawn is given up: the others drop it. */
    public dropDraft(targetUserId: string, elementId: string): void {
        this.emitDraftOperation(targetUserId, { $case: "dropDraftId", dropDraftId: elementId });
    }

    public removeElement(targetUserId: string, elementId: string): void {
        // Captured before it leaves the state, so that erasing can be undone (re-added).
        const element = this.annotations[targetUserId]?.elements[elementId];
        if (!element) {
            return;
        }
        this.recordLocalOp(targetUserId, { kind: "remove", element });
        this.space?.state.removeScreenAnnotation(targetUserId, elementId).catch((error) => {
            console.warn("Annotation removal refused", error);
        });
    }

    /** The presenter erases everything drawn on their share. */
    public clearAll(): void {
        const me = this.localUserId;
        if (!me) {
            return;
        }
        this.clearHistory(me);
        this.space?.state.clearScreenAnnotations().catch(() => {}); // reported by the state manager
    }

    /** The presenter lets the others draw on their share, or stops letting them. */
    public setOthersAllowed(allowed: boolean): void {
        this.space?.state.setScreenAnnotationOthersAllowed(allowed).catch(() => {}); // reported by the state manager
    }

    /** Drop the local undo/redo history for a share whose annotations are being cleared or dropped. */
    private clearHistory(targetUserId: string): void {
        this.undoStacks.delete(targetUserId);
        this.redoStacks.delete(targetUserId);
    }

    /**
     * Record a local user action on the undo history and drop the redo history. No-op while
     * replaying an undo/redo, for remote elements, or before the local user id is known.
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
        stack.push(op);
        this.undoStacks.set(targetUserId, stack);
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
        // Move to the redo stack BEFORE changing the state: the change synchronously re-pushes
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
