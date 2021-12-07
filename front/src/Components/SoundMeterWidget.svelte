<script lang="typescript">
    import { AudioContext } from "standardized-audio-context";
    import { SoundMeter } from "../Phaser/Components/SoundMeter";
    import { onDestroy } from "svelte";

    export let stream: MediaStream | null;
    let volume = 0;

    let timeout: ReturnType<typeof setTimeout>;
    const soundMeter = new SoundMeter();
    let display = false;
    let error = false;

    $: {
        if (stream && stream.getAudioTracks().length > 0) {
            display = true;
            soundMeter.connectToSource(stream, new AudioContext());

            if (timeout) {
                clearInterval(timeout);
                error = false;
            }

            timeout = setInterval(() => {
                try {
                    volume = soundMeter.getVolume();
                } catch (err) {
                    if (!error) {
                        console.error(err);
                        error = true;
                    }
                }
            }, 100);
        } else {
            display = false;
        }
    }

    onDestroy(() => {
        soundMeter.stop();
        if (timeout) {
            clearInterval(timeout);
        }
    });
</script>

<div class="sound-progress" class:active={display}>
    <span class:active={volume > 5} />
    <span class:active={volume > 10} />
    <span class:active={volume > 15} />
    <span class:active={volume > 40} />
    <span class:active={volume > 70} />
</div>
