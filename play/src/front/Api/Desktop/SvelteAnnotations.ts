import { get, type Unsubscriber } from "svelte/store";
import type { WorkAdventureDesktopWindowsApi } from "../../Interfaces/DesktopAppInterfaces";
import { screenAnnotationManager } from "../../Space/ScreenAnnotation/ScreenAnnotationManager";
import { presenterEffectManager } from "../../Space/ScreenAnnotation/PresenterEffectManager";
import {
    localAnnotationTargetStore,
    screenAnnotationElementsStore,
    screenAnnotationLocallyHiddenStore,
} from "../../Stores/ScreenAnnotationStore";
import { presenterToolStore, clearPresenterEffect, setPresenterEffect } from "../../Stores/PresenterEffectStore";
import { activeScreenShareSourceStore, requestedScreenSharingState } from "../../Stores/ScreenSharingStore";

export function startSvelteAnnotations(windows: WorkAdventureDesktopWindowsApi): () => void {
    const setState = windows.setAnnotationState;
    if (!setState) return () => {};
    const report = () => {
        const me = screenAnnotationManager.localUserId;
        const sharing = get(requestedScreenSharingState);
        const drawing = !!me && get(localAnnotationTargetStore) === me;
        const elements = me ? (get(screenAnnotationElementsStore).get(me) ?? []) : [];
        const effect = get(presenterToolStore) !== "none";
        setState({
            visible:
                sharing && (drawing || effect || (!get(screenAnnotationLocallyHiddenStore) && elements.length > 0)),
            interactive: drawing,
            trackCursor: effect,
        });
    };
    const stops: Unsubscriber[] = [
        localAnnotationTargetStore.subscribe(report),
        requestedScreenSharingState.subscribe(report),
        screenAnnotationElementsStore.subscribe(report),
        presenterToolStore.subscribe(report),
        screenAnnotationLocallyHiddenStore.subscribe(report),
    ];
    stops.push(
        requestedScreenSharingState.subscribe((sharing) => {
            if (!sharing) presenterToolStore.set("none");
        }),
    );
    let previousTool = get(presenterToolStore);
    stops.push(
        presenterToolStore.subscribe((tool) => {
            const me = screenAnnotationManager.localUserId;
            if (me && previousTool !== "none" && previousTool !== tool) {
                presenterEffectManager.emitStop(me);
                clearPresenterEffect(me);
            }
            previousTool = tool;
        }),
    );
    stops.push(
        localAnnotationTargetStore.subscribe((target) => {
            if (target !== screenAnnotationManager.localUserId) presenterToolStore.set("none");
        }),
    );
    let sourceId = get(activeScreenShareSourceStore)?.id;
    stops.push(
        activeScreenShareSourceStore.subscribe((source) => {
            if (source && sourceId && source.id !== sourceId) {
                screenAnnotationManager.clearAll();
                presenterToolStore.set("none");
            }
            sourceId = source?.id;
            report();
        }),
    );
    const stopCursor = windows.onAnnotationCursor?.((x, y) => {
        const tool = get(presenterToolStore);
        const me = screenAnnotationManager.localUserId;
        if (tool === "none" || !me || !get(requestedScreenSharingState)) return;
        const scale = tool === "loupe" ? 2.4 : tool === "spotlight" ? 0.18 : 0;
        presenterEffectManager.emitEffect(tool, x, y, scale);
        setPresenterEffect(me, { tool, x, y, scale });
    });
    return () => {
        presenterToolStore.set("none");
        stops.forEach((stop) => stop());
        stopCursor?.();
        setState({ visible: false, interactive: false, trackCursor: false });
    };
}
