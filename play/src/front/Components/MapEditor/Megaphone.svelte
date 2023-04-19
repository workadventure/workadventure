<script lang="ts">
    import {v4 as uuid} from "uuid";
    import { fade } from "svelte/transition";
    import {UpdateMegaphoneSettingMessage} from "@workadventure/messages";
    import {gameManager} from "../../Phaser/Game/GameManager";
    import {onMapEditorInputFocus, onMapEditorInputUnfocus} from "../../Stores/MapEditorStore";
    import LL from "../../../i18n/i18n-svelte";
    import InputText from "../Input/InputText.svelte";
    import InputSelect from "../Input/InputSelect.svelte";
    import InputTags from "../Input/InputTags.svelte";

    let enabled: boolean = gameManager.getCurrentGameScene().wamFile?.settings?.megaphone?.enabled ?? false;

    let rights: string[] = gameManager.getCurrentGameScene().wamFile?.settings?.megaphone?.rights ?? [];
    let title: string = gameManager.getCurrentGameScene().wamFile?.settings?.megaphone?.title ?? "";
    let scope: string = gameManager.getCurrentGameScene().wamFile?.settings?.megaphone?.scope ?? "WORLD";
    let scopes = [{value:"WORLD",label:"World"},{value:"ROOM",label:"Room"}];

    let error = {
        title: ""
    }

    function partialSave(){
        if(!enabled) {
            gameManager.getCurrentGameScene().connection?.emitUpdateMegaphoneSettingMessage(uuid(), UpdateMegaphoneSettingMessage.fromJSON({
                enabled
            }));
        }
    }

    function save(){
        if(!title) {
            error.title = "Please enter a title";
            return;
        } else {
            error.title = "";
        }
        gameManager.getCurrentGameScene().connection?.emitUpdateMegaphoneSettingMessage(uuid(), {
            enabled,
            scope,
            title,
            rights
        });
    }

    async function getTags() {
        return (await gameManager.getCurrentGameScene().connection?.queryRoomTags() ?? []).map(tag => ({value: tag, label: tag}));
    }
</script>


<div class="tw-flex tw-flex-wrap tw-gap-x-4 tw-items-center">
    <input type="checkbox" class="input-switch" bind:checked={enabled} on:change={partialSave}/>
    <h3>Megaphone</h3>
</div>
<p>Lorem ipsum dolor sit amet.Lorem ipsum dolor sit amet.Lorem ipsum dolor sit amet.Lorem ipsum dolor sit amet.Lorem ipsum dolor sit amet.</p>

{#if enabled}
    <div class="settings" transition:fade={{ duration: 200 }}>
        <InputText errorHelperText={error.title} label="Name of the space" placeHolder="MySpace" bind:value={title} onKeyPress={() => error.title = ""} onFocus={onMapEditorInputFocus} onBlur={onMapEditorInputUnfocus}/>
        <InputSelect label="Scope" options={scopes} bind:value={scope}/>
        {#await getTags()}
            loading
            <button type="button" class="light tw-mx-auto tw-mt-5" disabled={true}>{$LL.menu.settings.save.button()}</button>
        {:then tags}
            <InputTags label="Rights" options={tags ?? []} bind:value={rights} onFocus={onMapEditorInputFocus} onBlur={onMapEditorInputUnfocus}/>
            <button type="button" class="light tw-mx-auto tw-mt-5" on:click={save}>{$LL.menu.settings.save.button()}</button>
        {:catch error}
            <p>{error}</p>
        {/await}
    </div>

{/if}

<style lang="scss">
    p{
        @apply tw-text-sm tw-text-lighter-purple tw-m-0;
    }
</style>