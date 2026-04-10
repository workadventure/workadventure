<script lang="ts">
    import * as Sentry from "@sentry/svelte";
    import Select from "./Select.svelte";

    export let id: string | undefined = undefined;
    export let label: string;
    export let options: { value: string; label: string }[] = [];
    export let value: string;
    export let onChange: ((event: Event) => void) | undefined = undefined;
    export let getSoundUrl: (value: string) => string;
    export let volume = 0.2;
    export let disabled = false;
    export let outerClass = "";
    export let playLabel = "▶";

    const sound = new Audio();

    function playSelectedSound(selectedValue: string = value) {
        const url = getSoundUrl(selectedValue);
        if (!url) {
            return;
        }
        sound.src = url;
        sound.volume = volume;
        sound.play().catch((e) => {
            console.error(e);
            Sentry.captureException(e);
        });
    }

    function handleChange(event: Event) {
        const selectedValue = (event.target as HTMLSelectElement | null)?.value ?? value;
        onChange?.(event);
        playSelectedSound(selectedValue);
    }

    function handlePlayClick(event: Event) {
        event.preventDefault();
        playSelectedSound();
    }
</script>

<div class={`flex items-end gap-2 ${outerClass}`.trim()}>
    <Select {id} bind:value {label} {options} onChange={handleChange} outerClass="flex-1" {disabled} />
    <button class="btn btn-light btn-ghost mb-2" on:click={handlePlayClick} disabled={disabled || !getSoundUrl(value)}>
        {playLabel}
    </button>
</div>
