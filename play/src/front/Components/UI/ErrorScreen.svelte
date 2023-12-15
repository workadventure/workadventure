<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { errorImageStore, errorLogoStore, errorScreenStore } from "../../Stores/ErrorScreenStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { connectionManager } from "../../Connection/ConnectionManager";

    import reload from "../images/reload.png";

    let errorScreen = $errorScreenStore;
    let logoErrorParent: HTMLDivElement;
    let imageErrorParent: HTMLDivElement;

    let logoErrorSrc =
        errorScreen?.image ??
        gameManager?.currentStartedRoom?.errorSceneLogo ??
        gameManager?.currentStartedRoom?.loginSceneLogo ??
        undefined;

    let logoError: HTMLImageElement = $errorLogoStore;

    if (logoErrorSrc !== undefined) {
        logoError = document.createElement("img");
        logoError.src = logoErrorSrc;
    }

    logoError.style.maxHeight = "25vh";
    logoError.style.maxWidth = "80%";

    const errorImage: HTMLImageElement = $errorImageStore;
    errorImage.style.height = "125px";
    errorImage.style.maxWidth = "100%";

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

    $: detailsStylized = (details ?? "").replace("{time}", `${timeVar / 1000}`);

    onMount(() => {
        if (logoErrorParent) {
            logoErrorParent.innerHTML = "";
            logoErrorParent.appendChild(logoError);
        }
        if (imageErrorParent) {
            imageErrorParent.innerHTML = "";
            imageErrorParent.appendChild(errorImage);
        }
    });
</script>

{#if $errorScreenStore}
    <main
        class="errorScreen tw-bg-dark-purple tw-pointer-events-auto tw-w-full tw-text-white tw-text-center tw-absolute tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-h-full tw-top-0 tw-left-0 tw-right-0 tw-mx-auto tw-overflow-scroll tw-py-5"
        style={getBackgroundColor() != undefined ? `background-color: ${getBackgroundColor()};` : ""}
        transition:fly={{ y: -200, duration: 500 }}
    >
        <div class="tw-flex tw-flex-col tw-items-center" style="width: 90%;">
            <div class="logo" bind:this={logoErrorParent} />
            <div class="icon" bind:this={imageErrorParent} />
            {#if $errorScreenStore.type !== "retry"}<h2>{$errorScreenStore.title}</h2>{/if}
            {#if $errorScreenStore.subtitle}<p>{$errorScreenStore.subtitle}</p>{/if}
            {#if $errorScreenStore.type !== "retry"}<p class="code">Code : {$errorScreenStore.code}</p>{/if}
            <p class="details">
                {detailsStylized}
                {#if $errorScreenStore.type === "retry" || $errorScreenStore.type === "reconnecting"}
                    <div class="loading" />
                {/if}
            </p>
            {#if ($errorScreenStore.type === "retry" && $errorScreenStore.canRetryManual) || $errorScreenStore.type === "unauthorized"}
                <button type="button" class="light button" on:click={click}>
                    {#if $errorScreenStore.type === "retry"}<img src={reload} alt="" class="reload" />{/if}
                    {$errorScreenStore.buttonTitle}
                </button>
            {/if}
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
