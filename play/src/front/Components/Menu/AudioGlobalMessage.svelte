<script lang="ts">
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { AdminMessageEventTypes } from "../../Connection/AdminMessagesService";
    import uploadFile from "../images/drag-and-drop.svg";
    import uploadFileActive from "../images/drag-and-drop-active.svg";
    import type { PlayGlobalMessageInterface } from "../../Connection/ConnexionModels";
    import { LL } from "../../../i18n/i18n-svelte";

    interface EventTargetFiles extends EventTarget {
        files: Array<File>;
    }

    let gameScene = gameManager.getCurrentGameScene();
    let fileInput: HTMLInputElement;
    let fileName: string | undefined;
    let fileSize: string;
    let errorFile: boolean;
    let errorUpload: boolean;
    let dropHover = false;

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
            try {
                const res = await gameScene.connection?.uploadAudio(fd);

                const audioGlobalMessage: PlayGlobalMessageInterface = {
                    content: (res as { path: string }).path,
                    type: AUDIO_TYPE,
                    broadcastToWorld: broadcast,
                };
                inputAudio.value = "";
                fileName = undefined;
                gameScene.connection?.emitGlobalMessage(audioGlobalMessage);
                errorUpload = false;
            } catch (err) {
                console.error(err);
                errorUpload = true;
            }
        },
    };

    function dropAudioFile(event: DragEvent) {
        event.preventDefault();
        if (!event.dataTransfer) {
            return;
        }

        const file = event.dataTransfer.files[0];
        if (!file) {
            return;
        }
        fileName = file.name;
        fileSize = getFileSize(file.size);
        errorFile = false;
        errorUpload = false;
    }

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
        errorUpload = false;
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

<!-- svelte-ignore a11y-click-events-have-key-events -->
<section
    class="section-input-send-audio centered-column cursor-pointer"
    on:dragover|preventDefault={() => {
        dropHover = true;
    }}
    on:dragleave|preventDefault={() => {
        dropHover = false;
    }}
    on:drop|preventDefault={(e) => {
        dropAudioFile(e);
        dropHover = false;
    }}
    on:click={() => {
        fileInput.click();
    }}
>
    <div class="flex flex-col items-center">
        <div>
            <p class="pointer-events-none ">
                {$LL.menu.globalAudio.dragAndDrop()}
            </p>
        </div>

        <div class="w-[50em] flex justify-center items-center mb-2">
            <img
                class="clickable w-1/6 pointer-events-none"
                class:hidden={!dropHover}
                draggable="false"
                src={uploadFileActive}
                alt={$LL.menu.globalAudio.uploadInfo()}
            />
            <img
                class="clickable w-1/6 pointer-events-none"
                class:hidden={dropHover}
                draggable="false"
                src={uploadFile}
                alt={$LL.menu.globalAudio.uploadInfo()}
            />
        </div>
    </div>

    {#if fileName !== undefined}
        <p class="p-4">{fileName} : {fileSize}</p>
    {/if}
    {#if errorFile}
        <p class="err">{$LL.menu.globalAudio.error()}</p>
    {/if}
    {#if errorUpload}
        <p class="err">{$LL.menu.globalAudio.errorUpload()}</p>
    {/if}
    <input
        class="hidden"
        type="file"
        id="input-send-audio"
        bind:this={fileInput}
        on:change={(e) => {
            inputAudioFile(e);
        }}
    />
</section>

<style lang="scss">
    p.err {
        color: red;
    }
</style>
