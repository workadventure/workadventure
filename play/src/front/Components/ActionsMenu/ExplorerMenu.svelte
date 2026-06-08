<script lang="ts">
    import { onDestroy } from "svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { mapEditorModeStore, mapExplorationModeStore } from "../../Stores/MapEditorStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import { BUTTON_ZOOM_FACTOR_PER_SECOND, BUTTON_ZOOM_STEP_FACTOR } from "../../Phaser/Game/CameraZoomUtils";
    import LL from "../../../i18n/i18n-svelte";
    import { IconFocusCentered, IconMapSearch, IconMinus, IconPlus } from "@wa-icons";

    interface Props {
        mapEditorRightOffset?: number;
    }

    let { mapEditorRightOffset = 0 }: Props = $props();

    // Keep click and long-press as the same gesture: a press always starts with one smooth zoom step,
    // then turns into continuous zoom if the user keeps the pointer down.
    const ZOOM_HOLD_DELAY = 180;

    // Track one active pointer so a second finger/button cannot start a competing zoom loop.
    let zoomHoldTimeout: ReturnType<typeof setTimeout> | undefined;
    let activeZoomPointerId: number | undefined;

    function getCameraManager() {
        return gameManager.getCurrentGameScene().getCameraManager();
    }

    function clearZoomHoldTimeout() {
        if (zoomHoldTimeout === undefined) {
            return;
        }

        clearTimeout(zoomHoldTimeout);
        zoomHoldTimeout = undefined;
    }

    function isPointerEvent(event?: Event): event is PointerEvent {
        return event !== undefined && "pointerId" in event;
    }

    /**
     * Starts the zoom gesture for mouse, touch, and stylus.
     * Analytics is emitted once here so a long press does not create one event per animation frame.
     */
    function startZoom(direction: "in" | "out", event: PointerEvent) {
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }

        event.preventDefault();

        if (activeZoomPointerId !== undefined) {
            return;
        }

        activeZoomPointerId = event.pointerId;
        const cameraManager = gameManager.getCurrentGameScene().getCameraManager();
        const zoomFactor = direction === "in" ? BUTTON_ZOOM_STEP_FACTOR : 1 / BUTTON_ZOOM_STEP_FACTOR;
        const continuousZoomFactor =
            direction === "in" ? BUTTON_ZOOM_FACTOR_PER_SECOND : 1 / BUTTON_ZOOM_FACTOR_PER_SECOND;

        if (direction === "in") {
            analyticsClient.clickToZoomIn();
        } else {
            analyticsClient.clickToZoomOut();
        }

        cameraManager?.smoothZoomByFactor(zoomFactor);

        // If the pointer is still down after the delay, the same gesture becomes continuous zoom.
        clearZoomHoldTimeout();
        zoomHoldTimeout = setTimeout(() => {
            if (activeZoomPointerId === event.pointerId) {
                getCameraManager()?.startContinuousZoom(continuousZoomFactor);
            }
        }, ZOOM_HOLD_DELAY);
    }

    /**
     * Stops the gesture from all exit paths: release, cancel, leaving the button, window blur, or component destroy.
     */
    function stopZoom(event?: Event) {
        if (isPointerEvent(event) && activeZoomPointerId !== undefined && activeZoomPointerId !== event.pointerId) {
            return;
        }

        const hadActiveZoom = activeZoomPointerId !== undefined || zoomHoldTimeout !== undefined;
        clearZoomHoldTimeout();
        activeZoomPointerId = undefined;
        if (hadActiveZoom) {
            getCameraManager()?.stopContinuousZoom();
        }
    }

    function openMapExplorer() {
        analyticsClient.clickTopOpenMapExplorer();

        mapEditorModeStore.switchMode(true);
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(EditorToolName.ExploreTheRoom);
    }

    function centerToUser() {
        analyticsClient.clickCenterToUser();

        mapEditorModeStore.switchMode(false);
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(EditorToolName.CloseMapEditor);
    }

    onDestroy(() => {
        stopZoom();
    });
</script>

<svelte:window onblur={stopZoom} />

<div
    class="fixed bottom-2 mobile:bottom-24 bg-contrast/80 rounded pointer-events-auto p-1 backdrop-blur hover:bg-contrast/100"
    style:right={`calc(${mapEditorRightOffset}px + 0.5rem)`}
    data-testid="actions-explorer"
>
    <div class="flex flex-col justify-center gap-2">
        <div class="flex flex-col justify-center gap-1">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="group flex justify-center items-center p-1 rounded hover:bg-white/30 cursor-pointer"
                onpointerdown={(event) => startZoom("in", event)}
                onpointerup={stopZoom}
                onpointercancel={stopZoom}
                onpointerleave={stopZoom}
            >
                <IconPlus />
                <div
                    class="-right-60 opacity-0 group-hover:opacity-90 group-hover:right-11 absolute bg-contrast backdrop-blur text-sm px-2 py-1 rounded whitespace-nowrap transition-all text-white pointer-events-none select-none"
                >
                    {$LL.mapEditor.explorer.zoomIn()}
                </div>
            </div>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="group flex justify-center items-center p-1 rounded hover:bg-white/30 cursor-pointer"
                onpointerdown={(event) => startZoom("out", event)}
                onpointerup={stopZoom}
                onpointercancel={stopZoom}
                onpointerleave={stopZoom}
            >
                <IconMinus />
                <div
                    class="-right-60 opacity-0 group-hover:opacity-90 group-hover:right-11 absolute bg-contrast backdrop-blur text-sm px-2 py-1 rounded whitespace-nowrap transition-all text-white pointer-events-none select-none"
                >
                    {$LL.mapEditor.explorer.zoomOut()}
                </div>
            </div>
        </div>
        {#if $mapExplorationModeStore === false}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="group flex justify-center items-center p-1 rounded hover:bg-white/30 cursor-pointer"
                onclick={openMapExplorer}
            >
                <IconMapSearch />
                <div
                    class="-right-60 opacity-0 group-hover:opacity-90 group-hover:right-11 absolute bg-contrast backdrop-blur text-sm px-2 py-1 rounded whitespace-nowrap transition-all text-white pointer-events-none select-none"
                >
                    {$LL.mapEditor.explorer.title()}
                </div>
            </div>
        {:else}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="group flex justify-center items-center p-1 rounded hover:bg-white/30 cursor-pointer"
                onclick={centerToUser}
            >
                <IconFocusCentered />
                <div
                    class="-right-60 opacity-0 group-hover:opacity-90 group-hover:right-11 absolute bg-contrast backdrop-blur text-sm px-2 py-1 rounded whitespace-nowrap transition-all text-white pointer-events-none select-none"
                >
                    {$LL.mapEditor.explorer.showMyLocation()}
                </div>
            </div>
        {/if}
    </div>
</div>
