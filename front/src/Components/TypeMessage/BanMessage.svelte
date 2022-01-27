<script lang="ts">
    import { fly, fade } from "svelte/transition";
    import { onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import type { Message } from "../../Stores/TypeMessageStore/MessageStore";
    import { banMessageStore } from "../../Stores/TypeMessageStore/BanMessageStore";
    import LL from "../../i18n/i18n-svelte";

    export let message: Message;

    const NAME_BUTTON = "Ok";
    let nbSeconds = 10;
    let nameButton = "";

    onMount(() => {
        timeToRead();
        const gameScene = gameManager.getCurrentGameScene();
        gameScene.playSound("audio-report-message");
    });

    function timeToRead() {
        nbSeconds -= 1;
        nameButton = nbSeconds.toString();
        if (nbSeconds > 0) {
            setTimeout(() => {
                timeToRead();
            }, 1000);
        } else {
            nameButton = NAME_BUTTON;
        }
    }

    function closeBanMessage() {
        banMessageStore.clearMessageById(message.id);
    }
</script>

<div
    class="main-ban-message nes-container is-rounded"
    in:fly={{ y: -1000, duration: 500, delay: 250 }}
    out:fade={{ duration: 200 }}
>
    <h2 class="title-ban-message">
        <img src="resources/logos/report.svg" alt="***" />
        {$LL.warning.importantMessage()}
        <img src="resources/logos/report.svg" alt="***" />
    </h2>
    <div class="content-ban-message">
        <p>{message.text}</p>
    </div>
    <div class="footer-ban-message">
        <button
            type="button"
            class="nes-btn {nameButton === NAME_BUTTON ? 'is-primary' : 'is-error'}"
            disabled={!(nameButton === NAME_BUTTON)}
            on:click|preventDefault={closeBanMessage}>{nameButton}</button
        >
    </div>
</div>

<style lang="scss">
    div.main-ban-message {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 4%;
        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;
        z-index: 850;

        height: 70vh;
        width: 60vw;
        margin-left: auto;
        margin-right: auto;
        padding-bottom: 0;

        pointer-events: auto;
        background-color: #333333;
        color: whitesmoke;

        h2.title-ban-message {
            flex: 1 1 auto;
            max-height: 50px;
            margin-bottom: 20px;

            text-align: center;

            img {
                height: 50px;
            }
        }

        div.content-ban-message {
            flex: 1 1 auto;
            max-height: calc(100% - 50px);
            overflow: auto;

            p {
                white-space: pre-wrap;
            }
        }

        div.footer-ban-message {
            height: 50px;
            margin-top: 10px;
            text-align: center;

            button {
                width: 88px;
                height: 44px;
            }
        }
    }
</style>
