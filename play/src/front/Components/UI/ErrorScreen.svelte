<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy } from "svelte";
    import { errorScreenStore } from "../../Stores/ErrorScreenStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { connectionManager } from "../../Connection/ConnectionManager";

    import reload from "../images/reload.png";
    import LL from "../../../i18n/i18n-svelte";
    import { userIsConnected } from "../../Stores/MenuStore";

    import logoImg from "../images/logo-min-white.png";
    import LoaderIcon from "../Icons/LoaderIcon.svelte";
    import errorGif from "./images/error.gif";

    let errorScreen = $errorScreenStore;

    let logoErrorSrc = gameManager?.currentStartedRoom?.loginSceneLogo ?? logoImg;

    function click() {
        if (errorScreen?.type === "unauthorized") void connectionManager.logout();
        else window.location.reload();
    }
    let details = errorScreen?.details ?? "";
    let timeVar = errorScreen?.timeToRetry ?? 0;

    if (errorScreen?.type === "retry") {
        let interval = setInterval(() => {
            if (timeVar <= 1000) click();
            timeVar -= 1000;
        }, 1000);
        onDestroy(() => clearInterval(interval));
    }

    function getBackgroundColor() {
        if (!gameManager.currentStartedRoom) return undefined;
        return gameManager.currentStartedRoom.backgroundColor;
    }

    function logout() {
        connectionManager.logout();
    }

    $: detailsStylized = (details ?? "").replace("{time}", `${timeVar / 1000}`);
</script>

{#if $errorScreenStore}
    <main
        class="errorScreen bg-contrast h-dvh pointer-events-auto w-full text-white text-center absolute flex flex-wrap items-center justify-center h-full top-0 left-0 right-0 mx-auto overflow-scroll py-5"
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
                    />
                {/if}
            </div>

            <div class="icon">
                <img
                    src={errorScreen?.image ?? gameManager?.currentStartedRoom?.errorSceneLogo ?? errorGif}
                    alt="Error"
                    style="height:125px; max-width:100%;"
                />
            </div>
            {#if $errorScreenStore.type !== "retry"}<h2 class="mt-10">{$errorScreenStore.title}</h2>{/if}
            {#if $errorScreenStore.subtitle}<p>{$errorScreenStore.subtitle}</p>{/if}
            {#if $errorScreenStore.type !== "retry" && $errorScreenStore.type !== "reconnecting"}<p class="code">
                    Code : {$errorScreenStore.code}
                </p>{/if}
            <p class="details">
                {detailsStylized}
                {#if $errorScreenStore.type === "retry"}
                    <div class="loading" />
                {:else if $errorScreenStore.type === "reconnecting"}
                    <LoaderIcon />
                {/if}
            </p>
            <div class="flex gap-2">
                {#if ($errorScreenStore.type === "retry" && $errorScreenStore.canRetryManual) || $errorScreenStore.type === "unauthorized"}
                    <button type="button" class="btn-lg btn btn-light btn-border  button" on:click={click}>
                        {#if $errorScreenStore.type === "retry"}<img
                                src={reload}
                                alt=""
                                class="reload mr-2 hover:"
                            />{/if}
                        {$errorScreenStore.buttonTitle}
                    </button>
                    {#if $userIsConnected}
                        <button type="button" class="btn-lg btn btn-secondary button" on:click={logout}>
                            {$LL.menu.profile.logout()}
                        </button>
                    {/if}
                {/if}
            </div>
        </div>
    </main>
{/if}

<style lang="scss">
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
            user-select: text;
        }
        p.details {
            font-size: 12px;
            max-width: 80%;
            margin: 0 auto 35px auto;
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

        .button {
            cursor: pointer;
            font-size: 14px;
            .reload {
                margin-top: -4px;
                width: 22px;
            }
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
</style>
