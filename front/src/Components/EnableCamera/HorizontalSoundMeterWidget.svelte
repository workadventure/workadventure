<script lang="typescript">
    import { AudioContext } from "standardized-audio-context";
    import { SoundMeter } from "../../Phaser/Components/SoundMeter";
    import { onDestroy } from "svelte";

    export let stream: MediaStream | null;
    let volume = 0;

    const NB_BARS = 20;

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
                    volume = parseInt(((soundMeter.getVolume() / 100) * NB_BARS).toFixed(0));
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

    function color(i: number, volume: number) {
        const red = (255 * i) / NB_BARS;
        const green = 255 * (1 - i / NB_BARS);

        let alpha = 1;
        if (i >= volume) {
            alpha = 0.5;
        }

        return "background-color:rgba(" + red + ", " + green + ", 0, " + alpha + ")";
    }
</script>

<div class="horizontal-sound-meter" class:active={display}>
    {#each [...Array(NB_BARS).keys()] as i (i)}
        <div style={color(i, volume)} />
    {/each}
</div>

<style lang="scss">
    .horizontal-sound-meter {
        display: flex;
        flex-direction: row;
        width: 50%;
        height: 30px;
        margin-left: auto;
        margin-right: auto;
        margin-top: 1vh;
    }

    .horizontal-sound-meter div {
        margin-left: 5px;
        flex-grow: 1;
    }
</style>
