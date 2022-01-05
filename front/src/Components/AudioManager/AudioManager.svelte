<script lang="ts">
    import { localUserStore } from "../../Connexion/LocalUserStore";
    import type { audioManagerVolume } from "../../Stores/AudioManagerStore";
    import { audioManagerFileStore, audioManagerVolumeStore } from "../../Stores/AudioManagerStore";
    import { get } from "svelte/store";
    import type { Unsubscriber } from "svelte/store";
    import { onDestroy, onMount } from "svelte";
    import LL from "../../i18n/i18n-svelte";

    let HTMLAudioPlayer: HTMLAudioElement;
    let audioPlayerVolumeIcon: HTMLElement;
    let audioPlayerVol: HTMLInputElement;
    let unsubscriberFileStore: Unsubscriber | null = null;
    let unsubscriberVolumeStore: Unsubscriber | null = null;

    let decreaseWhileTalking: boolean = true;

    onMount(() => {
        let volume = Math.min(localUserStore.getAudioPlayerVolume(), get(audioManagerVolumeStore).volume);
        audioManagerVolumeStore.setVolume(volume);
        audioManagerVolumeStore.setMuted(localUserStore.getAudioPlayerMuted());

        unsubscriberFileStore = audioManagerFileStore.subscribe((src) => {
            HTMLAudioPlayer.pause();
            HTMLAudioPlayer.src = src;
            HTMLAudioPlayer.loop = get(audioManagerVolumeStore).loop;
            HTMLAudioPlayer.volume = get(audioManagerVolumeStore).volume;
            HTMLAudioPlayer.muted = get(audioManagerVolumeStore).muted;
            void HTMLAudioPlayer.play();
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
            updateVolumeUI();
        });
    });

    onDestroy(() => {
        if (unsubscriberFileStore) {
            unsubscriberFileStore();
        }
        if (unsubscriberVolumeStore) {
            unsubscriberVolumeStore();
        }
    });

    function updateVolumeUI() {
        if (get(audioManagerVolumeStore).muted) {
            audioPlayerVolumeIcon.classList.add("muted");
            audioPlayerVol.value = "0";
        } else {
            let volume = HTMLAudioPlayer.volume;
            audioPlayerVol.value = "" + volume;
            audioPlayerVolumeIcon.classList.remove("muted");
            if (volume < 0.3) {
                audioPlayerVolumeIcon.classList.add("low");
            } else if (volume < 0.7) {
                audioPlayerVolumeIcon.classList.remove("low");
                audioPlayerVolumeIcon.classList.add("mid");
            } else {
                audioPlayerVolumeIcon.classList.remove("low");
                audioPlayerVolumeIcon.classList.remove("mid");
            }
        }
    }

    function onMute() {
        const muted = !get(audioManagerVolumeStore).muted;
        audioManagerVolumeStore.setMuted(muted);
        localUserStore.setAudioPlayerMuted(muted);
    }

    function setVolume() {
        let volume = parseFloat(audioPlayerVol.value);
        audioManagerVolumeStore.setVolume(volume);
        localUserStore.setAudioPlayerVolume(volume);
        audioManagerVolumeStore.setMuted(false);
        localUserStore.setAudioPlayerMuted(false);
    }

    function disallowKeys() {
        audioPlayerVol.blur();
        return false;
    }

    function setDecrease() {
        audioManagerVolumeStore.setDecreaseWhileTalking(decreaseWhileTalking);
    }
</script>

<div class="main-audio-manager nes-container is-rounded">
    <div class="audio-manager-player-volume">
        <span
            id="audioplayer_volume_icon_playing"
            alt="player volume"
            bind:this={audioPlayerVolumeIcon}
            on:click={onMute}
        >
            <svg
                width="2em"
                height="2em"
                viewBox="0 0 16 16"
                class="bi bi-volume-up"
                fill="white"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    fill-rule="evenodd"
                    d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06zM6 5.04L4.312 6.39A.5.5 0 0 1 4 6.5H2v3h2a.5.5 0 0 1 .312.11L6 10.96V5.04z"
                />
                <g id="audioplayer_volume_icon_playing_high">
                    <path
                        d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"
                    />
                </g>
                <g id="audioplayer_volume_icon_playing_mid">
                    <path
                        d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"
                    />
                </g>
                <g id="audioplayer_volume_icon_playing_low">
                    <path
                        d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707z"
                    />
                </g>
            </svg>
        </span>
        <input
            type="range"
            min="0"
            max="1"
            step="0.025"
            bind:this={audioPlayerVol}
            on:change={setVolume}
            on:keydown={disallowKeys}
        />
    </div>
    <div class="audio-manager-reduce-conversation">
        <label>
            {$LL.audio.manager.reduce()}
            <input type="checkbox" bind:checked={decreaseWhileTalking} on:change={setDecrease} />
        </label>
        <section class="audio-manager-file">
            <!-- svelte-ignore a11y-media-has-caption -->
            <audio class="audio-manager-audioplayer" bind:this={HTMLAudioPlayer} />
        </section>
    </div>
</div>

<style lang="scss">
    div.main-audio-manager.nes-container.is-rounded {
        position: absolute;
        top: 1%;
        max-height: clamp(150px, 10vh, 15vh); //replace @media for small screen
        width: clamp(200px, 15vw, 15vw);
        padding: 3px 3px;
        margin-left: auto;
        margin-right: auto;
        left: 0;
        right: 0;
        z-index: 550;

        background-color: rgb(0, 0, 0, 0.5);
        display: grid;
        grid-template-rows: 50% 50%;
        color: whitesmoke;
        text-align: center;
        pointer-events: auto;

        div.audio-manager-player-volume {
            display: grid;
            grid-template-columns: 50px 1fr;

            span svg {
                height: 100%;
                width: calc(100% - 10px);
                margin-right: 10px;
            }
        }

        section.audio-manager-file {
            display: none;
        }

        #audioplayer_volume_icon_playing.muted {
            #audioplayer_volume_icon_playing_low {
                visibility: hidden;
                display: none;
            }

            #audioplayer_volume_icon_playing_mid {
                visibility: hidden;
                display: none;
            }

            #audioplayer_volume_icon_playing_high {
                visibility: hidden;
                display: none;
            }
        }

        #audioplayer_volume_icon_playing.low #audioplayer_volume_icon_playing_high {
            visibility: hidden;
            display: none;
        }

        #audioplayer_volume_icon_playing.low #audioplayer_volume_icon_playing_mid {
            visibility: hidden;
            display: none;
        }

        #audioplayer_volume_icon_playing.mid #audioplayer_volume_icon_playing_high {
            visibility: hidden;
            display: none;
        }
    }
</style>
