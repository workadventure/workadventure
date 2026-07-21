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
        removeAnnotationElement(targetUserId, elementId);
        this.emit(targetUserId, { $case: "removeElementId", removeElementId: elementId });
    }

    public clearAll(targetUserId: string): void {
        clearAnnotations(targetUserId);
        this.emit(targetUserId, { $case: "clearAll", clearAll: true });
    }

    public setAnnotationEnabled(targetUserId: string, enabled: boolean): void {
        setAnnotationEnabled(targetUserId, enabled);
        this.emit(targetUserId, { $case: "annotationEnabled", annotationEnabled: enabled });
    }

    /** Remove the most recent element the LOCAL user drew on the given screen share (undo). */
    public undoLastLocalElement(targetUserId: string): void {
        const me = this.localUserId;
        if (!me) {
            return;
        }
        const elements = get(screenAnnotationElementsStore).get(targetUserId) ?? [];
        for (let i = elements.length - 1; i >= 0; i--) {
            if (elements[i].authorUserId === me) {
                this.removeElement(targetUserId, elements[i].id);
                return;
            }
        }
    }
}

export const screenAnnotationManager = new ScreenAnnotationManager();
