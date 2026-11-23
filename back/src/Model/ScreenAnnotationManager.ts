import type { Subscription } from "rxjs";
import type { ScreenAnnotationElement, SpaceUser } from "@workadventure/messages";
import type { SpaceState } from "@workadventure/shared-utils";
import { SCREEN_ANNOTATION_MAX_ELEMENTS, screenAnnotationElementSchema } from "@workadventure/shared-utils";
import type { SpaceStateHost } from "./SpaceStateHost";

/**
 * Owns the `annotations` of a space's state: per user sharing their screen, whether the others may draw on it, and
 * the finished elements drawn on it. The element being drawn only travels as a public event, never through here.
 *
 * Everything drawn on a share goes away with the share: when the user stops sharing or leaves.
 */
export class ScreenAnnotationManager {
    private readonly subscriptions: Subscription[];

    constructor(private readonly space: SpaceStateHost) {
        this.subscriptions = [
            space.userRemoved$.subscribe((user) => {
                this.forget(user.spaceUserId);
            }),
            space.userUpdated$.subscribe(({ user, previous }) => {
                if (previous.screenSharingState && !user.screenSharingState) {
                    this.forget(user.spaceUserId);
                }
            }),
        ];
    }

    /** The user sharing their screen lets the others draw on it, or stops letting them. */
    public setOthersAllowed(sender: SpaceUser, allowed: boolean): void {
        this.space.updateState((state) => {
            annotationsOf(state, sender.spaceUserId).othersAllowed = allowed;
        });
    }

    /** Adds a finished element, or replaces one of the sender's own (same id). The oldest goes beyond the limit. */
    public upsert(sender: SpaceUser, targetUserId: string, element: ScreenAnnotationElement): void {
        if (!this.space.getUser(targetUserId)?.screenSharingState) {
            throw new Error(`User ${targetUserId} is not sharing their screen`);
        }
        const existing = this.space.getState().annotations[targetUserId];
        if (sender.spaceUserId !== targetUserId && !existing?.othersAllowed) {
            throw new Error("Annotations on this screen share are reserved to the user sharing it");
        }
        const previous = existing?.elements[element.id];
        if (previous && previous.authorUserId !== sender.spaceUserId) {
            throw new Error("Only the author of an annotation can change it");
        }
        // The author is the sender, whatever the client claims.
        const parsed = screenAnnotationElementSchema.parse({
            ...element,
            authorUserId: sender.spaceUserId,
            at: previous?.at ?? Date.now(),
        });
        this.space.updateState((state) => {
            const elements = annotationsOf(state, targetUserId).elements;
            elements[parsed.id] = parsed;
            const ids = Object.keys(elements);
            if (ids.length > SCREEN_ANNOTATION_MAX_ELEMENTS) {
                ids.sort((a, b) => elements[a].at - elements[b].at)
                    .slice(0, ids.length - SCREEN_ANNOTATION_MAX_ELEMENTS)
                    .forEach((id) => delete elements[id]);
            }
        });
    }

    /** Each user erases their own elements; the user sharing the screen erases any of them. */
    public remove(sender: SpaceUser, targetUserId: string, elementId: string): void {
        const element = this.space.getState().annotations[targetUserId]?.elements[elementId];
        if (!element) {
            return;
        }
        if (sender.spaceUserId !== targetUserId && element.authorUserId !== sender.spaceUserId) {
            throw new Error("Only the author or the user sharing the screen can erase an annotation");
        }
        this.space.updateState((state) => {
            delete state.annotations[targetUserId]?.elements[elementId];
        });
    }

    /** The user sharing their screen erases everything drawn on it. */
    public clear(sender: SpaceUser): void {
        this.space.updateState((state) => {
            const annotations = state.annotations[sender.spaceUserId];
            if (annotations) {
                annotations.elements = {};
            }
        });
    }

    public destroy(): void {
        this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    }

    private forget(spaceUserId: string): void {
        this.space.updateState((state) => {
            delete state.annotations[spaceUserId];
        });
    }
}

function annotationsOf(state: SpaceState, spaceUserId: string): SpaceState["annotations"][string] {
    state.annotations[spaceUserId] ??= { othersAllowed: false, elements: {} };
    return state.annotations[spaceUserId];
}
