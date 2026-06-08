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
    let fileInput: HTMLInputElement | undefined = $state();
    let fileName: string | undefined = $state();
    let fileSize: string = $state("");
    let errorFile: boolean = $state(false);
    let errorUpload: boolean = $state(false);
    let dropHover = $state(false);

    const AUDIO_TYPE = AdminMessageEventTypes.audio;

    export type AudioGlobalMessageHandle = {
        sendAudioMessage(broadcast: boolean): Promise<void>;
    };

    interface Props {
        handleSending?: AudioGlobalMessageHandle;
    }

    let { handleSending = $bindable() }: Props = $props();

    handleSending = {
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

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<section
    class="section-input-send-audio centered-column cursor-pointer"
    ondragover={(event) => {
        event.preventDefault();
        dropHover = true;
    }}
    ondragleave={(event) => {
        event.preventDefault();
        dropHover = false;
    }}
    ondrop={(event) => {
        event.preventDefault();
        dropAudioFile(event);
        dropHover = false;
    }}
    onclick={() => {
        fileInput?.click();
    }}
>
    <div class="flex flex-col items-center">
        <div>
            <p class="pointer-events-none">
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
        onchange={(e) => {
            inputAudioFile(e);
        }}
    />
</section>

<style lang="scss">
    p.err {
        color: red;
    }
</style>
