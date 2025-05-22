<script lang="ts">
    import { onMount } from "svelte";
    import { writable } from "svelte/store";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import InputTags from "../../Input/InputTags.svelte";
    import { UpdateWAMMetadataFrontCommand } from "../../../Phaser/Game/MapEditor/Commands/WAM/UpdateWAMMetadataFrontCommand";
    import ButtonState from "../../Input/ButtonState.svelte";
    import { InputTagOption } from "../../Input/InputTagOption";
    import Input from "../../Input/Input.svelte";
    import InputCheckbox from "../../Input/InputCheckbox.svelte";
    import TextArea from "../../Input/TextArea.svelte";
    import { IconInfoCircle } from "@wa-icons";

    let dynamicStrings = {
        error: {
            name: false,
            confirmSave: false,
        },
    };
    let name = "";
    let description = "";
    let thumbnail = "";
    let copyright = "";
    let tags: InputTagOption[] = [];
    let _tag: InputTagOption[] = [
        {
            value: "member",
            label: "member",
            created: false,
        },
        {
            value: "admin",
            label: "admin",
            created: false,
        },
    ];

    let confirmSaving = writable<boolean>(false);

    onMount(() => {
        name = gameManager.getCurrentGameScene()?.wamFile?.metadata?.name ?? "";
        description = gameManager.getCurrentGameScene()?.wamFile?.metadata?.description ?? "";
        thumbnail = gameManager.getCurrentGameScene()?.wamFile?.metadata?.thumbnail ?? "";
        copyright = gameManager.getCurrentGameScene()?.wamFile?.metadata?.copyright ?? "";
        (gameManager.getCurrentGameScene()?.wamFile?.vendor as { tags: string[] })?.tags?.forEach((tag) => {
            tags.push({ value: tag, label: tag, created: false });
            _tag.push({ value: tag, label: tag, created: false });
        });
    });

    async function save(): Promise<string> {
        if (!name) {
            dynamicStrings.error.name = true;
            return Promise.reject(new Error("You must enter a name"));
        }
        if (!$confirmSaving) {
            dynamicStrings.error.confirmSave = true;
            return Promise.reject(new Error("You must confirm saving"));
        }
        try {
            dynamicStrings.error.confirmSave = false;
            dynamicStrings.error.name = false;

            const roomConnection = gameManager.getCurrentGameScene()?.connection;
            if (roomConnection == undefined) throw new Error("No connection");
            new UpdateWAMMetadataFrontCommand({
                name,
                description,
                thumbnail,
                copyright,
                tags: tags != undefined && tags.length > 1 ? tags.map((tag) => tag.value).join(",") : undefined,
            }).emitEvent(roomConnection);
            return Promise.resolve($LL.mapEditor.settings.room.actions.success());
        } catch (e) {
            console.error(e);
            return Promise.reject(new Error($LL.mapEditor.settings.room.actions.error()));
        }
    }
</script>

<div class="flex flex-col">
    <h3 style="color: white;">{$LL.mapEditor.settings.room.title()}</h3>
    <Input
        type="text"
        label={$LL.mapEditor.settings.room.inputs.name()}
        placeholder="MySpace"
        bind:value={name}
        onKeyPress={() => (dynamicStrings.error.name = false)}
        onerror={() => {
            dynamicStrings.error.name = true;
        }}
    />

    <p class="help-text">
        <IconInfoCircle font-size="18" />
        {$LL.mapEditor.settings.room.helps.description()}
    </p>
    <TextArea
        label={$LL.mapEditor.settings.room.inputs.description()}
        placeHolder="MySpace"
        bind:value={description}
        onKeyPress={() => {}}
    />
    <p class="help-text">
        <IconInfoCircle font-size="18" />
        {$LL.mapEditor.settings.room.helps.tags()}
    </p>
    <InputTags label={$LL.mapEditor.settings.room.inputs.tags()} options={_tag} bind:value={tags} />
    <p class="help-text">
        <IconInfoCircle font-size="18" />
        {$LL.mapEditor.settings.room.helps.copyright()}
    </p>
    <TextArea
        label={$LL.mapEditor.settings.room.inputs.copyright()}
        placeHolder="MySpace"
        bind:value={copyright}
        onKeyPress={() => {}}
    />

    <div class="flex flex-row justify-center mt-4">
        <div class="ml-2" class:text-danger-1000={dynamicStrings.error.confirmSave}>
            <InputCheckbox
                label={$LL.mapEditor.settings.room.confirmSave()}
                id="confirm-save"
                bind:value={$confirmSaving}
            />
        </div>
    </div>

    <div class="flex flex-row justify-center cursor-pointer ">
        <ButtonState promise={save} initialText={$LL.menu.settings.save()} loadingText="Saving" />
    </div>
</div>
