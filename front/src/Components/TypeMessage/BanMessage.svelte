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
    class="main-ban-message tw-bg-dark-purple tw-rounded tw-text-white tw-self-center tw-m-1 tw-p-1 tw-w-full md:tw-w-2/3 tw-m-auto tw-h-full tw-py-3 tw-px-5 tw-pointer-events-auto"
    in:fly={{ y: -1000, duration: 500, delay: 250 }}
    out:fade={{ duration: 200 }}
>
    <h2>
        <img src="resources/logos/report.svg" alt="***" class="tw-w-10 tw-h-10"/>
        {$LL.warning.importantMessage()}
        <img src="resources/logos/report.svg" alt="***" class="tw-w-10 tw-h-10"/>
    </h2>
    <div>
        <p>{message.text}</p>
    </div>
    <div class="tw-flex tw-justify-center">
        <button
            type="button"
            class="{nameButton === NAME_BUTTON ? 'light' : 'disabled'}"
            disabled={!(nameButton === NAME_BUTTON)}
            on:click|preventDefault={closeBanMessage}>{nameButton}</button
        >
    </div>
</div>