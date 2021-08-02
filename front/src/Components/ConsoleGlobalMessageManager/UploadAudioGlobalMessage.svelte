<script lang="ts">
    import {HtmlUtils} from "../../WebRtc/HtmlUtils";
    import type {Game} from "../../Phaser/Game/Game";
    import type {GameManager} from "../../Phaser/Game/GameManager";
    import {consoleGlobalMessageManagerFocusStore, consoleGlobalMessageManagerVisibleStore} from "../../Stores/ConsoleGlobalMessageManagerStore";
    import {AdminMessageEventTypes} from "../../Connexion/AdminMessagesService";
    import type {PlayGlobalMessageInterface} from "../../Connexion/ConnexionModels";
    import uploadFile from "../images/music-file.svg";
    import {LoginSceneName} from "../../Phaser/Login/LoginScene";

    interface EventTargetFiles extends EventTarget {
        files: Array<File>;
    }

    export let game: Game;
    export let gameManager: GameManager;

    let gameScene = gameManager.getCurrentGameScene(game.scene.getScene(LoginSceneName));
    let fileinput: HTMLInputElement;
    let filename: string;
    let filesize: string;
    let errorfile: boolean;

    const AUDIO_TYPE = AdminMessageEventTypes.audio;


    async function SendAudioMessage() {
        if (gameScene == undefined) {
            return;
        }
        const inputAudio = HtmlUtils.getElementByIdOrFail<HTMLInputElement>("input-send-audio");
        const selectedFile = inputAudio.files ? inputAudio.files[0] : null;
        if (!selectedFile) {
            errorfile = true;
            throw 'no file selected';
        }

        const fd = new FormData();
        fd.append('file', selectedFile);
        const res = await gameScene.connection?.uploadAudio(fd);

        const GlobalMessage: PlayGlobalMessageInterface = {
            id: (res as { id: string }).id,
            message: (res as { path: string }).path,
            type: AUDIO_TYPE
        }
        inputAudio.value = '';
        gameScene.connection?.emitGlobalMessage(GlobalMessage);
        disableConsole();
    }

    function inputAudioFile(event: Event) {
        const eventTarget : EventTargetFiles = (event.target as EventTargetFiles);
        if(!eventTarget || !eventTarget.files || eventTarget.files.length === 0){
            return;
        }

        const file = eventTarget.files[0];
        if(!file) {
            return;
        }

        filename = file.name;
        filesize = getFileSize(file.size);
        errorfile = false;
    }

    function getFileSize(number: number) {
        if (number < 1024) {
            return number + 'bytes';
        } else if (number >= 1024 && number < 1048576) {
            return (number / 1024).toFixed(1) + 'KB';
        } else if (number >= 1048576) {
            return (number / 1048576).toFixed(1) + 'MB';
        } else {
            return '';
        }
    }

    function disableConsole() {
        consoleGlobalMessageManagerVisibleStore.set(false);
        consoleGlobalMessageManagerFocusStore.set(false);
    }
</script>


<section class="section-input-send-audio">
    <div class="input-send-audio">
        <img src="{uploadFile}" alt="Upload a file" on:click|preventDefault={ () => {fileinput.click();}}>
        {#if filename != undefined}
            <label for="input-send-audio">{filename} : {filesize}</label>
        {/if}
        {#if errorfile}
            <p class="err">No file selected. You need to upload a file before sending it.</p>
        {/if}
        <input type="file" id="input-send-audio" bind:this={fileinput} on:change={(e) => {inputAudioFile(e)}}>
    </div>
    <div class="btn-action">
        <button class="nes-btn is-primary" on:click|preventDefault={SendAudioMessage}>Send</button>
    </div>
</section>

<style lang="scss">
  //UploadAudioGlobalMessage
  .section-input-send-audio {
    margin: 10px;
  }

  .section-input-send-audio .input-send-audio {
    text-align: center;
  }

  .section-input-send-audio #input-send-audio{
    display: none;
  }

  .section-input-send-audio div.input-send-audio label{
    color: white;
  }

  .section-input-send-audio div.input-send-audio p.err {
    color: #ce372b;
    text-align: center;
  }

  .section-input-send-audio div.input-send-audio img{
    height: 150px;
    cursor: url('../../../style/images/cursor_pointer.png'), pointer;
  }
</style>