<script lang="ts">
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { AdminMessageEventTypes } from "../../Connexion/AdminMessagesService";
    import uploadFile from "../images/music-file.svg";
    import type { PlayGlobalMessageInterface } from "../../Connexion/ConnexionModels";
    import LL from "../../i18n/i18n-svelte";

    interface EventTargetFiles extends EventTarget {
        files: Array<File>;
    }

    let gameScene = gameManager.getCurrentGameScene();
    let fileInput: HTMLInputElement;
    let fileName: string;
    let fileSize: string;
    let errorFile: boolean;

    const AUDIO_TYPE = AdminMessageEventTypes.audio;

    export const handleSending = {
        async sendAudioMessage(broadcast: boolean) {
            if (gameScene == undefined) {
                return;
            }
            const inputAudio = HtmlUtils.getElementByIdOrFail<HTMLInputElement>("input-send-audio");
            const selectedFile = inputAudio.files ? inputAudio.files[0] : null;
            if (!selectedFile) {
                errorFile = true;
                throw new Error("no file selected");
            }

            const fd = new FormData();
            fd.append("file", selectedFile);
            const res = await gameScene.connection?.uploadAudio(fd);

            const audioGlobalMessage: PlayGlobalMessageInterface = {
                content: (res as { path: string }).path,
                type: AUDIO_TYPE,
                broadcastToWorld: broadcast,
            };
            inputAudio.value = "";
            gameScene.connection?.emitGlobalMessage(audioGlobalMessage);
        },
    };

    function inputAudioFile(event: Event) {
        const eventTarget: EventTargetFiles = event.target as EventTargetFiles;
        if (!eventTarget || !eventTarget.files || eventTarget.files.length === 0) {
            return;
        }

        const file = eventTarget.files[0];
        if (!file) {
            return;
        }

        fileName = file.name;
        fileSize = getFileSize(file.size);
        errorFile = false;
    }

    function getFileSize(number: number) {
        if (number < 1024) {
            return number + "bytes";
        } else if (number >= 1024 && number < 1048576) {
            return (number / 1024).toFixed(1) + "KB";
        } else if (number >= 1048576) {
            return (number / 1048576).toFixed(1) + "MB";
        } else {
            return "";
        }
    }
</script>

<section class="section-input-send-audio">
    <img
        class="nes-pointer"
        src={uploadFile}
        alt={$LL.menu.globalAudio.uploadInfo()}
        on:click|preventDefault={() => {
            fileInput.click();
        }}
    />
    {#if fileName !== undefined}
        <p>{fileName} : {fileSize}</p>
    {/if}
    {#if errorFile}
        <p class="err">{$LL.menu.globalAudio.error()}</p>
    {/if}
    <input
        type="file"
        id="input-send-audio"
        bind:this={fileInput}
        on:change={(e) => {
            inputAudioFile(e);
        }}
    />
</section>

<style lang="scss">
    section.section-input-send-audio {
        display: flex;
        flex-direction: column;

        height: 100%;
        text-align: center;

        img {
            flex: 1 1 auto;
            max-height: 80%;
            margin-bottom: 20px;
        }
        p {
            margin-bottom: 5px;
            color: whitesmoke;
            font-size: 1rem;
            &.err {
                color: #ce372b;
            }
        }
        input {
            display: none;
        }
    }
</style>
