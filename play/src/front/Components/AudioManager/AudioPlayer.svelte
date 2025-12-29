<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import { get } from "svelte/store";
    import { onDestroy, onMount, tick } from "svelte";
    import type { Subscription } from "rxjs";
    import type { AudioManagerVolume } from "../../Stores/AudioManagerStore";
    import {
        audioManagerPlayerState,
        audioManagerRetryPlaySubject,
        audioManagerFileStore,
        audioManagerVisibilityStore,
        audioManagerVolumeStore,
    } from "../../Stores/AudioManagerStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { actionsMenuStore } from "../../Stores/ActionsMenuStore";
    import { warningMessageStore } from "../../Stores/ErrorStore";
    import { activeSecondaryZoneActionBarStore } from "../../Stores/MenuStore";
    import { gameManager } from "../../Phaser/Game/GameManager";

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
                    try {
                        HTMLAudioPlayer.pause();
                    } catch (error) {
                        console.warn("The audio player is not paused, so we create a new one", error);
                    }
                    if (HTMLAudioPlayer) HTMLAudioPlayer.onprogress = null;
                    return;
                }
                await tick();
                HTMLAudioPlayer.src = src;
                HTMLAudioPlayer.load();
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
                // Use paused attribute to manage audio
                if (audioManager.paused || audioManager.stopped) {
                    try {
                        HTMLAudioPlayer.pause();
                    } catch (error) {
                        console.warn("The audio player is not paused, so we create a new one", error);
                    }
                    if (audioManager.stopped) {
                        if (HTMLAudioPlayer) HTMLAudioPlayer.onprogress = null;
                    }
                } else {
                    HTMLAudioPlayer.muted = false;
                    HTMLAudioPlayer.play().catch(console.error);
                }
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
        if (!HTMLAudioPlayer) return;
        HTMLAudioPlayer.onended = () => {
            // Fixme: this is a hack to close menu when audio is ends without cut the sound
            actionsMenuStore.clear();
            // Audiovisilibily is set to false when audio is ended
            audioManagerVisibilityStore.set("hidden");
            if ($activeSecondaryZoneActionBarStore === "audio-manager") {
                activeSecondaryZoneActionBarStore.set(undefined);
            }
        };

        HTMLAudioPlayer.onloadstart = () => {
            audioManagerPlayerState.set("loading");
        };
        HTMLAudioPlayer.onerror = (event, error) => {
            console.error("HTMLAudioPlayer.onerror", event, error);
            const gameScene = gameManager.getCurrentGameScene();
            if (!gameScene) return;
            gameScene.CurrentPlayer.playText("audio-not-allowed", $LL.audio.manager.notAllowed(), 10000, () => {
                // When user click, the message could be removed
                gameScene.CurrentPlayer.destroyText("audio-not-allowed");
                // When the user clicks on the message, we try to play the audio again
                tryPlay();
            });
        };
        HTMLAudioPlayer.onprogress = () => {
            console.log("HTMLAudioPlayer.onprogress");
            if ($audioManagerPlayerState === "loading") audioManagerPlayerState.set("playing");
        };

        HTMLAudioPlayer.play()
            .then(() => {
                audioManagerPlayerState.set("playing");
                audioManagerVisibilityStore.set("visible");
                activeSecondaryZoneActionBarStore.set("audio-manager");
            })
            .catch((e) => {
                // If the audio is stopped, we don't play it
                if (get(audioManagerVolumeStore).stopped) {
                    console.warn("The audio is stopped, so we don't play it. Error: ", e);
                    return;
                }
                if (e instanceof DOMException && e.name === "NotAllowedError") {
                    // The browser does not allow audio to be played, possibly because the user has not interacted with the page yet.
                    // Let's ask the user to interact with the page first.
                    audioManagerPlayerState.set("not_allowed");
                    console.warn("The audio could not be played: ", e.name, e);

                    // Show the message to user the audio player
                    const gameScene = gameManager.getCurrentGameScene();
                    if (gameScene) {
                        gameScene.CurrentPlayer.playText(
                            "audio-not-allowed",
                            $LL.audio.manager.notAllowed(),
                            10000,
                            () => {
                                // When user click, the message could be removed
                                gameScene.CurrentPlayer.destroyText("audio-not-allowed");
                                // When the user clicks on the message, we try to play the audio again
                                tryPlay();
                            }
                        );
                    }
                } else {
                    audioManagerPlayerState.set("error");
                    warningMessageStore.addWarningMessage($LL.audio.manager.error());
                    console.error("The audio could not be played: ", e.name, e);
                    audioManagerVisibilityStore.set("error");
                }
            });
    }
</script>

{#if $audioManagerFileStore !== "" && $audioManagerVolumeStore.stopped === false}
    <audio preload="auto" class="audio-manager-audioplayer" bind:this={HTMLAudioPlayer} />
{/if}
