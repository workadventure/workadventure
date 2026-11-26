<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { WhiteboardCoWebsite } from "../../WebRtc/CoWebsite/WhiteboardCoWebsite";
    import type { MountedWhiteboard } from "../../Whiteboard/WhiteboardApp";
    import { inputFormFocusStore } from "../../Stores/UserInputStore";
    import LL from "../../../i18n/i18n-svelte";

    interface Props {
        actualCowebsite: WhiteboardCoWebsite;
        visible: boolean;
    }

    let { actualCowebsite, visible }: Props = $props();

    let container: HTMLDivElement;
    let mounted: MountedWhiteboard | undefined;
    let destroyed = false;
    let loadError = $state(false);

    // Keys typed on the board must not walk the Woka.
    function onFocusIn(): void {
        inputFormFocusStore.set(true);
    }

    function onFocusOut(event: FocusEvent): void {
        if (!(event.relatedTarget instanceof Node && container.contains(event.relatedTarget))) {
            inputFormFocusStore.set(false);
        }
    }

    // Clicking the map gives the keyboard back to the game.
    function releaseFocusOutside(event: PointerEvent): void {
        if (
            event.target instanceof Node &&
            !container.contains(event.target) &&
            document.activeElement instanceof HTMLElement &&
            container.contains(document.activeElement)
        ) {
            document.activeElement.blur();
        }
    }

    onMount(() => {
        document.addEventListener("pointerdown", releaseFocusOutside, true);
        import("../../Whiteboard/WhiteboardApp")
            .then(({ mountWhiteboard }) => {
                if (!destroyed) {
                    mounted = mountWhiteboard(container, actualCowebsite.options);
                }
            })
            .catch((error) => {
                console.error("Could not load the whiteboard", error);
                loadError = true;
            });
    });

    onDestroy(() => {
        destroyed = true;
        document.removeEventListener("pointerdown", releaseFocusOutside, true);
        mounted?.destroy();
        if (container?.contains(document.activeElement)) {
            inputFormFocusStore.set(false);
        }
    });
</script>

<div class="relative w-full h-full" class:hidden={!visible} data-testid="whiteboard-cowebsite">
    {#if loadError}
        <p class="absolute inset-0 m-auto h-fit text-center text-white">
            {$LL.mapEditor.properties.whiteboard.loadError()}
        </p>
    {/if}
    <div
        bind:this={container}
        class="absolute inset-0 rounded-lg overflow-hidden"
        onfocusin={onFocusIn}
        onfocusout={onFocusOut}
    ></div>
</div>
