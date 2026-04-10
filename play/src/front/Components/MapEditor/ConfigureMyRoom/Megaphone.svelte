<script lang="ts">
    import { fade } from "svelte/transition";

    import type { MegaphoneSettings } from "@workadventure/map-editor/src/types";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import Select from "../../Input/Select.svelte";
    import InputTags from "../../Input/InputTags.svelte";
    import PureLoader from "../../PureLoader.svelte";
    import ButtonState from "../../Input/ButtonState.svelte";
    import { executeUpdateWAMSettings } from "../../../Phaser/Game/MapEditor/Commands/Facades";
    import type { InputTagOption } from "../../Input/InputTagOption";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import SoundSelect from "../../Input/SoundSelect.svelte";
    import { resolveUrlPlaceholders } from "../../../Utils/UrlPlaceholderResolver";
    import { IconInfoCircle } from "@wa-icons";
    const DEFAULT_MEGAPHONE_NOTIFICATION_SOUND_URL = "/resources/objects/megaphone/megaphone1.mp3";

    const currentMegaphoneSettings = gameManager.getCurrentGameScene().wamFile?.settings?.megaphone;

    let enabled: boolean = currentMegaphoneSettings?.enabled ?? false;
    const oldRights: string[] = currentMegaphoneSettings?.rights ?? [];
    let rights: InputTagOption[] = [];
    let title: string = currentMegaphoneSettings?.title ?? "MyMegaphone";
    let scope: string = currentMegaphoneSettings?.scope ?? "WORLD";
    let enableSoundNotifications: boolean = currentMegaphoneSettings?.enableSoundNotifications ?? true;
    let notificationSoundUrl: string =
        currentMegaphoneSettings?.notificationSoundUrl ?? DEFAULT_MEGAPHONE_NOTIFICATION_SOUND_URL;
    let scopes = [
        { value: "ROOM", label: $LL.mapEditor.settings.megaphone.inputs.room() },
        { value: "WORLD", label: $LL.mapEditor.settings.megaphone.inputs.world() },
    ];
    const baseNotificationSoundOptions = [
        { value: "/resources/objects/megaphone/megaphone1.mp3", label: "Megaphone 1" },
        { value: "/resources/objects/megaphone/megaphone2.mp3", label: "Megaphone 2" },
        { value: "/resources/objects/megaphone/megaphone3.mp3", label: "Megaphone 3" },
        { value: "/resources/objects/megaphone/megaphone4.mp3", label: "Megaphone 4" },
        { value: "/resources/objects/megaphone/megaphone5.mp3", label: "Megaphone 5" },
        { value: "/resources/objects/megaphone/megaphone6.mp3", label: "Megaphone 6" },
        { value: "/resources/objects/megaphone/megaphone7.mp3", label: "Megaphone 7" },
        { value: "/resources/objects/megaphone/megaphone8.mp3", label: "Megaphone 8" },
    ];
    const hasCustomNotificationSound = !baseNotificationSoundOptions.some(
        (option) => option.value === notificationSoundUrl
    );
    let notificationSoundOptions = hasCustomNotificationSound
        ? baseNotificationSoundOptions.concat([
              { value: notificationSoundUrl, label: $LL.mapEditor.settings.megaphone.inputs.notificationSoundCustom() },
          ])
        : baseNotificationSoundOptions;

    let audienceVideoFeedbackActivated: boolean =
        gameManager.getCurrentGameScene().wamFile?.settings?.megaphone?.audienceVideoFeedbackActivated ?? false;

    let loading = false;

    let dynamicStrings = {
        error: {
            title: "",
        },
    };

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

            const wamFile = gameManager.getCurrentGameScene().wamFile;
            if (!wamFile) {
                throw new Error("Error, no wam file");
            }
            await executeUpdateWAMSettings({
                $case: "updateMegaphoneSettingMessage",
                updateMegaphoneSettingMessage: {
                    settings: {
                        enabled,
                        scope,
                        title,
                        rights: (rights || []).map((right) => right.value),
                        audienceVideoFeedbackActivated: audienceVideoFeedbackActivated,
                        notificationSoundUrl,
                        enableSoundNotifications,
                    } satisfies MegaphoneSettings,
                },
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

    function resolveNotificationSoundUrl(rawUrl: string): string {
        return resolveUrlPlaceholders(rawUrl);
    }

    function getMegaphoneSoundUrl(selectedSound: string): string {
        if (!selectedSound) {
            return "";
        }
        return resolveNotificationSoundUrl(selectedSound);
    }
</script>

<div class="flex flex-wrap gap-x-4 items-center h-fit">
    <InputSwitch id="megaphone-switch" bind:value={enabled} disabled={loading} />
    <h3 id="megaphone" style="color: white;">{$LL.mapEditor.settings.megaphone.title()}</h3>
</div>

<p class="help-text">
    <IconInfoCircle font-size="18" />
    {$LL.mapEditor.settings.megaphone.description()}
</p>
{#if enabled}
    <div class="settings space-y-4 flex-grow flex-auto flex-shrink" transition:fade={{ duration: 200 }}>
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
        <div class="flex flex-wrap gap-x-4 items-center h-fit">
            <InputSwitch
                id="megaphone-enable-sound-notifications-switch"
                bind:value={enableSoundNotifications}
                disabled={loading}
            />
            <label
                for="megaphone-enable-sound-notifications-switch"
                class="text-white font-regular peer-checked:text-white"
            >
                {$LL.mapEditor.settings.megaphone.inputs.enableSoundNotifications()}
            </label>
        </div>
        {#if enableSoundNotifications}
            <SoundSelect
                id="megaphone-notification-sound"
                bind:value={notificationSoundUrl}
                label={$LL.mapEditor.settings.megaphone.inputs.notificationSound()}
                options={notificationSoundOptions}
                getSoundUrl={getMegaphoneSoundUrl}
                playLabel="▶"
                disabled={loading}
            />
        {/if}
        {#await getTags()}
            <PureLoader size={12} color="lighter-purple" customClass="h-full" />
        {:then tags}
            <InputTags
                label={$LL.mapEditor.settings.megaphone.inputs.rights()}
                options={tags ?? []}
                bind:value={rights}
            />
            <p class="help-text">
                <IconInfoCircle font-size="18" />
                {$LL.mapEditor.settings.megaphone.inputs.rightsHelper()}
            </p>
        {:catch error}
            <p class="help-text text-danger-800">
                <IconInfoCircle font-size="18" />
                {error}
            </p>
        {/await}
        <div class="flex flex-wrap gap-x-4 items-center h-fit">
            <InputSwitch
                id="megaphone-audience-video-feedback-switch"
                bind:value={audienceVideoFeedbackActivated}
                disabled={loading}
            />
            <label
                for="megaphone-audience-video-feedback-switch"
                class="text-white font-regular peer-checked:text-white"
            >
                {#if audienceVideoFeedbackActivated}
                    {$LL.mapEditor.settings.megaphone.inputs.audienceVideoFeedbackActivated()}
                {:else}
                    {$LL.mapEditor.settings.megaphone.inputs.audienceVideoFeedbackActivatedDisabled()}
                {/if}
            </label>
        </div>
        <p class="help-text">
            <IconInfoCircle font-size="18" />
            {$LL.mapEditor.settings.megaphone.inputs.audienceVideoFeedbackActivatedHelper()}
        </p>
    </div>
{/if}
<ButtonState promise={save} initialText={$LL.menu.settings.save()} loadingText="Saving" />
