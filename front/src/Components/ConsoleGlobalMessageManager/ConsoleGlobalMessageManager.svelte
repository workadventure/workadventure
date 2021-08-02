<script lang="typescript">
    import InputTextGlobalMessage from "./InputTextGlobalMessage.svelte";
    import UploadAudioGlobalMessage from "./UploadAudioGlobalMessage.svelte";
    import {gameManager} from "../../Phaser/Game/GameManager";
    import type {Game} from "../../Phaser/Game/Game";

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


<div class="main-console nes-container is-rounded">
<!--    <div class="console nes-container is-rounded">
       <img class="btn-close" src="resources/logos/send-yellow.svg" alt="Close">
    </div>-->
    <div class="main-global-message">
        <h2> Global Message </h2>
        <div class="global-message">
            <div class="menu">
                <button class="nes-btn {inputSendTextActive ? 'is-disabled' : ''}" on:click|preventDefault={inputSendTextActivate}>Message</button>
                <button class="nes-btn {uploadMusicActive ? 'is-disabled' : ''}" on:click|preventDefault={inputUploadMusicActivate}>Audio</button>
            </div>
            <div class="main-input">
                {#if inputSendTextActive}
                    <InputTextGlobalMessage game={game} gameManager={gameManager}></InputTextGlobalMessage>
                {/if}
                {#if uploadMusicActive}
                    <UploadAudioGlobalMessage game={game} gameManager={gameManager}></UploadAudioGlobalMessage>
                {/if}
            </div>
        </div>
    </div>
</div>