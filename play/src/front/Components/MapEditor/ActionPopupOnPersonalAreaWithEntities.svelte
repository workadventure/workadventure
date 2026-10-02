<script lang="ts">
    import PopupGeneric from "../Modal/Popup.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { modals } from "@wa-modals";

    interface Props {
        isOpen: boolean;
        onDeleteEntities: () => void;
        onKeepEntities: () => void;
        onCancel: () => void;
    }

    let { isOpen, onDeleteEntities, onKeepEntities, onCancel }: Props = $props();
</script>

<PopupGeneric {isOpen}>
    {#snippet title()}
        <h1>{$LL.mapEditor.areaEditor.actionPopupOnPersonalAreaWithEntities.title()}</h1>
    {/snippet}
    {#snippet content()}
        <div class="whitespace-nowrap">
            {$LL.mapEditor.areaEditor.actionPopupOnPersonalAreaWithEntities.description()}
        </div>
    {/snippet}
    {#snippet action()}
        <button
            onclick={() => {
                onDeleteEntities();
                modals.close();
            }}>{$LL.mapEditor.areaEditor.actionPopupOnPersonalAreaWithEntities.buttons.remove()}</button
        >
        <button
            onclick={() => {
                onKeepEntities();
                modals.close();
            }}>{$LL.mapEditor.areaEditor.actionPopupOnPersonalAreaWithEntities.buttons.keep()}</button
        >
        <button
            onclick={() => {
                onCancel();
                modals.close();
            }}>{$LL.mapEditor.areaEditor.actionPopupOnPersonalAreaWithEntities.buttons.cancel()}</button
        >
    {/snippet}
</PopupGeneric>
