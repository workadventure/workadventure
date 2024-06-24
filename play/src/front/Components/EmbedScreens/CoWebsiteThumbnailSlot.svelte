<script lang="ts">
    import { onMount } from "svelte";

    import { ICON_URL } from "../../Enum/EnvironmentVariable";
    import { mainCoWebsite } from "../../Stores/CoWebsiteStore";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";
    import { coWebsiteManager } from "../../WebRtc/CoWebsiteManager";

    import jitsiIcon from "../images/jitsi.png";
    import meetingIcon from "../images/meeting.svg";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import loaderImg from "../images/loader.svg";

    export let index: number;
    export let coWebsite: CoWebsite;
    export let vertical: boolean;

    let icon: HTMLImageElement;
    let iconLoaded = false;
    let state = coWebsite.getStateSubscriber();
    let isJitsi: boolean = coWebsite instanceof JitsiCoWebsite;
    let isBBB: boolean = coWebsite instanceof BBBCoWebsite;
    let isMeeting: boolean = isJitsi || isBBB;
    let cowebsiteName = "";

    const mainState = coWebsiteManager.getMainStateSubscriber();

    onMount(() => {
        if (isJitsi) {
            icon.src = jitsiIcon;
            cowebsiteName = "Jitsi meeting";
        } else if (isBBB) {
            icon.src = meetingIcon;
            cowebsiteName = "BigBlueButton meeting";
        } else {
            icon.src = `${ICON_URL}/icon?url=${encodeURIComponent(
                coWebsite.getUrl().toString()
            )}&size=64..96..256&fallback_icon_color=14304c`;
            cowebsiteName = coWebsite.getUrl().hostname;
        }
        icon.alt = coWebsite.getUrl().hostname;
        icon.onload = () => {
            iconLoaded = true;
        };
    });

    // async function onClick() {
    //     if ($mainCoWebsite) {
    //         if ($mainCoWebsite.getId() === coWebsite.getId()) {
    //             if (coWebsiteManager.getMainState() === iframeStates.closed) {
    //                 coWebsiteManager.displayMain();
    //             } else if ($highlightedEmbedScreen?.type === "cowebsite") {
    //                 coWebsiteManager.goToMain($highlightedEmbedScreen.embed);
    //             } else {
    //                 coWebsiteManager.hideMain();
    //             }
    //         } else {
    //             if (vertical) {
    //                 coWebsiteManager.hideMain();
    //                 coWebsiteManager.goToMain(coWebsite);
    //                 coWebsiteManager.displayMain();
    //             } else if (coWebsiteManager.getMainState() === iframeStates.closed) {
    //                 coWebsiteManager.goToMain(coWebsite);
    //                 coWebsiteManager.displayMain();
    //             } else {
    //                 highlightedEmbedScreen.toggleHighlight({
    //                     type: "cowebsite",
    //                     embed: coWebsite,
    //                 });
    //             }
    //         }
    //     }

    //     if ($state === "asleep") {
    //         await coWebsiteManager.loadCoWebsite(coWebsite);
    //     }

    //     // coWebsiteManager.resizeAllIframes();
    // }

    function noDrag() {
        return false;
    }

    let isHighlight = false;
    let isMain = false;
    // $: {
    //     isMain =
    //         $mainState === iframeStates.opened &&
    //         $mainCoWebsite !== undefined &&
    //         $mainCoWebsite.getId() === coWebsite.getId();
    //     isHighlight =
    //         $highlightedEmbedScreen !== undefined &&
    //         $highlightedEmbedScreen?.type === "cowebsite" &&
    //         $highlightedEmbedScreen?.embed.getId() === coWebsite.getId();
    // }
</script>

<div
    id={"cowebsite-thumbnail-" + index}
    class="cowebsite-thumbnail flex items-center mr-4 p-2 rounded {isMain || isHighlight
        ? 'bg-white text-contrast'
        : 'bg-contrast/80 text-white'}"
    class:asleep={$state === "asleep"}
    class:loading={$state === "loading"}
    class:ready={$state === "ready"}
    class:vertical
>
    <img
        class="cowebsite-icon noselect clickable p-0 border-medium-purple border-solid rounded pointer-events-auto transition-all mr-4"
        class:hide={!iconLoaded}
        class:meeting={isMeeting}
        bind:this={icon}
        on:dragstart|preventDefault={noDrag}
        alt=""
    />
    <div
        class:hide={iconLoaded}
        class="h-10 w-10 aspect-ratio bg-contrast"
        style="background-image: url({loaderImg})"
    />
    <div class="pr-2">
        <div class="bold text-lg">{cowebsiteName}</div>
        <div class="italic text-xs opacity-50 -mt-1">{cowebsiteName}</div>
    </div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div on:click={() => analyticsClient.stackOpenCloseMultiIframe()}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_1820_4223)">
                <path
                    d="M16.5 5.5L5.5 16.5M5.5 5.5L16.5 16.5"
                    class="{isMain || isHighlight ? 'stroke-contrast' : 'stroke-white'} transition-all"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </g>
            <defs>
                <clipPath id="clip0_1820_4223">
                    <rect width="22" height="22" fill="white" />
                </clipPath>
            </defs>
        </svg>
    </div>

    <!--
    <div class="cowebsite-hover opacity-1 md:opacity-0" style="width: max-content;">
        <p>{$LL.cowebsite.open()} / {$LL.cowebsite.close()} <b>{cowebsiteName}</b></p>
    </div>
    -->
</div>

<style lang="scss">
    .cowebsite-thumbnail {
        cursor: pointer;
        position: relative;
        margin-top: auto;
        margin-bottom: auto;

        .cowebsite-icon {
            width: 50px;
            height: 50px;
            object-fit: cover;

            &.hide {
                display: none;
            }

            &.meeting {
                padding: 7px;
            }
        }
    }
</style>
