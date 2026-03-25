<script lang="ts">
    import { fly } from "svelte/transition";
    import { LL } from "../../i18n/i18n-svelte";
    import { gameManager } from "../Phaser/Game/GameManager";
    import logoImg from "./images/logo-min-white.png";
    import errorGif from "./UI/images/error.gif";

    function getBackgroundColor() {
        if (!gameManager.currentStartedRoom) return undefined;
        return gameManager.currentStartedRoom.backgroundColor;
    }

    const backgroundColor = getBackgroundColor();
</script>

<main
    class="mapDeletedScreen bg-contrast pointer-events-auto w-full text-white text-center absolute flex flex-wrap items-center justify-center h-full top-0 left-0 right-0 mx-auto overflow-scroll py-5"
    style={backgroundColor != undefined ? `background-color: ${backgroundColor};` : ""}
    transition:fly={{ y: -200, duration: 500 }}
>
    <div class="flex flex-col items-center" style="width: 90%;">
        <div class="logo">
            <img src={logoImg} alt="Logo" style="max-height:25vh; max-width:80%;" draggable="false" />
        </div>

        <div class="icon">
            <img
                src={gameManager?.currentStartedRoom?.errorSceneLogo ?? errorGif}
                alt="Map deleted"
                style="height:125px; max-width:100%;"
                draggable="false"
            />
        </div>

        <h2 class="mt-10">{$LL.mapEditor.map.deletePrompt()}</h2>
        <p class="subtitle">{$LL.mapEditor.map.deletePromptSubtitle()}</p>
        <p class="details">{$LL.mapEditor.map.deletePromptDetails()}</p>
    </div>
</main>

<style lang="scss">
    main.mapDeletedScreen {
        min-width: 300px;
        z-index: 700;
        font-family: "Roboto", sans-serif;

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

        .subtitle {
            margin: 0 auto 10px auto;
            max-width: 80%;
        }

        .details {
            font-size: 12px;
            max-width: 80%;
            margin: 0 auto 35px auto;
            opacity: 0.8;
        }
    }

    @media all and (max-device-width: 480px) {
        main.mapDeletedScreen {
            .logo {
                width: 90%;
                max-width: 90vw;
            }

            h2 {
                font-size: 24px;
            }
        }
    }
</style>
