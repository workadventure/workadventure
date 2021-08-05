<script lang="ts">
    import audioImg from "../images/audio.svg";
    import audioMuteImg from  "../images/audio-mute.svg";
    import { localUserStore } from "../../Connexion/LocalUserStore";
    import type { audioManagerVolume } from "../../Stores/AudioManagerStore";
    import {
        audioManagerFileStore,
        audioManagerVolumeStore,
    } from "../../Stores/AudioManagerStore";
    import {get} from "svelte/store";
    import type { Unsubscriber } from "svelte/store";
    import {onDestroy, onMount} from "svelte";

    let HTMLAudioPlayer: HTMLAudioElement;
    let unsubscriberFileStore: Unsubscriber | null = null;
    let unsubscriberVolumeStore: Unsubscriber | null = null;

    let volume: number = 1;
    let decreaseWhileTalking: boolean = true;

    onMount(() => {
        unsubscriberFileStore = audioManagerFileStore.subscribe(() =>{
            HTMLAudioPlayer.pause();
            HTMLAudioPlayer.loop = get(audioManagerVolumeStore).loop;
            HTMLAudioPlayer.volume = get(audioManagerVolumeStore).volume;
            HTMLAudioPlayer.muted = get(audioManagerVolumeStore).muted;
            HTMLAudioPlayer.play();
        });
        unsubscriberVolumeStore = audioManagerVolumeStore.subscribe((audioManager: audioManagerVolume) => {
            const reduceVolume = audioManager.talking && audioManager.decreaseWhileTalking;
            if (reduceVolume && !audioManager.volumeReduced) {
                audioManager.volume *= 0.5;
            } else if (!reduceVolume && audioManager.volumeReduced) {
                audioManager.volume *= 2.0;
            }
            audioManager.volumeReduced = reduceVolume;
            HTMLAudioPlayer.volume = audioManager.volume;
            HTMLAudioPlayer.muted = audioManager.muted;
            HTMLAudioPlayer.loop = audioManager.loop;
        })
    })

    onDestroy(() => {
        if (unsubscriberFileStore) {
            unsubscriberFileStore();
        }
        if (unsubscriberVolumeStore) {
            unsubscriberVolumeStore();
        }
    })

    function onMute() {
        audioManagerVolumeStore.setMuted(!get(audioManagerVolumeStore).muted);
        localUserStore.setAudioPlayerMuted(get(audioManagerVolumeStore).muted);
    }

    function setVolume() {
        audioManagerVolumeStore.setVolume(volume)
        localUserStore.setAudioPlayerVolume(get(audioManagerVolumeStore).volume);
    }

    function setDecrease() {
        audioManagerVolumeStore.setDecreaseWhileTalking(decreaseWhileTalking);
    }
</script>


<div class="main-audio-manager nes-container is-rounded">
    <div class="audio-manager-player-volume">
        <img src={$audioManagerVolumeStore.muted ? audioMuteImg : audioImg} alt="player volume" on:click={onMute}>
        <input type="range" min="0" max="1" step="0.025" bind:value={volume} on:change={setVolume}>
    </div>
    <div class="audio-manager-reduce-conversation">
        <label>
            reduce in conversations
            <input type="checkbox" bind:checked={decreaseWhileTalking} on:change={setDecrease}>
        </label>
        <section class="audio-manager-file">
            <audio class="audio-manager-audioplayer" bind:this={HTMLAudioPlayer}>
                <source src={$audioManagerFileStore}>
            </audio>
        </section>
    </div>
</div>


<style lang="scss">
    div.main-audio-manager.nes-container.is-rounded {
      position: relative;
      top: 0.5rem;
      max-height: clamp(150px, 10vh, 15vh); //replace @media for small screen
      width: clamp(200px, 15vw, 15vw);
      padding: 3px 3px;
      margin-left: auto;
      margin-right: auto;

      background-color: rgb(0,0,0,0.5);
      display: grid;
      grid-template-rows: 50% 50%;
      color: whitesmoke;
      text-align: center;
      pointer-events: auto;

      div.audio-manager-player-volume {
        display: grid;
        grid-template-columns: 50px 1fr;

        img {
          height: 100%;
          width: calc(100% - 10px);
          margin-right: 10px;
        }
      }

      section.audio-manager-file {
        display: none;
      }
    }
</style>
