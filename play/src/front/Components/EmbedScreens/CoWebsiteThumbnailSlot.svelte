<script lang="ts">
    import { onMount } from "svelte";

    import { ICON_URL } from "../../Enum/EnvironmentVariable";
    import { mainCoWebsite } from "../../Stores/CoWebsiteStore";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";
    import { iframeStates, coWebsiteManager } from "../../WebRtc/CoWebsiteManager";

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

    async function onClick() {
        if ($mainCoWebsite) {
            if ($mainCoWebsite.getId() === coWebsite.getId()) {
                if (coWebsiteManager.getMainState() === iframeStates.closed) {
                    coWebsiteManager.displayMain();
                } else if ($highlightedEmbedScreen?.type === "cowebsite") {
                    coWebsiteManager.goToMain($highlightedEmbedScreen.embed);
                } else {
                    coWebsiteManager.hideMain();
                }
            } else {
                if (vertical) {
                    coWebsiteManager.hideMain();
                    coWebsiteManager.goToMain(coWebsite);
                    coWebsiteManager.displayMain();
                } else if (coWebsiteManager.getMainState() === iframeStates.closed) {
                    coWebsiteManager.goToMain(coWebsite);
                    coWebsiteManager.displayMain();
                } else {
                    highlightedEmbedScreen.toggleHighlight({
                        type: "cowebsite",
                        embed: coWebsite,
                    });
                }
            }
        }

        if ($state === "asleep") {
            await coWebsiteManager.loadCoWebsite(coWebsite);
        }

        coWebsiteManager.resizeAllIframes();
    }

    function noDrag() {
        return false;
    }

    let isHighlight = false;
    let isMain = false;
    $: {
        isMain =
            $mainState === iframeStates.opened &&
            $mainCoWebsite !== undefined &&
            $mainCoWebsite.getId() === coWebsite.getId();
        isHighlight =
            $highlightedEmbedScreen !== undefined &&
            $highlightedEmbedScreen?.type === "cowebsite" &&
            $highlightedEmbedScreen?.embed.getId() === coWebsite.getId();
    }
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
    <div on:click={() => analyticsClient.stackOpenCloseMultiIframe()} on:click={onClick}>
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

        &:not(.vertical) {
            transition: all 300ms;
            transform: translateY(0px);
        }

        &.vertical {
            margin: 7px;

            &::before {
                width: 48px;
                height: 48px;
            }

            .cowebsite-icon {
                width: 40px;
                height: 40px;
            }

            .cowebsite-hover {
                width: max-content !important;
                top: -4px;
                left: 55px;
            }

            animation: shake 0.35s ease-in-out;
        }

        &.displayed {
            &:not(.vertical) {
                transform: translateY(-15px);
            }
        }

        &.asleep {
            filter: grayscale(100%);
            --webkit-filter: grayscale(100%);
        }

        &.loading {
            animation: 2500ms ease-in-out 0s infinite alternate backgroundLoading;
        }

        &.ready {
            &:not(.vertical) {
                margin-bottom: 2px;
            }
            &::before {
                border-image-source: url('data:image/svg+xml;utf8,<?xml version="1.0" encoding="UTF-8" ?><svg version="1.1" width="8" height="8" xmlns="http://www.w3.org/2000/svg"><path d="M3 1 h1 v1 h-1 z M4 1 h1 v1 h-1 z M2 2 h1 v1 h-1 z M5 2 h1 v1 h-1 z M1 3 h1 v1 h-1 z M6 3 h1 v1 h-1 z M1 4 h1 v1 h-1 z M6 4 h1 v1 h-1 z M2 5 h1 v1 h-1 z M5 5 h1 v1 h-1 z M3 6 h1 v1 h-1 z M4 6 h1 v1 h-1 z" fill="rgb(38, 74, 110)" /></svg>');
            }
        }

        @keyframes backgroundLoading {
            0% {
                background-color: rgba(#000000, 0.6);
            }

            100% {
                background-color: #25598e;
            }
        }

        @keyframes bounce {
            from {
                transform: translateY(0);
            }
            to {
                transform: translateY(-15px);
            }
        }

        @keyframes shake {
            0% {
                transform: translateX(0);
            }

            20% {
                transform: translateX(-10px);
            }

            40% {
                transform: translateX(10px);
            }

            60% {
                transform: translateX(-10px);
            }

            80% {
                transform: translateX(10px);
            }

            100% {
                transform: translateX(0);
            }
        }

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

        .cowebsite-hover {
            position: absolute;
            background-color: rgba(0, 0, 0, 0.6);
            top: -40px;
            left: -4px;
            width: 0 !important;
            min-height: 20px;
            transition: all 0.2s ease;
            overflow: hidden;
            color: white;
            padding: 4px;
            border-radius: 4px;

            p {
                margin-bottom: 0;
            }
        }

        &:hover {
            .cowebsite-hover {
                opacity: 1;
                width: max-content !important;
            }
        }
    }
</style>
