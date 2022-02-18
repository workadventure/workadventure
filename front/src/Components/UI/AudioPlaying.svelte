<script lang="ts">
    import { fly } from "svelte/transition";
    import megaphoneImg from "./images/megaphone.svg";
    import { soundPlayingStore } from "../../Stores/SoundPlayingStore";
    import { afterUpdate } from "svelte";
    import LL from "../../i18n/i18n-svelte";

    export let url: string;
    let audio: HTMLAudioElement;

    function soundEnded() {
        soundPlayingStore.soundEnded();
    }

    afterUpdate(() => {
        audio.play().catch((e) => console.error(e));
    });
</script>

<div class="audio-playing" transition:fly={{ x: 210, duration: 500 }}>
    <img src={megaphoneImg} alt="Audio playing" />
    <p>{$LL.audio.message()}</p>
    <audio bind:this={audio} src={url} on:ended={soundEnded}>
        <track kind="captions" />
    </audio>
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
        background-color: black;
        border-radius: 30px 0 0 30px;
        display: inline-flex;
        z-index: 750;

        img {
            border-radius: 50%;
            background-color: #ffda01;
            padding: 10px;
        }

        p {
            color: white;
            margin-left: 10px;
            margin-top: 14px;
        }
    }
</style>
