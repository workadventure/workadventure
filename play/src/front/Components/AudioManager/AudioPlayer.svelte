<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import { get } from "svelte/store";
    import { onDestroy, onMount, tick } from "svelte";
    import { Subscription } from "rxjs";
    import {
        audioManagerPlayerState,
        audioManagerRetryPlaySubject,
        AudioManagerVolume,
        audioManagerFileStore,
        audioManagerVisibilityStore,
        audioManagerVolumeStore,
    } from "../../Stores/AudioManagerStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { actionsMenuStore } from "../../Stores/ActionsMenuStore";
    import { warningMessageStore } from "../../Stores/ErrorStore";
    import { activeSecondaryZoneActionBarStore } from "../../Stores/MenuStore";

    let HTMLAudioPlayer: HTMLAudioElement;
    let unsubscriberFileStore: Unsubscriber | null = null;
    let unsubscriberVolumeStore: Unsubscriber | null = null;
    let retryPlayStoreSubscription: Subscription | null = null;

    onMount(() => {
        let volume = Math.min(localUserStore.getAudioPlayerVolume(), get(audioManagerVolumeStore).volume);
        audioManagerVolumeStore.setVolume(volume);
        audioManagerVolumeStore.setMuted(localUserStore.getAudioPlayerMuted());

        unsubscriberFileStore = audioManagerFileStore.subscribe((src: string) => {
            (async () => {
                if (src == "") {
                    if (HTMLAudioPlayer) HTMLAudioPlayer.pause();
                    return;
                }
                await tick();
                HTMLAudioPlayer.pause();
                HTMLAudioPlayer.src = src;
                HTMLAudioPlayer.loop = get(audioManagerVolumeStore).loop;
                HTMLAudioPlayer.volume = get(audioManagerVolumeStore).volume;
                HTMLAudioPlayer.muted = get(audioManagerVolumeStore).muted;
                tryPlay();
            })().catch(console.error);
        });
        unsubscriberVolumeStore = audioManagerVolumeStore.subscribe((audioManager: AudioManagerVolume) => {
            const reduceVolume = audioManager.talking && audioManager.decreaseWhileTalking;
            if (reduceVolume && !audioManager.volumeReduced) {
                audioManager.volume *= 0.5;
            } else if (!reduceVolume && audioManager.volumeReduced) {
                audioManager.volume *= 2.0;
            }
            audioManager.volumeReduced = reduceVolume;
            if (HTMLAudioPlayer) {
                HTMLAudioPlayer.volume = audioManager.volume;
                HTMLAudioPlayer.muted = audioManager.muted;
                HTMLAudioPlayer.loop = audioManager.loop;
            }
        });
        retryPlayStoreSubscription = audioManagerRetryPlaySubject.subscribe(() => {
            (async () => {
                await tick();
                tryPlay();
            })().catch(console.error);
        });
    });

    onDestroy(() => {
        if (unsubscriberFileStore) {
            unsubscriberFileStore();
        }
        if (unsubscriberVolumeStore) {
            unsubscriberVolumeStore();
        }
        retryPlayStoreSubscription?.unsubscribe();
        audioManagerPlayerState.set(undefined);
    });

    function tryPlay() {
        console.trace("tryPlay");
        HTMLAudioPlayer.onended = () => {
            // Fixme: this is a hack to close menu when audio is ends without cut the sound
            actionsMenuStore.clear();
            // Audiovisilibily is set to false when audio is ended
            audioManagerVisibilityStore.set("hidden");
            if ($activeSecondaryZoneActionBarStore === "audio-manager") {
                activeSecondaryZoneActionBarStore.set(undefined);
            }
        };

        HTMLAudioPlayer.play()
            .then(() => {
                audioManagerPlayerState.set("playing");
            })
            .catch((e) => {
                if (e instanceof DOMException && e.name === "NotAllowedError") {
                    // The browser does not allow audio to be played, possibly because the user has not interacted with the page yet.
                    // Let's ask the user to interact with the page first.
                    audioManagerPlayerState.set("not_allowed");
                    console.warn("The audio could not be played: ", e.name, e);
                } else {
                    audioManagerPlayerState.set("error");
                    warningMessageStore.addWarningMessage($LL.audio.manager.error());
                    console.error("The audio could not be played: ", e.name, e);
                    audioManagerVisibilityStore.set("error");
                }
            });
    }
</script>

{#if $audioManagerFileStore}
    <audio class="audio-manager-audioplayer" bind:this={HTMLAudioPlayer} />
{/if}
