<script lang="ts">
    import { fly } from "svelte/transition";
    import { errorScreenStore } from "../../Stores/ErrorScreenStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { connectionManager } from "../../Connexion/ConnectionManager";
    import { get } from "svelte/store";
    import { onDestroy } from "svelte";

    import logoImg from "../images/logo-min-white.png";
    let logo = gameManager?.currentStartedRoom?.loginSceneLogo ?? logoImg;
    import reload from "../images/reload.png";
    let errorScreen = get(errorScreenStore);

    import error from "./images/error.png";
    let errorLogo = errorScreen?.image || error;

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

    $: detailsStylized = (details ?? "").replace("{time}", `${timeVar / 1000}`);
</script>

{#if $errorScreenStore}
    <main class="errorScreen" transition:fly={{ y: -200, duration: 500 }}>
        <div style="width: 90%;">
            <div class="logo"><img src={logo} alt="WorkAdventure" /></div>
            <div class="icon"><img src={errorLogo} alt="Error logo" /></div>
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
                <button type="button" class="nes-btn is-primary button" on:click={click}>
                    {#if $errorScreenStore.type === "retry"}<img src={reload} alt="" class="reload" />{/if}
                    {$errorScreenStore.buttonTitle}
                </button>
            {/if}
        </div>
    </main>
{/if}

<style lang="scss">
    main.errorScreen {
        pointer-events: auto;
        width: 100%;
        background-color: #000000;
        color: #ffffff;
        text-align: center;
        position: absolute;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        height: 100%;
        top: 0;
        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;
        min-width: 300px;
        z-index: 700;
        overflow-y: scroll;
        padding: 20px 0;
        .logo {
            width: 50%;
            max-height: 25vh;
            max-width: 50vw;
            margin: 0 auto 50px auto;
        }
        .icon {
            height: 125px;
            max-height: 25vh;
            max-width: 50vw;
            margin: 0 auto 25px auto;
        }
        .logo img,
        .icon img {
            max-width: 100%;
            max-height: 100%;
        }
        h2 {
            font-family: "Press Start 2P";
            padding: 5px;
            font-size: 30px;
        }
        p {
            font-family: "Press Start 2P";
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
            font-family: "Press Start 2P";
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
