<script lang="ts">
    import { onMount } from "svelte";
    import { writable, get } from "svelte/store";

    import ToggleSwitch from "~/lib/ToggleSwitch.svelte";
    import InputField from "~/lib/InputField.svelte";
    import KeyRecord from "~/lib/KeyRecord.svelte";
    import { api, SettingsData } from "../lib/ipc";

    type ShortCuts = Record<"mute_toggle" | "camera_toggle", string>;

    const shortCuts = writable<ShortCuts>({
        mute_toggle: "",
                camera_toggle: "",
    });

    onMount(async () => {
        const newShortCuts = await api.getSettings()?.["shortcuts"];
        shortCuts.set({
            ...get(shortCuts),
            ...newShortCuts,
        });
    });

    async function saveShortcut(key: keyof SettingsData['shortcuts'], value: string) {
        shortCuts.update((shortCuts) => ({
            ...shortCuts,
            [key]: value,
        }));
        await api.saveSetting('shortcuts', get(shortCuts));
    }
</script>

<div class="flex flex-col w-full h-full justify-center items-center">
    <h1 class="text-gray-200 text-2xl mb-6">Settings</h1>

    <div class="flex flex-col justify-start max-w-152">
        {#if $shortCuts}
            <InputField
                id="toggle-camera"
                title="Toggle Mute"
                description="Set a shortcut to turn your microphone on and off"
            >
                <KeyRecord
                    id="toggle-mute"
                    value={$shortCuts.mute_toggle}
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
                    value={$shortCuts.camera_toggle}
                    on:change={(e) => saveShortcut("camera_toggle", e.detail)}
                />
            </InputField>
        {/if}

        <InputField id="toggle-autostart" title="Toggle autostart">
            <ToggleSwitch
                id="toggle-autostart"
                value={true}
                title="Autostart WorkAdventure after your PC started"
                on:change={(e) => {}}
            />
        </InputField>
    </div>
</div>
