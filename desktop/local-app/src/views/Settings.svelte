<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { writable, get } from "svelte/store";

    import ToggleSwitch from "~/lib/ToggleSwitch.svelte";
    import InputField from "~/lib/InputField.svelte";
    import KeyRecord from "~/lib/KeyRecord.svelte";
    import { api, SettingsData } from "../lib/ipc";

    const settings = writable<SettingsData | undefined>();

    onMount(async () => {
        await api.setShortcutsEnabled(false);
        $settings = await api.getSettings();
    });

    onDestroy(async () => {
        await api.setShortcutsEnabled(true);
    });

    async function saveShortcut(key: keyof SettingsData["shortcuts"], value: string) {
        const shortcuts = get(settings)["shortcuts"];
        shortcuts[key] = value;
        settings.update((s) => ({ ...s, shortcuts }));
        await api.saveSetting("shortcuts", shortcuts);
    }

    async function saveAutoLaunch(auto_launch_enabled: boolean) {
        settings.update((s) => ({ ...s, auto_launch_enabled }));
        await api.saveSetting("auto_launch_enabled", auto_launch_enabled);
    }
</script>

<div class="flex flex-col w-full h-full justify-center items-center">
    <h1 class="text-gray-200 text-2xl mb-6">Settings</h1>

    <div class="flex flex-col justify-start max-w-148">
        {#if $settings}
            <InputField
                id="toggle-camera"
                title="Toggle Mute"
                description="Set a shortcut to turn your microphone on and off"
            >
                <KeyRecord
                    id="toggle-mute"
                    value={$settings.shortcuts.mute_toggle}
                    on:change={(e) => saveShortcut("mute_toggle", e.detail)}
                />
            </InputField>

            <InputField
                id="toggle-camera"
                title="Toggle Camera"
                description="Set a shortcut to turn your camera on and off"
            >
                <KeyRecord
                    id="toggle-camera"
                    value={$settings.shortcuts.camera_toggle}
                    on:change={(e) => saveShortcut("camera_toggle", e.detail)}
                />
            </InputField>

            <InputField id="toggle-autostart" title="Toggle autostart">
                <ToggleSwitch
                    id="toggle-autostart"
                    value={$settings.auto_launch_enabled}
                    title="Autostart WorkAdventure after your PC started"
                    on:change={(e) => saveAutoLaunch(e.detail)}
                />
            </InputField>

            <span class="mt-8 text-xs text-gray-200 max-w-128">Hint: Shortcuts are disabled while seeing this page</span
            >
        {/if}
    </div>
</div>
