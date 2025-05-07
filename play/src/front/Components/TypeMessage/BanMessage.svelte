<script lang="ts">
    import { fly, fade } from "svelte/transition";
    import { onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import type { Message } from "../../Stores/TypeMessageStore/MessageStore";
    import { banMessageStore } from "../../Stores/TypeMessageStore/BanMessageStore";
    import { LL } from "../../../i18n/i18n-svelte";

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
    class="main-ban-message bg-dark-purple rounded text-white self-center m-1 p-3 w-full md:w-2/3 m-auto h-full py-3 px-5 pointer-events-auto lg:py-7 relative"
    in:fly={{ y: -1000, duration: 500, delay: 250 }}
    out:fade={{ duration: 200 }}
>
    <h2 class="text-lg md:text-2xl text-center">
        <img src="resources/logos/report.svg" alt="***" class="w-4 h-5 md:w-10 md:h-10" />
        {$LL.warning.importantMessage()}
        <img src="resources/logos/report.svg" alt="***" class="w-4 h-5 md:w-10 md:h-10" />
    </h2>
    <div class="overflow-auto py-2 h-3/5 xl:h-fit h-max-96 my-0 md:my-3 lg:p-5">
        <p class="text-sm md:text-base">{message.text}</p>
    </div>
    <div class="flex justify-center absolute bottom-2 w-full">
        <button
            type="button"
            class="{nameButton === NAME_BUTTON ? 'light' : 'disabled'} h-10"
            disabled={!(nameButton === NAME_BUTTON)}
            on:click|preventDefault={closeBanMessage}>{nameButton}</button
        >
    </div>
</div>
