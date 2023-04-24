<script lang="ts">
    import { v4 as uuid } from "uuid";
    import { fade } from "svelte/transition";
    import { UpdateMegaphoneSettingMessage } from "@workadventure/messages";
    import { InfoIcon } from "svelte-feather-icons";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { onMapEditorInputFocus, onMapEditorInputUnfocus } from "../../../Stores/MapEditorStore";
    import LL from "../../../../i18n/i18n-svelte";
    import InputText from "../../Input/InputText.svelte";
    import InputSelect from "../../Input/InputSelect.svelte";
    import InputTags from "../../Input/InputTags.svelte";
    import PureLoader from "../../PureLoader.svelte";
    import ButtonState from "../../Input/ButtonState.svelte";

    type Option = {
        value: string;
        label: string;
        created: undefined | boolean;
    };

    let enabled: boolean = gameManager.getCurrentGameScene().wamFile?.settings?.megaphone?.enabled ?? false;
    const oldRights: string[] = gameManager.getCurrentGameScene().wamFile?.settings?.megaphone?.rights ?? [];
    let rights: Option[] = [];
    let title: string = gameManager.getCurrentGameScene().wamFile?.settings?.megaphone?.title ?? "";
    let scope: string = gameManager.getCurrentGameScene().wamFile?.settings?.megaphone?.scope ?? "WORLD";
    let scopes = [
        { value: "WORLD", label: $LL.mapEditor.settings.megaphone.inputs.world() },
        { value: "ROOM", label: $LL.mapEditor.settings.megaphone.inputs.room() },
    ];

    let loading = false;

    let dynamicStrings = {
        error: {
            title: "",
        },
    };

    function partialSave() {
        if (!enabled) {
            loading = true;
            gameManager.getCurrentGameScene().connection?.emitUpdateMegaphoneSettingMessage(
                uuid(),
                UpdateMegaphoneSettingMessage.fromJSON({
                    enabled,
                })
            );
            loading = false;
        }
    }

    function save(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (loading) return;
            loading = true;
            if (!title) {
                dynamicStrings.error.title = "Please enter a title";
                reject("Something went wrong !");
            } else {
                dynamicStrings.error.title = "";
            }
            gameManager.getCurrentGameScene().connection?.emitUpdateMegaphoneSettingMessage(uuid(), {
                enabled,
                scope,
                title,
                rights: rights.map((right) => right.value),
            });
            loading = false;
            resolve("Successfully saved !");
        });
    }

    async function getTags(): Promise<Option[]> {
        loading = true;
        rights = oldRights.map((right) => ({ value: right, label: right.toLocaleUpperCase(), created: undefined }));
        const _tags = ((await gameManager.getCurrentGameScene().connection?.queryRoomTags()) ?? []).concat(
            oldRights ?? []
        );
        loading = false;
        return _tags
            .filter((item, index) => _tags.indexOf(item) === index)
            .map((tag) => ({ value: tag, label: tag.toLocaleUpperCase(), created: undefined }));
    }
</script>

<div class="tw-flex tw-flex-wrap tw-gap-x-4 tw-items-center tw-h-fit">
    <input type="checkbox" class="input-switch" bind:checked={enabled} on:change={partialSave} disabled={loading} />
    <h3>{$LL.mapEditor.settings.megaphone.title()}</h3>
</div>
<p class="tw-h-fit">{$LL.mapEditor.settings.megaphone.description()}</p>
{#if enabled}
    <div class="settings tw-flex-grow tw-flex-auto tw-flex-shrink" transition:fade={{ duration: 200 }}>
        {#await getTags()}
            <PureLoader size={12} color="lighter-purple" customClass="tw-h-full" />
        {:then tags}
            <InputText
                errorHelperText={dynamicStrings.error.title}
                label={$LL.mapEditor.settings.megaphone.inputs.spaceName()}
                placeHolder="MySpace"
                bind:value={title}
                onKeyPress={() => (dynamicStrings.error.title = "")}
                onFocus={onMapEditorInputFocus}
                onBlur={onMapEditorInputUnfocus}
            />
            <InputSelect label={$LL.mapEditor.settings.megaphone.inputs.scope()} options={scopes} bind:value={scope} />
            <p><InfoIcon size="18" /> {$LL.mapEditor.settings.megaphone.inputs.spaceNameHelper()}</p>
            <InputTags
                label={$LL.mapEditor.settings.megaphone.inputs.rights()}
                options={tags ?? []}
                bind:value={rights}
                onFocus={onMapEditorInputFocus}
                onBlur={onMapEditorInputUnfocus}
            />
            <p><InfoIcon size="18" /> {$LL.mapEditor.settings.megaphone.inputs.rightsHelper()}</p>
            <ButtonState promise={save} initialText={$LL.menu.settings.save.button()} loadingText="Saving" />
        {:catch error}
            <p>{error}</p>
        {/await}
    </div>
{/if}

<style lang="scss">
    p {
        @apply tw-text-sm tw-text-lighter-purple tw-m-0;
        &.success {
            @apply tw-text-pop-green tw-text-center;
        }
    }
</style>
