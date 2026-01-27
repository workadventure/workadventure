<script lang="ts">
    import { UpdateRecordingSettingMessage } from "@workadventure/messages";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { LL } from "../../../../i18n/i18n-svelte";
    import InputTags from "../../Input/InputTags.svelte";
    import PureLoader from "../../PureLoader.svelte";
    import type { InputTagOption } from "../../Input/InputTagOption";
    import ButtonState from "../../Input/ButtonState.svelte";
    import { executeUpdateWAMSettings } from "../../../Phaser/Game/MapEditor/Commands/Facades";
    import { IconInfoCircle } from "@wa-icons";

    const oldRights: string[] = gameManager.getCurrentGameScene().wamFile?.settings?.recording?.rights ?? [];
    let rights: InputTagOption[] = [];
    let loading = false;

    async function getTags(): Promise<InputTagOption[]> {
        loading = true;
        rights = oldRights.map((right) => ({ value: right, label: right.toLocaleUpperCase(), created: undefined }));
        const tags = ((await gameManager.getCurrentGameScene().connection?.queryRoomTags()) ?? []).concat(
            oldRights ?? []
        );
        loading = false;
        return tags
            .filter((item, index) => tags.indexOf(item) === index)
            .map((tag) => ({ value: tag, label: tag.toLocaleUpperCase(), created: undefined }));
    }

    async function save(): Promise<string> {
        if (loading) {
            throw new Error("Already loading");
        }
        try {
            loading = true;
            await executeUpdateWAMSettings({
                $case: "updateRecordingSettingMessage",
                updateRecordingSettingMessage: UpdateRecordingSettingMessage.fromJSON({
                    rights: (rights || []).map((right) => right.value),
                }),
            });
            return $LL.mapEditor.settings.recording.inputs.error.save.success();
        } catch (error) {
            console.error(error);
            throw new Error($LL.mapEditor.settings.recording.inputs.error.save.fail(), { cause: error });
        } finally {
            // eslint-disable-next-line require-atomic-updates
            loading = false;
        }
    }
</script>

<div class="flex flex-wrap gap-x-4 items-center h-fit">
    <h3 id="recording" style="color: white;">{$LL.mapEditor.settings.recording.title()}</h3>
</div>

<p class="help-text">
    <IconInfoCircle font-size="18" />
    {$LL.mapEditor.settings.recording.description()}
</p>

<div class="settings space-y-4 flex-grow flex-auto flex-shrink">
    {#await getTags()}
        <PureLoader size={12} color="lighter-purple" customClass="h-full" />
    {:then tags}
        <InputTags label={$LL.mapEditor.settings.recording.inputs.rights()} options={tags ?? []} bind:value={rights} />
        <p class="help-text">
            <IconInfoCircle font-size="18" />
            {$LL.mapEditor.settings.recording.inputs.rightsHelper()}
        </p>
        <ButtonState promise={save} initialText={$LL.menu.settings.save()} loadingText="Saving" />
    {:catch error}
        <p class="help-text text-danger-800">
            <IconInfoCircle font-size="18" />
            {error}
        </p>
    {/await}
</div>
