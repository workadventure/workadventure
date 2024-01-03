<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import { get } from "svelte/store";
    import { onDestroy, onMount } from "svelte";
    import type { audioManagerVolume } from "../../Stores/AudioManagerStore";
    import {
        audioManagerFileStore,
        audioManagerVisibilityStore,
        audioManagerVolumeStore,
    } from "../../Stores/AudioManagerStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { actionsMenuStore } from "../../Stores/ActionsMenuStore";

    let HTMLAudioPlayer: HTMLAudioElement;
    let audioPlayerVolumeIcon: HTMLElement;
    let audioPlayerVol: HTMLInputElement;
    let unsubscriberFileStore: Unsubscriber | null = null;
    let unsubscriberVolumeStore: Unsubscriber | null = null;

    let state: "loading" | "playing" | "not_allowed" | "error" = "loading";

    onMount(() => {
        let volume = Math.min(localUserStore.getAudioPlayerVolume(), get(audioManagerVolumeStore).volume);
        audioManagerVolumeStore.setVolume(volume);
        audioManagerVolumeStore.setMuted(localUserStore.getAudioPlayerMuted());

        unsubscriberFileStore = audioManagerFileStore.subscribe((src: string) => {
            if (src == "") {
                if (HTMLAudioPlayer) HTMLAudioPlayer.pause();
                return;
            }
            HTMLAudioPlayer.pause();
            HTMLAudioPlayer.src = src;
            HTMLAudioPlayer.loop = get(audioManagerVolumeStore).loop;
            HTMLAudioPlayer.volume = get(audioManagerVolumeStore).volume;
            HTMLAudioPlayer.muted = get(audioManagerVolumeStore).muted;
            tryPlay();
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

    function tryPlay() {
        console.trace("tryPlay");
        HTMLAudioPlayer.onended = () => {
            // Fixme: this is a hack to close menu when audio is ends without cut the sound
            actionsMenuStore.clear();
            // Audiovisilibily is set to false when audio is ended
            audioManagerVisibilityStore.set(false);
        };

        HTMLAudioPlayer.play()
            .then(() => {
                state = "playing";
            })
            .catch((e) => {
                if (e instanceof DOMException && e.name === "NotAllowedError") {
                    // The browser does not allow audio to be played, possibly because the user has not interacted with the page yet.
                    // Let's ask the user to interact with the page first.
                    state = "not_allowed";
                } else {
                    state = "error";
                    console.error("The audio could not be played: ", e.name, e);
                }
            });
    }

    function updateVolumeUI() {
        if (get(audioManagerVolumeStore).muted) {
            audioPlayerVolumeIcon.classList.add("muted");
            audioPlayerVol.value = "0";
        } else {
            let volume = HTMLAudioPlayer.volume;
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

<div class="main-audio-manager">
    <div class:hidden={state !== "playing"}>
        <div class="audio-manager-player-volume">
            <span id="audioplayer_volume_icon_playing" bind:this={audioPlayerVolumeIcon} on:click={onMute}>
                <svg
                    width="2em"
                    height="2em"
                    viewBox="0 0 19.54 18.03"
                    class="bi bi-volume-up"
                    fill="white"
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
        <section class="audio-manager-file">
            <audio class="audio-manager-audioplayer" bind:this={HTMLAudioPlayer} />
        </section>
    </div>
    <div class:hidden={state !== "not_allowed"} class="tw-text-center tw-flex tw-justify-center">
        <button
            type="button"
            class="btn light tw-justify-center tw-font-bold tw-text-xs sm:tw-text-base tw-w-fit"
            on:click={tryPlay}>{$LL.audio.manager.allow()}</button
        >
    </div>
    <div
        class:hidden={state !== "error"}
        class="tw-text-center tw-flex tw-justify-center tw-text-danger tw-h-6 tw-truncate"
    >
        ⚠️ {$LL.audio.manager.error()} ⚠️
    </div>
</div>

<style lang="scss">
    .hidden {
        display: none;
    }
</style>
