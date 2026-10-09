<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { get } from "svelte/store";
    import type { WhiteboardCoWebsite } from "../../WebRtc/CoWebsite/WhiteboardCoWebsite";
    import type { MountedWhiteboard } from "../../Whiteboard/WhiteboardApp";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { inputFormFocusStore } from "../../Stores/UserInputStore";
    import LL, { locale } from "../../../i18n/i18n-svelte";

    interface Props {
        actualCowebsite: WhiteboardCoWebsite;
        visible: boolean;
    }

    let { actualCowebsite, visible }: Props = $props();

    let container: HTMLDivElement;
    let mounted: MountedWhiteboard | undefined;
    let destroyed = false;
    let loadError = $state(false);

    /**
     * The board's images folder in the map-storage, laid out like WhiteboardLocation there:
     * private/whiteboards/<map path without .wam>/<areaId>/<propertyId>/
     */
    function whiteboardFilesUrl(): URL | undefined {
        const scene = gameManager.getCurrentGameScene();
        const mapStorageUrl = scene.room.mapStorageUrl;
        const wamUrl = scene.wamUrlFile;
        if (!mapStorageUrl || !wamUrl) {
            return undefined;
        }
        const base = new URL(mapStorageUrl.toString().replace(/\/?$/, "/"));
        const wamPath = new URL(wamUrl).pathname;
        if (!wamPath.startsWith(base.pathname) || !wamPath.endsWith(".wam")) {
            return undefined;
        }
        const mapPath = wamPath.substring(base.pathname.length).replace(/\.wam$/, "");
        return new URL(`private/whiteboards/${mapPath}/${actualCowebsite.areaId}/${actualCowebsite.propertyId}/`, base);
    }

    // Excalidraw names English "en" and takes the other WorkAdventure locales as they are.
    function excalidrawLangCode(waLocale: string): string {
        return waLocale.startsWith("en") ? "en" : waLocale;
    }

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
        const connection = gameManager.getCurrentGameScene().connection;
        if (!connection) {
            loadError = true;
            return;
        }
        import("../../Whiteboard/WhiteboardApp")
            .then(({ mountWhiteboard }) => {
                if (destroyed) {
                    return;
                }
                mounted = mountWhiteboard(container, {
                    connection,
                    areaId: actualCowebsite.areaId,
                    propertyId: actualCowebsite.propertyId,
                    langCode: excalidrawLangCode(get(locale)),
                    filesUrl: whiteboardFilesUrl(),
                });
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
