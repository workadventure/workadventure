<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy, afterUpdate } from "svelte";
    import { soundPlayingStore } from "../../Stores/SoundPlayingStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { IconMusic, IconPause, IconPauseFilled, IconPlay, IconPlayFilled } from "@wa-icons";

    export let url: string;
    let audio: HTMLAudioElement;
    let muted = false;
    let timeOutToEnd: ReturnType<typeof setTimeout>;

    function soundEnded() {
        soundPlayingStore.soundEnded();
    }

    function toggleMuteUnmuteAudio() {
        if (muted) {
            unmute();
        } else {
            mute();
        }
    }

    function unmute() {
        if (timeOutToEnd) clearTimeout(timeOutToEnd);
        audio.muted = false;
        muted = false;
    }
    function mute() {
        audio.muted = true;
        muted = true;
        timeOutToEnd = setTimeout(() => {
            soundEnded();
        }, 5000);
    }

    afterUpdate(() => {
        audio.play().catch((e) => console.error(e));
    });

    onDestroy(() => {
        if (timeOutToEnd) clearTimeout(timeOutToEnd);
    });
</script>

<div
    class="audio-playing bg-contrast/80 backdrop-blur pointer-events-auto flex flex-row justify-start items-center rounded-lg"
    transition:fly={{ x: 210, duration: 500 }}
>
    <IconMusic class="top-0 bottom-0 h-8 w-8 m-2" />
    <p>{$LL.audio.message()}</p>
    <audio bind:this={audio} src={url} on:ended={soundEnded}>
        <track kind="captions" />
    </audio>
    <!-- Button to stop the audio -->
    <button
        class="group/audio-playing absolute bg-contrast/80 hover:bg-contrast backdrop-blur hover:backdrop-blur-0 p-3 w-14 -left-16 rounded-lg top-0 bottom-0 flex justify-center items-center cursor-pointer"
        on:click={toggleMuteUnmuteAudio}
    >
        {#if muted == false}
            <IconPause class="block group-hover/audio-playing:hidden h-full w-full" />
            <IconPauseFilled class="hidden group-hover/audio-playing:block h-full w-full" />
        {:else}
            <IconPlay class="block group-hover/audio-playing:hidden h-full w-full" />
            <IconPlayFilled class="hidden group-hover/audio-playing:block h-full w-full" />
        {/if}
    </button>
</div>

<style lang="scss">
    /*audio html when audio message playing*/
    .audio-playing {
        position: absolute;
        width: 200px;
        height: 54px;
        right: 0;
        top: 40px;
        transition: all 0.1s ease-out;
        display: inline-flex;
        z-index: 750;

        img {
            //border-radius: 50%;
            padding: 10px;
        }

        p {
            color: white;
            margin-left: 10px;
            margin-top: 14px;
        }
    }
</style>
