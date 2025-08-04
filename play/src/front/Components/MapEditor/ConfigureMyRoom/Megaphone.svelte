<script lang="ts">
    import { fade } from "svelte/transition";
    import { UpdateMegaphoneSettingMessage } from "@workadventure/messages";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import Select from "../../Input/Select.svelte";
    import InputTags from "../../Input/InputTags.svelte";
    import PureLoader from "../../PureLoader.svelte";
    import ButtonState from "../../Input/ButtonState.svelte";
    import { executeUpdateWAMSettings } from "../../../Phaser/Game/MapEditor/Commands/Facades";
    import { InputTagOption } from "../../Input/InputTagOption";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import { IconInfoCircle } from "@wa-icons";

    let enabled: boolean = gameManager.getCurrentGameScene().wamFile?.settings?.megaphone?.enabled ?? false;
    const oldRights: string[] = gameManager.getCurrentGameScene().wamFile?.settings?.megaphone?.rights ?? [];
    let rights: InputTagOption[] = [];
    let title: string = gameManager.getCurrentGameScene().wamFile?.settings?.megaphone?.title ?? "MyMegaphone";
    let scope: string = gameManager.getCurrentGameScene().wamFile?.settings?.megaphone?.scope ?? "WORLD";
    let scopes = [
        { value: "ROOM", label: $LL.mapEditor.settings.megaphone.inputs.room() },
        { value: "WORLD", label: $LL.mapEditor.settings.megaphone.inputs.world() },
    ];

    let loading = false;

    let dynamicStrings = {
        error: {
            title: "",
        },
    };

    async function partialSave() {
        if (!enabled) {
            loading = true;
            await executeUpdateWAMSettings({
                $case: "updateMegaphoneSettingMessage",
                updateMegaphoneSettingMessage: UpdateMegaphoneSettingMessage.fromJSON({
                    enabled,
                }),
            });
            loading = false;
        }
    }

    async function save(): Promise<string> {
        if (loading) {
            throw new Error("Already loading");
        }
        try {
            loading = true;
            if (!title) {
                dynamicStrings.error.title = $LL.mapEditor.settings.megaphone.inputs.error.title();
                throw new Error($LL.mapEditor.settings.megaphone.inputs.error.save.fail());
            } else {
                dynamicStrings.error.title = "";
            }

            const wamFile = gameManager.getCurrentGameScene().getGameMap().getWam();
            if (!wamFile) {
                throw new Error("Error, no wam file");
            }
            await executeUpdateWAMSettings({
                $case: "updateMegaphoneSettingMessage",
                updateMegaphoneSettingMessage: UpdateMegaphoneSettingMessage.fromJSON({
                    enabled,
                    scope,
                    title,
                    rights: (rights || []).map((right) => right.value),
                }),
            });

            return $LL.mapEditor.settings.megaphone.inputs.error.save.success();
        } finally {
            // eslint-disable-next-line require-atomic-updates
            loading = false;
        }
    }

    async function getTags(): Promise<InputTagOption[]> {
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

<div class="flex flex-wrap gap-x-4 items-center h-fit">
    <InputSwitch id="megaphone-switch" bind:value={enabled} onChange={partialSave} disabled={loading} />
    <h3 id="megaphone" style="color: white;">{$LL.mapEditor.settings.megaphone.title()}</h3>
</div>

<p class="help-text">
    <IconInfoCircle font-size="18" />
    {$LL.mapEditor.settings.megaphone.description()}
</p>
{#if enabled}
    <div class="settings space-y-4 flex-grow flex-auto flex-shrink" transition:fade={{ duration: 200 }}>
        {#await getTags()}
            <PureLoader size={12} color="lighter-purple" customClass="h-full" />
        {:then tags}
            <Input
                errorHelperText={dynamicStrings.error.title}
                label={$LL.mapEditor.settings.megaphone.inputs.spaceName()}
                placeholder="MySpace"
                bind:value={title}
                onKeyPress={() => (dynamicStrings.error.title = "")}
            />

            <Select label={$LL.mapEditor.settings.megaphone.inputs.scope()} options={scopes} bind:value={scope} />

            <p class="help-text">
                <IconInfoCircle font-size="18" />
                {$LL.mapEditor.settings.megaphone.inputs.spaceNameHelper()}
            </p>
            <InputTags
                label={$LL.mapEditor.settings.megaphone.inputs.rights()}
                options={tags ?? []}
                bind:value={rights}
            />
            <p class="help-text">
                <IconInfoCircle font-size="18" />
                {$LL.mapEditor.settings.megaphone.inputs.rightsHelper()}
            </p>
            <ButtonState promise={save} initialText={$LL.menu.settings.save()} loadingText="Saving" />
        {:catch error}
            <p class="help-text text-danger-800">
                <IconInfoCircle font-size="18" />
                {error}
            </p>
        {/await}
    </div>
{/if}
