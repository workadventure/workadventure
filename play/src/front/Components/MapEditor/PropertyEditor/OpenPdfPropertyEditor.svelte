<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { OpenPdfPropertyData } from "@workadventure/map-editor";
    import { UploadFileMessage } from "@workadventure/messages";
    import { v4 as uuidv4 } from "uuid";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { UploadFileFrontCommand } from "../../../Phaser/Game/MapEditor/Commands/File/UploadFileFrontCommand";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    import FileUpload from "./FileUpload/FileUpload.svelte";

    const dispatch = createEventDispatcher();

    export let property: OpenPdfPropertyData;

    let selectedFile: File | null = null;
    let fileToUpload: UploadFileMessage | undefined = undefined;
    let files: FileList | undefined = undefined;

    async function handleFileChange(event: Event) {
        console.log("porperty", property);
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            selectedFile = target.files[0];
            console.log("Fichier sélectionné :", selectedFile.name);
        } else {
            return;
        }

        // Send file somewhere
        const formData = new FormData();
        formData.append("file", selectedFile);

        if (selectedFile) {
            const fileBuffer = await selectedFile.arrayBuffer();
            const fileAsUint8Array = new Uint8Array(fileBuffer);
            const generatedId = uuidv4();
            fileToUpload = {
                id: generatedId,
                file: fileAsUint8Array,
                name: "test",
                propertyId: property.id,
            };

            const roomConnection = gameManager.getCurrentGameScene()?.connection;
            if (roomConnection === undefined) throw new Error("No connection");
            const uploadFileCommand = new UploadFileFrontCommand(fileToUpload);
            uploadFileCommand.emitEvent(roomConnection);
        }

        property.link = "https://workadventure.com";
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">
        <img
            class="tw-w-6 tw-mr-1"
            src="resources/icons/icon_start.png"
            alt={$LL.mapEditor.properties.startProperties.description()}
        />
        {$LL.mapEditor.properties.openPdfProperties.label()}
    </span>

    <span slot="content">
        <input type="file" accept=".pdf" on:change={handleFileChange} />

        {#if selectedFile}
            <p>Fichier sélectionné : {selectedFile.name}</p>
        {/if}

        <FileUpload {files} />
    </span>
</PropertyEditorBase>
