<script lang="ts">
    import { onMount } from "svelte";
    import { writable } from "svelte/store";

    import ToggleSwitch from "~/lib/ToggleSwitch.svelte";
    import InputField from "~/lib/InputField.svelte";
    import KeyRecord from "~/lib/KeyRecord.svelte";

    const shortCuts = writable<Record<string, string> | undefined>({});

    onMount(async () => {
        shortCuts.set(await window?.WorkAdventureDesktopApi?.getShortcuts());
    });

    async function saveShortcut(key: string, value: string) {
        await window?.WorkAdventureDesktopApi?.saveShortcut(key, value);
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
