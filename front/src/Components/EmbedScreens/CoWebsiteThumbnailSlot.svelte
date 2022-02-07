<script lang="typescript">
    import { onMount } from "svelte";

    import { ICON_URL } from "../../Enum/EnvironmentVariable";
    import { coWebsitesNotAsleep, mainCoWebsite } from "../../Stores/CoWebsiteStore";
    import { highlightedEmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { CoWebsite } from "../../WebRtc/CoWebsiteManager";
    import { iframeStates } from "../../WebRtc/CoWebsiteManager";
    import { coWebsiteManager } from "../../WebRtc/CoWebsiteManager";

    export let index: number;
    export let coWebsite: CoWebsite;
    export let vertical: boolean;

    let icon: HTMLImageElement;
    let iconLoaded = false;
    let state = coWebsite.state;

    const coWebsiteUrl = coWebsite.iframe.src;
    const urlObject = new URL(coWebsiteUrl);

    onMount(() => {
        icon.src = coWebsite.jitsi
            ? "/resources/logos/meet.svg"
            : `${ICON_URL}/icon?url=${urlObject.hostname}&size=64..96..256&fallback_icon_color=14304c`;
        icon.alt = coWebsite.altMessage ?? urlObject.hostname;
        icon.onload = () => {
            iconLoaded = true;
        };
    });

    async function onClick() {
        if (vertical) {
            coWebsiteManager.goToMain(coWebsite);
        } else if ($mainCoWebsite) {
            if ($mainCoWebsite.iframe.id === coWebsite.iframe.id) {
                const coWebsites = $coWebsitesNotAsleep;
                const newMain = $highlightedEmbedScreen ?? coWebsites.length > 1 ? coWebsites[1] : undefined;
                if (newMain && newMain.iframe.id !== $mainCoWebsite.iframe.id) {
                    coWebsiteManager.goToMain(newMain);
                } else if (coWebsiteManager.getMainState() === iframeStates.closed) {
                    coWebsiteManager.displayMain();
                } else {
                    coWebsiteManager.hideMain();
                }
            } else {
                highlightedEmbedScreen.toggleHighlight({
                    type: "cowebsite",
                    embed: coWebsite,
                });
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

    let isHighlight: boolean = false;
    let isMain: boolean = false;
    $: {
        isMain = $mainCoWebsite !== undefined && $mainCoWebsite.iframe === coWebsite.iframe;
        isHighlight =
            $highlightedEmbedScreen !== null &&
            $highlightedEmbedScreen.type === "cowebsite" &&
            $highlightedEmbedScreen.embed.iframe === coWebsite.iframe;
    }
</script>

<div
    id={"cowebsite-thumbnail-" + index}
    class="cowebsite-thumbnail nes-pointer"
    class:asleep={$state === "asleep"}
    class:loading={$state === "loading"}
    class:ready={$state === "ready"}
    class:displayed={isMain || isHighlight}
    class:vertical
    on:click={onClick}
>
    <img
        class="cowebsite-icon noselect nes-pointer"
        class:hide={!iconLoaded}
        class:jitsi={coWebsite.jitsi}
        bind:this={icon}
        on:dragstart|preventDefault={noDrag}
        alt=""
    />
    <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        class="cowebsite-icon"
        class:hide={iconLoaded}
        style="margin: auto; background: rgba(0, 0, 0, 0) none repeat scroll 0% 0%; shape-rendering: auto;"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid"
    >
        <rect x="19" y="19" width="20" height="20" fill="#14304c">
            <animate
                attributeName="fill"
                values="#365dff;#14304c;#14304c"
                keyTimes="0;0.125;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0s"
                calcMode="discrete"
            />
        </rect><rect x="40" y="19" width="20" height="20" fill="#14304c">
            <animate
                attributeName="fill"
                values="#365dff;#14304c;#14304c"
                keyTimes="0;0.125;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0.125s"
                calcMode="discrete"
            />
        </rect><rect x="61" y="19" width="20" height="20" fill="#14304c">
            <animate
                attributeName="fill"
                values="#365dff;#14304c;#14304c"
                keyTimes="0;0.125;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0.25s"
                calcMode="discrete"
            />
        </rect><rect x="19" y="40" width="20" height="20" fill="#14304c">
            <animate
                attributeName="fill"
                values="#365dff;#14304c;#14304c"
                keyTimes="0;0.125;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0.875s"
                calcMode="discrete"
            />
        </rect><rect x="61" y="40" width="20" height="20" fill="#14304c">
            <animate
                attributeName="fill"
                values="#365dff;#14304c;#14304c"
                keyTimes="0;0.125;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0.375s"
                calcMode="discrete"
            />
        </rect><rect x="19" y="61" width="20" height="20" fill="#14304c">
            <animate
                attributeName="fill"
                values="#365dff;#14304c;#14304c"
                keyTimes="0;0.125;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0.75s"
                calcMode="discrete"
            />
        </rect><rect x="40" y="61" width="20" height="20" fill="#14304c">
            <animate
                attributeName="fill"
                values="#365dff;#14304c;#14304c"
                keyTimes="0;0.125;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0.625s"
                calcMode="discrete"
            />
        </rect><rect x="61" y="61" width="20" height="20" fill="#14304c">
            <animate
                attributeName="fill"
                values="#365dff;#14304c;#14304c"
                keyTimes="0;0.125;1"
                dur="1s"
                repeatCount="indefinite"
                begin="0.5s"
                calcMode="discrete"
            />
        </rect>
    </svg>
</div>

<style lang="scss">
    .cowebsite-thumbnail {
        position: relative;
        padding: 0;
        background-color: rgba(#000000, 0.6);
        margin: 12px;
        margin-top: auto;
        margin-bottom: auto;

        &::before {
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

        &:not(.vertical) {
            animation: bounce 0.35s ease 6 alternate;
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

            animation: shake 0.35s ease-in-out;
        }

        &.displayed {
            &:not(.vertical) {
                animation: activeThumbnail 300ms ease-in 0s forwards;
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

        @keyframes activeThumbnail {
            0% {
                transform: translateY(0);
            }

            100% {
                transform: translateY(-15px);
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

            &.jitsi {
                filter: invert(100%);
                -webkit-filter: invert(100%);
                padding: 7px;
            }
        }
    }
</style>
