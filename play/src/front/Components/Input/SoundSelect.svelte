<script lang="ts">
    import * as Sentry from "@sentry/svelte";
    import Select from "./Select.svelte";

    interface Props {
        id?: string | undefined;
        label: string;
        options?: { value: string; label: string }[];
        value: string;
        onchange?: ((event: Event) => void) | undefined;
        getSoundUrl: (value: string) => string;
        volume?: number;
        disabled?: boolean;
        outerClass?: string;
        playLabel?: string;
    }

    let {
        id = undefined,
        label,
        options = [],
        value = $bindable(),
        onchange = undefined,
        getSoundUrl,
        volume = 0.2,
        disabled = false,
        outerClass = "",
        playLabel = "▶",
    }: Props = $props();

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
        onchange?.(event);
        playSelectedSound(selectedValue);
    }

    function handlePlayClick(event: Event) {
        event.preventDefault();
        playSelectedSound();
    }
</script>

<div class={`flex items-end gap-2 ${outerClass}`.trim()}>
    <Select {id} bind:value {label} {options} onchange={handleChange} outerClass="flex-1" {disabled} />
    <button class="btn btn-light btn-ghost mb-2" onclick={handlePlayClick} disabled={disabled || !getSoundUrl(value)}>
        {playLabel}
    </button>
</div>
