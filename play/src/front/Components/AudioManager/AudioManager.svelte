<script lang="ts">
    import { fly } from "svelte/transition";
    import { clickOutside } from "svelte-outside";
    import type { Unsubscriber } from "svelte/store";
    import { get } from "svelte/store";
    import { onDestroy, onMount } from "svelte";
    import { AudioManagerVolume, audioManagerVolumeStore } from "../../Stores/AudioManagerStore";
    import { localUserStore } from "../../Connection/LocalUserStore";

    let audioPlayerVolumeIcon: HTMLElement;
    let audioPlayerVol: HTMLInputElement;
    let unsubscriberVolumeStore: Unsubscriber | null = null;

    let currentVolume: number = localUserStore.getAudioPlayerVolume();

    onMount(() => {
        let volume = Math.min(localUserStore.getAudioPlayerVolume(), get(audioManagerVolumeStore).volume);
        audioManagerVolumeStore.setVolume(volume);
        audioManagerVolumeStore.setMuted(localUserStore.getAudioPlayerMuted());

        unsubscriberVolumeStore = audioManagerVolumeStore.subscribe((audioManager: AudioManagerVolume) => {
            const reduceVolume = audioManager.talking && audioManager.decreaseWhileTalking;
            if (reduceVolume && !audioManager.volumeReduced) {
                audioManager.volume *= 0.5;
            } else if (!reduceVolume && audioManager.volumeReduced) {
                audioManager.volume *= 2.0;
            }
            audioManager.volumeReduced = reduceVolume;
            updateVolumeUI();
        });
        console.log("MOUNTED");
    });

    onDestroy(() => {
        if (unsubscriberVolumeStore) {
            unsubscriberVolumeStore();
        }
        console.log("UNMOUNTED");
    });

    function updateVolumeUI() {
        if (get(audioManagerVolumeStore).muted) {
            audioPlayerVolumeIcon.classList.add("muted");
            audioPlayerVol.value = "0";
            currentVolume = 0;
        } else {
            let volume = get(audioManagerVolumeStore).volume;
            currentVolume = volume;
            audioPlayerVol.value = "" + volume;
            audioPlayerVolumeIcon.classList.remove("muted");
            if (volume == 0) {
                onMute();
            } else if (volume < 0.3) {
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
</script>

<div
    class="main-audio-manager flex justify-center m-auto absolute left-0 -right-2 top-[70px] w-96 z-[500]"
    transition:fly={{ y: 20, duration: 150 }}
    use:clickOutside={() => {
        /*activeSecondaryZoneActionBarStore.set(undefined)*/
    }}
>
    <div
        class="bottom-action-bar bg-contrast/80 transition-all backdrop-blur-md rounded-md p-4 flex flex-col items-stretch pointer-events-auto justify-center m-auto bottom-6 md:bottom-4 z-[251] duration-300 md:flex-row"
    >
        <!--        <div class="font-lg text-center text-white mb-4 opacity-50">-->
        <!--            {$LL.audio.volumeCtrl()}-->
        <!--        </div>-->
        <div class="audio-manager-player-volume flex items-center justify-center">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                id="audioplayer_volume_icon_playing"
                bind:this={audioPlayerVolumeIcon}
                on:click={onMute}
                class="pr-4 flex items-center"
            >
                <svg
                    viewBox="0 0 19.54 18.03"
                    class="bi bi-volume-up h-6 w-6 fill-white"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        fill-rule="evenodd"
                        d="m8.58,2.34c.26.12.42.39.42.68v12c0,.41-.34.75-.75.75-.17,0-.33-.06-.47-.16l-3.54-2.84H.75c-.41,0-.75-.34-.75-.75v-6c0-.41.34-.75.75-.75h3.49l3.54-2.83c.23-.18.53-.22.79-.09Zm-1.08,2.24l-2.53,2.02c-.13.11-.3.16-.47.17H1.5v4.5h3c.17,0,.34.06.47.16l2.53,2.03V4.58Z"
                    />
                    <g id="audioplayer_volume_icon_playing_high">
                        <path
                            d="m15.8,18.03c2.39-2.39,3.74-5.63,3.73-9.02,0-3.38-1.34-6.63-3.73-9.02l-1.06,1.06c2.11,2.11,3.3,4.97,3.3,7.95,0,3.11-1.26,5.92-3.3,7.95,0,0,1.06,1.06,1.06,1.06Z"
                        />
                    </g>
                    <g id="audioplayer_volume_icon_playing_mid">
                        <path
                            d="m13.68,15.91c1.83-1.83,2.86-4.31,2.86-6.89,0-2.59-1.02-5.07-2.86-6.89l-1.06,1.06c1.55,1.55,2.42,3.64,2.42,5.83,0,2.19-.87,4.29-2.41,5.84,0,0,1.06,1.06,1.06,1.06Z"
                        />
                    </g>
                    <g id="audioplayer_volume_icon_playing_low">
                        <path
                            d="m11.56,13.79c1.27-1.26,1.98-2.98,1.98-4.77,0-1.79-.71-3.51-1.98-4.77l-1.06,1.06c.99.98,1.54,2.32,1.54,3.71,0,1.39-.55,2.73-1.54,3.71l1.06,1.06Z"
                        />
                    </g>
                    <g id="audioplayer_volume_icon_playing_muted">
                        <path
                            d="m18.28,5.47c.3.3.3.76,0,1.07h0l-2.48,2.47,2.48,2.47c.3.3.3.77,0,1.07s-.76.3-1.07,0l-2.48-2.48-2.47,2.48c-.3.3-.76.3-1.06,0s-.3-.77,0-1.07l2.47-2.48-2.44-2.49c-.3-.28-.3-.77,0-1.05.3-.28.77-.3,1.05,0h0l2.47,2.47,2.48-2.47c.3-.3.76-.3,1.07,0h-.02Z"
                        />
                    </g>
                </svg>
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.025"
                bind:this={audioPlayerVol}
                on:change={setVolume}
                on:input={setVolume}
                on:keydown={disallowKeys}
                class="grow"
            />
            <div class="text-white ml-4">
                {Math.round(currentVolume * 100)}<span class="opacity-50">%</span>
            </div>
        </div>
    </div>
</div>
