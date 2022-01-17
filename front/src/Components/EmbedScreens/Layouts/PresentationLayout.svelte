<script lang="ts">
    import { highlightedEmbedScreen } from "../../../Stores/EmbedScreensStore";
    import CamerasContainer from "../CamerasContainer.svelte";
    import MediaBox from "../../Video/MediaBox.svelte";
    import { coWebsiteManager } from "../../../WebRtc/CoWebsiteManager";
    import { afterUpdate, onMount } from "svelte";
    import { isMediaBreakpointDown, isMediaBreakpointUp } from "../../../Utils/BreakpointsUtils";
    import { peerStore } from "../../../Stores/PeerStore";

    function closeCoWebsite() {
        if ($highlightedEmbedScreen?.type === "cowebsite") {
            if ($highlightedEmbedScreen.embed.closable) {
                coWebsiteManager.closeCoWebsite($highlightedEmbedScreen.embed).catch(() => {
                    console.error("Error during co-website highlighted closing");
                });
            } else {
                coWebsiteManager.unloadCoWebsite($highlightedEmbedScreen.embed).catch(() => {
                    console.error("Error during co-website highlighted unloading");
                });
            }
        }
    }

    afterUpdate(() => {
        if ($highlightedEmbedScreen) {
            coWebsiteManager.resizeAllIframes();
        }
    });

    let layoutDom: HTMLDivElement;

    let displayCoWebsiteContainer = isMediaBreakpointDown("lg");
    let displayFullMedias = isMediaBreakpointUp("sm");

    const resizeObserver = new ResizeObserver(() => {
        displayCoWebsiteContainer = isMediaBreakpointDown("lg");
        displayFullMedias = isMediaBreakpointUp("sm");

        if (!displayCoWebsiteContainer && $highlightedEmbedScreen && $highlightedEmbedScreen.type === "cowebsite") {
            highlightedEmbedScreen.removeHighlight();
        }

        if (displayFullMedias) {
            highlightedEmbedScreen.removeHighlight();
        }
    });

    onMount(() => {
        resizeObserver.observe(layoutDom);
    });
</script>

<div id="presentation-layout" bind:this={layoutDom} class:full-medias={displayFullMedias}>
    {#if displayFullMedias}
        <div id="full-medias">
            <CamerasContainer full={true} highlightedEmbedScreen={$highlightedEmbedScreen} />
        </div>
    {:else}
        <div id="embed-left-block" class:full={$peerStore.size === 0}>
            <div id="main-embed-screen">
                {#if $highlightedEmbedScreen}
                    {#if $highlightedEmbedScreen.type === "streamable"}
                        {#key $highlightedEmbedScreen.embed.uniqueId}
                            <MediaBox
                                isHightlighted={true}
                                isClickable={true}
                                streamable={$highlightedEmbedScreen.embed}
                            />
                        {/key}
                    {:else if $highlightedEmbedScreen.type === "cowebsite"}
                        {#key $highlightedEmbedScreen.embed.iframe.id}
                            <div
                                id={"cowebsite-slot-" + $highlightedEmbedScreen.embed.iframe.id}
                                class="highlighted-cowebsite nes-container is-rounded"
                            >
                                <div class="actions">
                                    <button type="button" class="nes-btn is-error close" on:click={closeCoWebsite}
                                        >&times;</button
                                    >
                                </div>
                            </div>
                        {/key}
                    {/if}
                {/if}
            </div>
        </div>

        {#if $peerStore.size > 0}
            <CamerasContainer highlightedEmbedScreen={$highlightedEmbedScreen} />
        {/if}
    {/if}
</div>

<style lang="scss">
    #presentation-layout {
        height: 100%;
        width: 100%;
        display: flex;

        &.full-medias {
            overflow-y: auto;
            overflow-x: hidden;
        }
    }

    #embed-left-block {
        display: flex;
        flex-direction: column;
        flex: 0 0 75%;
        height: 100%;
        width: 75%;

        &.full {
            flex: 0 0 98% !important;
            width: 98% !important;
        }
    }

    #main-embed-screen {
        height: 100%;
        margin-bottom: 3%;

        .highlighted-cowebsite {
            height: 100% !important;
            width: 96%;
            background-color: rgba(#000000, 0.6);
            margin: 0 !important;

            .actions {
                z-index: 200;
                position: relative;
                display: flex;
                flex-direction: row;
                justify-content: end;
                gap: 2%;

                button {
                    pointer-events: all;
                }
            }
        }
    }
</style>
