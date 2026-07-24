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
    screenAnnotationManager.bindToSpace(space, screenSharingPeerRemoved);
    presenterEffectManager.bindToSpace(space, screenSharingPeerRemoved);
}
