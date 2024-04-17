<script lang="ts">
    import { closeModal } from "svelte-modals";
    import PopupGeneric from "../Modal/PopupGeneric.svelte";
    import LL from "../../../i18n/i18n-svelte";


    export let isOpen:boolean;
    export let onDeleteEntities: () => void;
    export let onKeepEntities: () => void;
    export let onCancel: () => void;


</script>

<PopupGeneric {isOpen}>
    <h1 slot="title">{$LL.mapEditor.areaEditor.actionPopupOnPersonalAreaWithEntities.title()}</h1>
    <div slot="content"
         class="tw-whitespace-nowrap">{$LL.mapEditor.areaEditor.actionPopupOnPersonalAreaWithEntities.description()}</div>
    <div slot="action" class="tw-flex">
        <button
            on:click={()=>{onDeleteEntities();closeModal()}}>{$LL.mapEditor.areaEditor.actionPopupOnPersonalAreaWithEntities.buttons.remove()}</button>
        <button
            on:click={()=>{onKeepEntities();closeModal()}}>{$LL.mapEditor.areaEditor.actionPopupOnPersonalAreaWithEntities.buttons.keep()}</button>
        <button
            on:click={()=>{onCancel();closeModal()}}>{$LL.mapEditor.areaEditor.actionPopupOnPersonalAreaWithEntities.buttons.cancel()}</button>
    </div>
</PopupGeneric>
