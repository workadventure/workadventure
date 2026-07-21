<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy } from "svelte";
    import { errorScreenStore } from "../../Stores/ErrorScreenStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { connectionManager } from "../../Connection/ConnectionManager";

    import LL from "../../../i18n/i18n-svelte";
    import { userIsConnected } from "../../Stores/MenuStore";

    import logoImg from "../images/logo-min-white.png";
    import LoaderIcon from "../Icons/LoaderIcon.svelte";
    import type { Room } from "../../Connection/Room";
    import Button from "./Button.svelte";
    import errorGif from "./images/error.gif";
    import { IconRefresh } from "@wa-icons";

    let errorScreen = $errorScreenStore;

    let startRoom: Room | undefined = $state();
    try {
        startRoom = gameManager?.currentStartedRoom;
    } catch {
        startRoom = undefined;
    }

    let logoErrorSrc = $derived(startRoom?.loginSceneLogo ?? logoImg);

    function click() {
        if (errorScreen?.type === "unauthorized") connectionManager.logout();
        else window.location.reload();
    }
    let details = errorScreen?.details ?? "";
    let timeVar = $state(errorScreen?.timeToRetry ?? 0);

    if (errorScreen?.type === "retry") {
        let interval = setInterval(() => {
            if (timeVar <= 1000) click();
            timeVar -= 1000;
        }, 1000);
        onDestroy(() => clearInterval(interval));
    }

    function getBackgroundColor() {
        return startRoom?.backgroundColor;
    }

    function logout() {
        connectionManager.logout();
    }

    let detailsStylized = $derived((details ?? "").replace("{time}", `${timeVar / 1000}`));
</script>

{#snippet refreshIcon()}
    <IconRefresh />
{/snippet}

{#if $errorScreenStore}
    <main
        class="errorScreen bg-contrast pointer-events-auto w-full text-white text-center absolute flex flex-wrap items-center justify-center h-full top-0 left-0 right-0 mx-auto overflow-scroll py-5"
        data-testid={$errorScreenStore.type === "reconnecting" ? "reconnecting-error-screen" : undefined}
        style={getBackgroundColor() != undefined ? `background-color: ${getBackgroundColor()};` : ""}
        transition:fly={{ y: -200, duration: 500 }}
    >
        <div class="flex flex-col items-center" style=" width: 90%;">
            <!-- <div class="logo" bind:this={logoErrorParent} />
            <div class="icon" bind:this={imageErrorParent} /> -->
            <div class="logo">
                {#if logoErrorSrc && $errorScreenStore.type !== "reconnecting"}
                    <img
                        src={errorScreen?.imageLogo ?? logoErrorSrc}
                        alt="Logo error"
                        style="max-height:25vh; max-width:80%;"
                        draggable="false"
                    />
                {/if}
            </div>
            <div class="icon">
                <img
                    src={errorScreen?.image ?? startRoom?.errorSceneLogo ?? errorGif}
                    alt="Error"
                    style="height:125px; max-width:100%;"
                    draggable="false"
                />
            </div>
            {#if $errorScreenStore.type !== "retry"}<h2 class="mt-10">{$errorScreenStore.title}</h2>{/if}
            {#if $errorScreenStore.subtitle}<p>{$errorScreenStore.subtitle}</p>{/if}
            {#if $errorScreenStore.type !== "retry" && $errorScreenStore.type !== "reconnecting"}<p class="code">
                    Code : {$errorScreenStore.code}
                </p>{/if}
            <div class="details flex flex-row items-center justify-center content-center gap-2">
                <span>{detailsStylized}</span>
                {#if $errorScreenStore.type === "retry"}
                    <div class="loading"></div>
                {:else if $errorScreenStore.type === "reconnecting"}
                    <LoaderIcon />
                {/if}
            </div>
            <div class="flex gap-2">
                {#if ($errorScreenStore.type === "retry" && $errorScreenStore.canRetryManual) || $errorScreenStore.type === "unauthorized"}
                    <Button
                        type="button"
                        size="lg"
                        variant="light"
                        appearance="border"
                        class="button"
                        icon={$errorScreenStore.type === "retry" ? refreshIcon : undefined}
                        onclick={click}
                    >
                        {$errorScreenStore.buttonTitle}
                    </Button>
                    {#if $userIsConnected}
                        <Button type="button" size="lg" variant="secondary" class="button" onclick={logout}>
                            {$LL.menu.profile.logout()}
                        </Button>
                    {/if}
                {/if}
            </div>
        </div>
    </main>
{/if}

<style>
    main.errorScreen {
        min-width: 300px;
        z-index: 700;
        .logo {
            margin: 0 auto 50px auto;
        }
        .icon {
            margin: 0 auto 25px auto;
        }
        h2 {
            padding: 5px;
            font-size: 30px;
        }
        p.code {
            font-size: 12px;
            opacity: 0.6;
            /* Prefixed too, or WebKit ignores the opt-in and `body` keeps this unselectable. */
            -webkit-user-select: text;
            user-select: text;
        }
        .loading {
            display: inline-block;
            min-width: 20px;
            position: relative;
            margin-left: 5px;
        }
        .loading:after {
            overflow: hidden;
            display: inline-block;
            vertical-align: bottom;
            -webkit-animation: ellipsis steps(4, end) 900ms infinite;
            animation: ellipsis steps(4, end) 900ms infinite;
            content: "\2026";
            width: 0;
            font-family: "Press Start 2P";
            font-size: 16px;
            position: absolute;
            left: 0;
            top: -19px;
        }
        /* Global so it reaches the <button> rendered by <Button> (scoped CSS would not). */
        :global(.button) {
            cursor: pointer;
            font-size: 14px;
        }
    }

    @media all and (max-device-width: 480px) {
        main.errorScreen {
            .logo {
                width: 90%;
                max-width: 90vw;
            }
            .icon {
                height: 60px;
            }
        }
    }

    @keyframes ellipsis {
        to {
            width: 1.25em;
        }
    }

    @-webkit-keyframes ellipsis {
        to {
            width: 1.25em;
        }
    }
</style>
