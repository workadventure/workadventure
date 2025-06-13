<script lang="ts">
    import { scale, fade } from "svelte/transition";
    import type { TransitionConfig } from "svelte/transition";
    import { messageScreenStore } from "../../Stores/MessageScreenStore";
    import { gameManager } from "../../Phaser/Game/GameManager";

    import logoImg from "../../Components/images/logo.svg";
    import LoaderIcon from "../Icons/LoaderIcon.svelte";

    let logoSrc = gameManager?.currentStartedRoom?.loadingLogo ?? logoImg;

    function getBackgroundColor() {
        if (!gameManager.currentStartedRoom) return undefined;
        return gameManager.currentStartedRoom.backgroundColor;
    }

    type ScaleFadeParams = {
        delay?: number;
        duration?: number;
        easing?: (t: number) => number;
        start?: number;
        opacity?: number;
    };
    function scaleAndFade(
        node: HTMLElement,
        params: ScaleFadeParams = {},
        options: { direction: "in" | "out" | "both" }
    ): TransitionConfig {
        return {
            ...scale(node, params),
            css: (t: number, u: number) => {
                const scaleCss = scale(node, params).css?.(t, u) ?? "";
                const fadeCss = fade(node, params).css?.(t, u) ?? "";
                return `${scaleCss};${fadeCss}`;
            },
        };
    }
</script>

{#if $messageScreenStore}
    <main
        class="messageScreen bg-contrast pointer-events-auto w-full text-white text-center absolute flex flex-wrap items-center justify-center h-full top-0 left-0 right-0 mx-auto overflow-scroll py-5"
        style={getBackgroundColor() != undefined ? `background-color: ${getBackgroundColor()};` : ""}
        transition:scaleAndFade={{ duration: 500, start: 0.7 }}
    >
        <div class="flex flex-col items-center" style="width: 90%;">
            <div class="logo">
                {#if logoSrc}
                    <img src={logoSrc} alt="Logo" style="max-height:25vh; max-width:80%;" />
                {/if}
            </div>
            <div class="content">
                <h2>{$messageScreenStore.title}</h2>
                {#if $messageScreenStore.subtitle}
                    <p class="subtitle">{$messageScreenStore.subtitle}</p>
                {/if}
                <LoaderIcon />
            </div>
        </div>
    </main>
{/if}

<style lang="scss">
    main.messageScreen {
        min-width: 300px;
        z-index: 700;

        .logo {
            margin: 0 auto 50px auto;
        }

        .content {
            margin: 0 auto;
            padding: 2rem;
            border-radius: 8px;
            max-width: 600px;
            width: 100%;

            h2 {
                font-size: 24px;
                margin-bottom: 1rem;
                font-weight: bold;
            }

            .subtitle {
                font-size: 16px;
                opacity: 0.9;
                line-height: 1.5;
            }
        }
    }

    @media all and (max-device-width: 480px) {
        main.messageScreen {
            .logo {
                width: 90%;
                max-width: 90vw;
            }

            .content {
                padding: 1rem;

                h2 {
                    font-size: 20px;
                }

                .subtitle {
                    font-size: 14px;
                }
            }
        }
    }
</style>
