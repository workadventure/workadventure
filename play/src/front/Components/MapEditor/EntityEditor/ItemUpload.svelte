<script lang="ts">
    import {onDestroy} from "svelte";
    import {UploadEntityMessage, UploadEntityMessage_Direction} from "@workadventure/messages";
    import {mapEditorEntityUploadEventStore} from "../../../Stores/MapEditorStore";

    let files: FileList | undefined = undefined;
    let fileToUpload: File | null = null;
    let fileInput: HTMLInputElement;

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
    }

    onDestroy(() => {
        mapEditorEntityUploadEventStoreUnsubscriber();
    });
</script>

<div
    on:drop|preventDefault|stopPropagation={dropHandler}
    on:dragover|preventDefault
    class="tw-flex tw-flex-col tw-border-dotted tw-p-2 tw-rounded-md tw-items-center tw-justify-center tw-border-cyan-300"
>
    <input id="upload" class="tw-hidden" type="file" accept="image/png" bind:files bind:this={fileInput} />
    {#if fileToUpload}
        <img src={URL.createObjectURL(fileToUpload)} alt={fileToUpload.name} />
        <button on:click={processFileToUpload}>Upload</button>
        <button class="tw-text-red-500" on:click={initFileUpload}>Cancel</button>
    {:else}
        <label
            class="tw-min-w-full tw-m-0 tw-text-center hover:tw-cursor-pointer tw-text-cyan-300"
            for="upload"
            draggable="true">Upload asset</label
        >
    {/if}
</div>
