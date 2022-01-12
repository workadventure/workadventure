<script lang="typescript">
    import { onMount } from "svelte";

    import { ICON_URL } from "../../Enum/EnvironmentVariable";
    import { mainCoWebsite } from "../../Stores/CoWebsiteStore";
    import { highlightedEmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { CoWebsite } from "../../WebRtc/CoWebsiteManager";
    import { coWebsiteManager } from "../../WebRtc/CoWebsiteManager";

    export let index: number;
    export let coWebsite: CoWebsite;
    export let vertical: boolean;

    let icon: HTMLImageElement;
    let state = coWebsite.state;

    const coWebsiteUrl = coWebsite.iframe.src;
    const urlObject = new URL(coWebsiteUrl);

    onMount(() => {
        icon.src = `${ICON_URL}/icon?url=${urlObject.hostname}&size=64..96..256&fallback_icon_color=14304c`;
        icon.alt = urlObject.hostname;
    });

    async function toggleHighlightEmbedScreen() {
        if (vertical) {
            coWebsiteManager.goToMain(coWebsite);
        } else if ($mainCoWebsite) {
            highlightedEmbedScreen.toggleHighlight({
                type: "cowebsite",
                embed: coWebsite,
            });
        }

        if ($state === "asleep") {
            await coWebsiteManager.loadCoWebsite(coWebsite);
        }

        coWebsiteManager.resizeAllIframes();
    }

    function noDrag() {
        return false;
    }
</script>

<div
    id={"cowebsite-thumbnail-" + index}
    class="cowebsite-thumbnail nes-pointer"
    class:asleep={$state === "asleep"}
    class:loading={$state === "loading"}
    class:ready={$state === "ready"}
    class:vertical
    on:click={toggleHighlightEmbedScreen}
>
    <img class="cowebsite-icon noselect nes-pointer" bind:this={icon} on:dragstart|preventDefault={noDrag} alt="" />
</div>

<style lang="scss">
    .cowebsite-thumbnail::before {
        content: "";
        position: absolute;
        width: 58px;
        height: 58px;
        left: -8px;
        top: -8px;

        margin: 4px;

        border-style: solid;
        border-width: 4px;
        border-image-slice: 3;
        border-image-width: 3;
        border-image-repeat: stretch;
        border-image-source: url('data:image/svg+xml;utf8,<?xml version="1.0" encoding="UTF-8" ?><svg version="1.1" width="8" height="8" xmlns="http://www.w3.org/2000/svg"><path d="M3 1 h1 v1 h-1 z M4 1 h1 v1 h-1 z M2 2 h1 v1 h-1 z M5 2 h1 v1 h-1 z M1 3 h1 v1 h-1 z M6 3 h1 v1 h-1 z M1 4 h1 v1 h-1 z M6 4 h1 v1 h-1 z M2 5 h1 v1 h-1 z M5 5 h1 v1 h-1 z M3 6 h1 v1 h-1 z M4 6 h1 v1 h-1 z" fill="rgb(33,37,41)" /></svg>');
        border-image-outset: 1;
    }

    .cowebsite-thumbnail.vertical::before {
        width: 48px;
        height: 48px;
    }

    .cowebsite-thumbnail {

        position: relative;
        padding: 0;
        background-color: rgba(#000000, 0.6);
        margin: 1%;
        margin-top: auto;
        margin-bottom: auto;

        .cowebsite-icon {
            width: 50px;
            height: 50px;
            object-fit: cover;
        }

        &.vertical {
            margin: 7px;
            .cowebsite-icon {
                width: 40px;
                height: 40px;
            }
        }

        &.asleep {
            filter: grayscale(100%);
            --webkit-filter: grayscale(100%);
        }

        &.loading {
            animation: 2500ms ease-in-out 0s infinite alternate backgroundLoading;
        }

        @keyframes backgroundLoading {
            0% {
                background-color: rgba(#000000, 0.6);
            }

            100% {
                background-color: #25598e;
            }
        }
    }
</style>
