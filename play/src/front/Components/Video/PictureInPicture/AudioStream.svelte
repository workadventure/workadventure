<script lang="ts">
    import { onDestroy, onMount } from "svelte";

    export let attach: (container: HTMLAudioElement) => void;
    export let detach: (container: HTMLAudioElement) => void;

    export let volume: number | undefined = undefined;
    let audioElement: HTMLAudioElement;

    $: {
        if (volume !== undefined && audioElement) {
            audioElement.volume = volume;
        }
    }

    onMount(() => {
        attach(audioElement);
    });

    onDestroy(() => {
        detach(audioElement);
    });
</script>

<audio bind:this={audioElement} autoplay={true} />
