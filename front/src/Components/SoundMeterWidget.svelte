<script lang="typescript">
    import { AudioContext } from 'standardized-audio-context';
    import {SoundMeter} from "../Phaser/Components/SoundMeter";
    import {onDestroy} from "svelte";

    export let stream: MediaStream|null;
    let volume = 0;

    let timeout: ReturnType<typeof setTimeout>;
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
                    volume = soundMeter.getVolume();
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
    <span class:active={volume > 5}></span>
    <span class:active={volume > 10}></span>
    <span class:active={volume > 15}></span>
    <span class:active={volume > 40}></span>
    <span class:active={volume > 70}></span>
</div>
