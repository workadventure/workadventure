<script lang="typescript">
    import {SoundMeter} from "../Phaser/Components/SoundMeter";
    import {onDestroy} from "svelte";

    export let stream: MediaStream;
    let volume = 0;

    console.log('stream', stream);

    if (stream.getAudioTracks().length > 0) {
        const soundMeter = new SoundMeter();
        soundMeter.connectToSource(stream, new AudioContext());

        const timeout = setInterval(() => {
            try{
                volume = parseInt((soundMeter.getVolume() / 10).toFixed(0));
                console.log(volume);
            }catch(err){

            }
        }, 100);

        onDestroy(() => {
            clearInterval(timeout);
        })
    }
</script>


<div class="sound-progress" class:active={stream?.getAudioTracks().length > 0}>
    <span class:active={volume > 1}></span>
    <span class:active={volume > 2}></span>
    <span class:active={volume > 3}></span>
    <span class:active={volume > 4}></span>
    <span class:active={volume > 5}></span>
</div>
