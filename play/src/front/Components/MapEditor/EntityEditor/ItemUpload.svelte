<script lang="ts">
    import { onDestroy } from "svelte";
    import { UploadEntityMessage, UploadEntityMessage_Direction } from "@workadventure/messages";
    import { mapEditorEntityUploadEventStore } from "../../../Stores/MapEditorStore";
    import iconUploadWhite from "../../images/icon-upload-white.svg";

    let files: FileList | undefined = undefined;
    let fileToUpload: File | null = null;
    let fileInput: HTMLInputElement;
    let dropZoneRef: HTMLDivElement;

    $: {
        if (files) {
            fileToUpload = files.item(0);
        }
    }

    const mapEditorEntityUploadEventStoreUnsubscriber = mapEditorEntityUploadEventStore.subscribe(
        (uploadEntityMessage) => {
            completeAndResetUpload(uploadEntityMessage);
        }
    );

    function completeAndResetUpload(uploadEntityMessage: UploadEntityMessage | undefined) {
        if (uploadEntityMessage === undefined && files !== undefined) {
            initFileUpload();
        }
    }

    async function processFileToUpload() {
        const fileBuffer = await fileToUpload!.arrayBuffer();
        const fileAsUint8Array = new Uint8Array(fileBuffer);
        mapEditorEntityUploadEventStore.set({
            file: fileAsUint8Array,
            direction: UploadEntityMessage_Direction.Down,
            name: fileToUpload!.name,
            tags: [],
            imagePath: fileToUpload!.name,
            color: "",
        });
    }

    function initFileUpload() {
        files = undefined;
        fileInput.value = "";
        fileToUpload = null;
        mapEditorEntityUploadEventStore.set(undefined);
    }

    function dropHandler(event: DragEvent) {
        const { files: filesFromDropEvent } = event.dataTransfer ?? {};
        if (filesFromDropEvent) {
            if (filesFromDropEvent.length > 1) {
                console.error("Only one file is permitted");
            } else {
                fileToUpload = filesFromDropEvent.item(0);
            }
        }
        dropZoneRef.classList.remove("tw-border-cyan-400");
    }

    onDestroy(() => {
        mapEditorEntityUploadEventStoreUnsubscriber();
    });
</script>

<div
    on:drop|preventDefault|stopPropagation={dropHandler}
    on:dragover|preventDefault={() => dropZoneRef.classList.add("tw-border-cyan-400")}
    on:dragleave|preventDefault={() => dropZoneRef.classList.remove("tw-border-cyan-400")}
    bind:this={dropZoneRef}
    class="hover:tw-cursor-pointer tw-flex tw-flex-col tw-border tw-border-dotted tw-rounded-md tw-items-center tw-justify-center"
>
    <input
        id="upload"
        class="tw-hidden"
        type="file"
        accept="image/png"
        bind:files
        bind:this={fileInput}
        data-testid="uploadCustomAsset"
    />
    {#if fileToUpload}
        <div class="tw-flex tw-flex-col tw-min-w-full tw-p-2 tw-m-0 tw-items-center tw-justify-center">
            <img src={URL.createObjectURL(fileToUpload)} width="48" height="auto" alt={fileToUpload.name} />
            <button on:click={processFileToUpload} data-testid="confirmUploadButton">Upload</button>
            <button class="tw-text-red-500" on:click={initFileUpload}>Cancel</button>
        </div>
    {:else}
        <label class="tw-flex tw-flex-col tw-min-w-full tw-p-2 tw-m-0 tw-items-center tw-justify-center" for="upload">
            <img class="hover:tw-cursor-pointer" src={iconUploadWhite} width="32" height="32" alt="iconUploadWhite" />
            <p class="hover:tw-cursor-pointer tw-text-gray-400 tw-m-0">
                Drop your image or <span class="hover:tw-cursor-pointer tw-text-white">click to add</span>
            </p></label
        >
    {/if}
</div>
