import type { Observable } from "rxjs";
import { screenAnnotationManager } from "../ScreenAnnotation/ScreenAnnotationManager";
import type { SpaceInterface } from "../SpaceInterface";
import type { Streamable } from "../Streamable";

/**
 * Wire the screen-sharing annotation synchronization to a proximity space.
 * Called from {@link SpacePeerManager} alongside `bindMuteEventsToSpace`.
 */
export function bindScreenAnnotationEventsToSpace(
    space: SpaceInterface,
    screenSharingPeerRemoved: Observable<Streamable>,
): void {
    screenAnnotationManager.bindToSpace(space, screenSharingPeerRemoved);
}
