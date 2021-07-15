<script lang="typescript">
    import { fly } from 'svelte/transition';
    import InputTextGlobalMessage from "./InputTextGlobalMessage.svelte";
    import UploadAudioGlobalMessage from "./UploadAudioGlobalMessage.svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import type { Game } from "../../Phaser/Game/Game";
    import { consoleGlobalMessageManagerVisibleStore } from "../../Stores/ConsoleGlobalMessageManagerStore";

    export let game: Game;
    let inputSendTextActive = true;
    let uploadMusicActive = false;

    function inputSendTextActivate() {
        inputSendTextActive = true;
        uploadMusicActive = false;
    }

    function inputUploadMusicActivate() {
        uploadMusicActive = true;
        inputSendTextActive = false;
    }
</script>


<div class="console-global-message nes-container is-rounded" transition:fly="{{ y: -1000, duration: 500 }}">
    <div class="console-global-message-main">
        <h2> Global Message </h2>
        <button type="button" class="console-global-message-close nes-btn is-error" on:click|preventDefault={() => consoleGlobalMessageManagerVisibleStore.set(false)}><i class="nes-icon close is-small"></i></button>
        <div class="console-global-message-content">
            <div class="console-global-message-menu">
                <button type="button" class="nes-btn {inputSendTextActive ? 'is-disabled' : ''}" on:click|preventDefault={inputSendTextActivate}>Message</button>
                <button type="button" class="nes-btn {uploadMusicActive ? 'is-disabled' : ''}" on:click|preventDefault={inputUploadMusicActivate}>Audio</button>
            </div>
            <div class="console-global-message-main-input">
                {#if inputSendTextActive}
                    <InputTextGlobalMessage game={game} gameManager={gameManager}/>
                {/if}
                {#if uploadMusicActive}
                    <UploadAudioGlobalMessage game={game} gameManager={gameManager}/>
                {/if}
            </div>
        </div>
    </div>
</div>