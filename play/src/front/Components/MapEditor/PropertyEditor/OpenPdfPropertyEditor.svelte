<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { OpenPdfPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    const dispatch = createEventDispatcher();

    export let property: OpenPdfPropertyData;

    let selectedFile: File | null = null;

    function handleFileChange(event: Event) {
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
    </span>
</PropertyEditorBase>
