import type { Observable } from "rxjs";
import { screenAnnotationManager } from "../ScreenAnnotation/ScreenAnnotationManager";
import { presenterEffectManager } from "../ScreenAnnotation/PresenterEffectManager";
import type { SpaceInterface } from "../SpaceInterface";
import type { Streamable } from "../Streamable";

/**
 * Wire the screen-sharing annotation + presenter-effect synchronization to a proximity space.
 * Called from {@link SpacePeerManager} alongside `bindMuteEventsToSpace`.
 */
export function bindScreenAnnotationEventsToSpace(
    space: SpaceInterface,
    screenSharingPeerRemoved: Observable<Streamable>,
): void {
    // Every space gets a SpacePeerManager, and both managers follow a single space: binding a chat or
    // world-wide space here would steal them from the bubble and broadcast its annotations there.
    // ponytail: one bound video space at a time; per-space state if a user ever shares in two at once.
    if (!space.isVideoSpace()) {
        return;
    }
    screenAnnotationManager.bindToSpace(space, screenSharingPeerRemoved);
    presenterEffectManager.bindToSpace(space, screenSharingPeerRemoved);
}
