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
    class="cowebsite-thumbnail nes-container is-rounded nes-pointer"
    class:asleep={$state === "asleep"}
    class:loading={$state === "loading"}
    class:ready={$state === "ready"}
    class:vertical
    on:click={toggleHighlightEmbedScreen}
>
    <img class="cowebsite-icon noselect nes-pointer" bind:this={icon} on:dragstart|preventDefault={noDrag} alt="" />
</div>

<style lang="scss">
    .cowebsite-thumbnail {
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
