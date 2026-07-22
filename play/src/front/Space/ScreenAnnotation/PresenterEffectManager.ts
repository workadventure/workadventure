import { get, type Unsubscriber } from "svelte/store";
import type { Observable } from "rxjs";
import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import {
    clearPresenterEffect,
    isActivePresenterTool,
    resetPresenterEffects,
    setPresenterEffect,
    type ActivePresenterTool,
} from "../../Stores/PresenterEffectStore";
import type { Streamable } from "../Streamable";
import type { SpaceInterface } from "../SpaceInterface";

/**
 * Synchronizes ephemeral presenter cursor effects (laser / spotlight / loupe) across a proximity
 * space. Mirrors {@link ScreenAnnotationManager}'s lifecycle but for a NON-persisted, live-only
 * effect: incoming public events update {@link PresenterEffectStore} for the local viewer to
 * render on the shared-screen tile; local moves broadcast a public event throttled by the caller
 * (see PresenterEffectsBridge).
 *
 * Effects are dropped when the targeted screen share ends (remote: `screenSharingPeerRemoved`;
 * local: `requestedScreenSharingState` going false) or when the presenter leaves the space.
 */
class PresenterEffectManager {
    private space: SpaceInterface | undefined;
    private unsubscribers: (() => void)[] = [];

    public get localUserId(): string | undefined {
        return this.space?.mySpaceUserId;
    }

    public bindToSpace(space: SpaceInterface, screenSharingPeerRemoved: Observable<Streamable>): void {
        this.unbind();
        this.space = space;

        const publicEventSubscription = space.observePublicEvent("presenterEffect").subscribe((event) => {
            // Our own effect is applied locally on the presenter side (overlay window); ignore the echo.
            if (event.sender === space.mySpaceUserId) {
                return;
            }
            const effect = event.presenterEffect;
            if (!effect.active || !isActivePresenterTool(effect.tool)) {
                clearPresenterEffect(effect.targetUserId);
                return;
            }
            setPresenterEffect(effect.targetUserId, {
                tool: effect.tool,
                x: effect.x,
                y: effect.y,
                scale: effect.scale,
            });
        });
        this.unsubscribers.push(() => publicEventSubscription.unsubscribe());

        const screenSharingRemovedSubscription = screenSharingPeerRemoved.subscribe((streamable) => {
            if (streamable.spaceUserId) {
                clearPresenterEffect(streamable.spaceUserId);
            }
        });
        this.unsubscribers.push(() => screenSharingRemovedSubscription.unsubscribe());

        // When we stop sharing, authoritatively clear our effect for everyone through the same
        // channel (the remote screenSharingPeerRemoved backstop can race the effect channel).
        let wasSharing = get(requestedScreenSharingState);
        const screenSharingStateUnsubscriber = requestedScreenSharingState.subscribe((isSharing) => {
            if (wasSharing && !isSharing && this.space) {
                this.emitStop(this.space.mySpaceUserId);
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
        resetPresenterEffects();
    }

    /** Broadcast the presenter's live cursor effect. Throttle at the call site. */
    public emitEffect(tool: ActivePresenterTool, x: number, y: number, scale: number): void {
        if (!this.space) {
            return;
        }
        this.space.emitPublicMessage({
            $case: "presenterEffect",
            presenterEffect: { targetUserId: this.space.mySpaceUserId, tool, x, y, scale, active: true },
        });
    }

    /** Broadcast that the presenter's effect is gone (tool off / share stopped). */
    public emitStop(targetUserId: string): void {
        if (!this.space) {
            return;
        }
        this.space.emitPublicMessage({
            $case: "presenterEffect",
            presenterEffect: { targetUserId, tool: "", x: 0, y: 0, scale: 0, active: false },
        });
    }
}

export const presenterEffectManager = new PresenterEffectManager();
