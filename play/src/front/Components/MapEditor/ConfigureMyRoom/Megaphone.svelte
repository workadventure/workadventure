<script lang="ts">
    import { fade } from "svelte/transition";
    import { get } from "svelte/store";
    import type { WorldSettings } from "@workadventure/map-editor";
    import type { MegaphoneSettings } from "@workadventure/map-editor/src/types";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { LL } from "../../../../i18n/i18n-svelte";
    import InputTags from "../../Input/InputTags.svelte";
    import PureLoader from "../../PureLoader.svelte";
    import ButtonState from "../../Input/ButtonState.svelte";
    import { executeUpdateWAMSettings } from "../../../Phaser/Game/MapEditor/Commands/Facades";
    import type { InputTagOption } from "../../Input/InputTagOption";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import SoundSelect from "../../Input/SoundSelect.svelte";
    import { resolveUrlPlaceholders } from "../../../Utils/UrlPlaceholderResolver";
    import { saveWorldSettings, worldSettingsStore } from "../../../Stores/WorldSettingsStore";
    import { DEFAULT_MEGAPHONE_NOTIFICATION_SOUND_URL, MEGAPHONE_NOTIFICATION_SOUNDS } from "./megaphoneSounds";
    import { IconInfoCircle } from "@wa-icons";

    interface SharedValues {
        audienceVideoFeedbackActivated: boolean;
        enableSoundNotifications: boolean;
        notificationSoundUrl: string;
        recordingEnabled: boolean;
        recordingRights: InputTagOption[];
    }

    const toOptions = (tags: string[]): InputTagOption[] =>
        tags.map((tag) => ({ value: tag, label: tag.toLocaleUpperCase(), created: undefined }));

    function toValues(megaphone: Partial<MegaphoneSettings> | undefined): SharedValues {
        return {
            audienceVideoFeedbackActivated: megaphone?.audienceVideoFeedbackActivated ?? false,
            enableSoundNotifications: megaphone?.enableSoundNotifications ?? true,
            notificationSoundUrl: megaphone?.notificationSoundUrl ?? DEFAULT_MEGAPHONE_NOTIFICATION_SOUND_URL,
            recordingEnabled: megaphone?.recording?.enabled ?? false,
            recordingRights: toOptions(megaphone?.recording?.rights ?? []),
        };
    }

    const scene = gameManager.getCurrentGameScene();
    const currentMegaphoneSettings = scene.wamFile?.settings?.megaphone;
    // Read once: the shared settings are saved as a whole, so without them nothing shared is shown or saved.
    const currentWorldSettings = get(worldSettingsStore);

    let enabled: boolean = $state(currentMegaphoneSettings?.enabled ?? false);
    let scope: string = $state(currentMegaphoneSettings?.scope ?? "WORLD");
    const oldRights: string[] = currentMegaphoneSettings?.rights ?? [];
    let rights: InputTagOption[] = $state(toOptions(oldRights));
    // No longer edited: kept as stored, it still names the space of a megaphone limited to this map.
    const title: string = currentMegaphoneSettings?.title ?? "MyMegaphone";

    // Auditorium, sound and recording: this map's own values with the Room scope, the world's with the World scope.
    const mapValues: SharedValues = $state(toValues(currentMegaphoneSettings));
    const worldValues: SharedValues = $state(toValues(currentWorldSettings?.megaphone));
    let shown = $derived(scope === "WORLD" ? worldValues : mapValues);
    let migrationWarnings = $state(currentWorldSettings?.migrationWarnings ?? []);

    const toWorldMegaphone = (values: SharedValues): WorldSettings["megaphone"] => ({
        audienceVideoFeedbackActivated: values.audienceVideoFeedbackActivated,
        enableSoundNotifications: values.enableSoundNotifications,
        notificationSoundUrl: values.notificationSoundUrl,
        recording: { enabled: values.recordingEnabled, rights: values.recordingRights.map((right) => right.value) },
    });
    // Only a change is written, so saving this map's rights does not overwrite another editor's shared settings.
    let savedWorldMegaphone = JSON.stringify(toWorldMegaphone(worldValues));

    let scopes = [
        {
            value: "ROOM",
            label: $LL.mapEditor.settings.megaphone.inputs.room(),
            helper: $LL.mapEditor.settings.megaphone.inputs.roomHelper(),
        },
        {
            value: "WORLD",
            label: $LL.mapEditor.settings.megaphone.inputs.world(),
            helper: $LL.mapEditor.settings.megaphone.inputs.worldHelper(),
        },
    ];
    let notificationSoundOptions = $derived(
        MEGAPHONE_NOTIFICATION_SOUNDS.some((option) => option.value === shown.notificationSoundUrl)
            ? MEGAPHONE_NOTIFICATION_SOUNDS
            : MEGAPHONE_NOTIFICATION_SOUNDS.concat([
                  {
                      value: shown.notificationSoundUrl,
                      label: $LL.mapEditor.settings.megaphone.inputs.notificationSoundCustom(),
                  },
              ]),
    );

    let loading = $state(false);

    async function save(): Promise<string> {
        if (loading) {
            throw new Error("Already loading");
        }
        try {
            loading = true;
            if (!scene.wamFile) {
                throw new Error("Error, no wam file");
            }
            await executeUpdateWAMSettings({
                $case: "updateMegaphoneSettingMessage",
                updateMegaphoneSettingMessage: {
                    settings: {
                        enabled,
                        scope,
                        title,
                        rights: rights.map((right) => right.value),
                        ...toWorldMegaphone(mapValues),
                    } satisfies MegaphoneSettings,
                },
            });

            const worldMegaphone = toWorldMegaphone(worldValues);
            const worldChanged = JSON.stringify(worldMegaphone) !== savedWorldMegaphone;
            // Saving also drops the migration warnings: it is the editor's review of them.
            if (
                enabled &&
                scope === "WORLD" &&
                currentWorldSettings &&
                (worldChanged || migrationWarnings.length > 0)
            ) {
                const connection = scene.connection;
                const worldSpace = scene.worldSpace;
                if (!connection || !worldSpace) {
                    throw new Error($LL.mapEditor.settings.megaphone.inputs.error.save.fail());
                }
                const settings: WorldSettings = { megaphone: worldMegaphone };
                await saveWorldSettings(settings, {
                    emit: (commandId, value) => connection.emitUpdateWorldSettingsMessage(commandId, value),
                    editMapCommandMessageStream: connection.editMapCommandMessageStream,
                    worldSpace,
                });
                worldSettingsStore.set(settings);
                // `loading` keeps a second save from running meanwhile.
                // eslint-disable-next-line require-atomic-updates
                savedWorldMegaphone = JSON.stringify(worldMegaphone);
                // eslint-disable-next-line require-atomic-updates
                migrationWarnings = [];
            }

            return $LL.mapEditor.settings.megaphone.inputs.error.save.success();
        } finally {
            // eslint-disable-next-line require-atomic-updates
            loading = false;
        }
    }

    let tagsPromise: Promise<InputTagOption[]> | undefined;
    function ensureTags(): Promise<InputTagOption[]> {
        tagsPromise ??= (async () => {
            const tags = ((await scene.connection?.queryRoomTags()) ?? []).concat(
                oldRights,
                currentMegaphoneSettings?.recording?.rights ?? [],
                currentWorldSettings?.megaphone?.recording?.rights ?? [],
            );
            return toOptions([...new Set(tags)]);
        })();
        return tagsPromise;
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
        <fieldset class="grid grid-cols-2 gap-2">
            <legend class="mb-2 text-sm text-white/70">{$LL.mapEditor.settings.megaphone.inputs.scope()}</legend>
            {#each scopes as option (option.value)}
                <label
                    class="flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 {scope === option.value
                        ? 'border-secondary bg-secondary/10'
                        : 'border-white/20'}"
                >
                    <span class="flex items-center gap-2 font-bold">
                        <input type="radio" name="megaphone-scope" value={option.value} bind:group={scope} />
                        {option.label}
                    </span>
                    <span class="pl-6 text-xs text-white/70">{option.helper}</span>
                </label>
            {/each}
        </fieldset>

        {#await ensureTags()}
            <PureLoader size={12} color="lighter-purple" customClass="h-full" />
        {:then tags}
            <InputTags
                label={scope === "WORLD"
                    ? $LL.mapEditor.settings.megaphone.inputs.worldRights()
                    : $LL.mapEditor.settings.megaphone.inputs.rights()}
                options={tags}
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

        <div
            class={scope === "WORLD" ? "rounded-lg border border-secondary bg-secondary/10 p-3 space-y-4" : "space-y-4"}
        >
            {#if scope === "WORLD"}
                <div>
                    <p class="font-bold">{$LL.mapEditor.settings.megaphone.world.title()}</p>
                    <p class="help-text">
                        <IconInfoCircle font-size="18" />
                        {$LL.mapEditor.settings.megaphone.world.description()}
                    </p>
                </div>
                {#if migrationWarnings.length > 0}
                    <div
                        class="rounded-lg border border-warning-800 bg-warning-900/20 p-3 text-sm space-y-1"
                        role="status"
                    >
                        <p>{$LL.mapEditor.settings.megaphone.world.migrationWarnings()}</p>
                        <ul class="list-disc pl-5">
                            {#each migrationWarnings as warning (warning)}
                                <li>{warning}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            {/if}

            {#if scope === "WORLD" && !currentWorldSettings}
                <p class="help-text text-danger-400" role="alert">
                    {$LL.mapEditor.settings.megaphone.world.loadError()}
                </p>
            {:else}
                <InputSwitch
                    id="megaphone-enable-sound-notifications-switch"
                    bind:value={shown.enableSoundNotifications}
                    label={$LL.mapEditor.settings.megaphone.inputs.enableSoundNotifications()}
                    labelPosition="right"
                    disabled={loading}
                />
                {#if shown.enableSoundNotifications}
                    <SoundSelect
                        id="megaphone-notification-sound"
                        bind:value={shown.notificationSoundUrl}
                        label={$LL.mapEditor.settings.megaphone.inputs.notificationSound()}
                        options={notificationSoundOptions}
                        getSoundUrl={(url) => (url ? resolveUrlPlaceholders(url) : "")}
                        playLabel="▶"
                        disabled={loading}
                    />
                {/if}

                <InputSwitch
                    id="megaphone-audience-video-feedback-switch"
                    bind:value={shown.audienceVideoFeedbackActivated}
                    label={shown.audienceVideoFeedbackActivated
                        ? $LL.mapEditor.settings.megaphone.inputs.audienceVideoFeedbackActivated()
                        : $LL.mapEditor.settings.megaphone.inputs.audienceVideoFeedbackActivatedDisabled()}
                    labelPosition="right"
                    disabled={loading}
                />
                <p class="help-text">
                    <IconInfoCircle font-size="18" />
                    {$LL.mapEditor.settings.megaphone.inputs.audienceVideoFeedbackActivatedHelper()}
                </p>

                <InputSwitch
                    id="megaphone-recording-switch"
                    bind:value={shown.recordingEnabled}
                    label={$LL.mapEditor.settings.megaphone.inputs.recording.enable()}
                    labelPosition="right"
                    disabled={loading}
                />
                <p class="help-text">
                    <IconInfoCircle font-size="18" />
                    {$LL.mapEditor.settings.megaphone.inputs.recording.enableHelper()}
                </p>
                {#if shown.recordingEnabled}
                    {#await ensureTags()}
                        <PureLoader size={12} color="lighter-purple" customClass="h-full" />
                    {:then tags}
                        <InputTags
                            label={$LL.mapEditor.settings.megaphone.inputs.recording.rights()}
                            options={tags}
                            bind:value={shown.recordingRights}
                            testId="megaphone-recording-rights-input"
                        />
                        <p class="help-text">
                            <IconInfoCircle font-size="18" />
                            {$LL.mapEditor.settings.megaphone.inputs.recording.rightsHelper()}
                        </p>
                    {/await}
                {/if}
            {/if}
        </div>
    </div>
{/if}
<ButtonState promise={save} initialText={$LL.menu.settings.save()} loadingText={$LL.mapEditor.settings.saving()} />
