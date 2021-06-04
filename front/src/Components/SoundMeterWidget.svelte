<script lang="typescript">
    import { AudioContext } from 'standardized-audio-context';
    import {SoundMeter} from "../Phaser/Components/SoundMeter";
    import {onDestroy} from "svelte";

    export let stream: MediaStream|null;
    let volume = 0;

    const NB_BARS = 5;

    let timeout;
    const soundMeter = new SoundMeter();
    let display = false;

    $: {
        if (stream && stream.getAudioTracks().length > 0) {
            display = true;
            soundMeter.connectToSource(stream, new AudioContext());

            if (timeout) {
                clearInterval(timeout);
            }

            timeout = setInterval(() => {
                try{
                    volume = parseInt((soundMeter.getVolume() / 100 * NB_BARS).toFixed(0));
                    //console.log(volume);
                }catch(err){

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
    })
</script>


<div class="sound-progress" class:active={display}>
    <span class:active={volume > 1}></span>
    <span class:active={volume > 2}></span>
    <span class:active={volume > 3}></span>
    <span class:active={volume > 4}></span>
    <span class:active={volume > 5}></span>
</div>
