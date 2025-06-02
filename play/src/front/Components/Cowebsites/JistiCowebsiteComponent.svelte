<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { get } from "svelte/store";
    import CancelablePromise from "cancelable-promise";
    import Debug from "debug";
    import {
        JitsiCoWebsite,
        JitsiApi,
        defaultInterfaceConfig,
        mergeConfig,
        JitsiOptions,
    } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    import { jitsiExternalApiFactory } from "../../WebRtc/JitsiExternalApiFactory";
    import { screenWakeLock } from "../../Utils/ScreenWakeLock";
    import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
    import { currentPlayerWokaStore } from "../../Stores/CurrentPlayerWokaStore";
    import { jitsiParticipantsCountStore, userIsJitsiDominantSpeakerStore } from "../../Stores/GameStore";
    import { inExternalServiceStore } from "../../Stores/MyMediaStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { coWebsites } from "../../Stores/CoWebsiteStore";

    const debug = Debug("jitsiCowebsite");

    export let actualCowebsite: JitsiCoWebsite;
    export let visible: boolean;
    let domain = actualCowebsite.getDomain();
    let jitsiContainer: HTMLDivElement;
    let playerName = gameManager.getPlayerName();
    let jwt: string | undefined = actualCowebsite.jwt;
    let jitsiApi: JitsiApi;
    let screenWakeRelease: (() => Promise<void>) | undefined;
    let jistiMeetLoadedPromise: CancelablePromise<void>;

    const onDominantSpeakerChanged = (data: { id: string }) => {
        if (jitsiApi) {
            userIsJitsiDominantSpeakerStore.set(data.id === getCurrentParticipantId(jitsiApi.getParticipantsInfo()));
        }
    };

    let onAudioChange = (changeAudio: { muted: boolean }) => {
        if (changeAudio.muted) {
            requestedMicrophoneState.disableMicrophone();
        } else {
            requestedMicrophoneState.enableMicrophone();
        }
    };
    const onVideoChange = (changeVideo: { muted: boolean }) => {
        if (changeVideo.muted) {
            requestedCameraState.disableWebcam();
        } else {
            requestedCameraState.enableWebcam();
        }
    };

    function updateParticipantsCountStore() {
        jitsiParticipantsCountStore.set(jitsiApi?.getParticipantsInfo().length ?? 0);
    }

    const onParticipantsCountChange = () => {
        updateParticipantsCountStore();
    };

    function getCurrentParticipantId(
        participants: { displayName: string; participantId: string }[]
    ): string | undefined {
        const currentPlayerName = gameManager.getPlayerName();
        for (const participant of participants) {
            if (participant.displayName === currentPlayerName) {
                return participant.participantId;
            }
        }
        return;
    }

    onMount(() => {
        let cancelled = false;

        inExternalServiceStore.set(true);

        jitsiExternalApiFactory
            .loadJitsiScript(domain)
            .then(() => {
                const userConnectedTags = gameManager.getCurrentGameScene().connection?.getAllTags() ?? [];

                const mergedConfig = mergeConfig(actualCowebsite.jitsiConfig);

                if (
                    !userConnectedTags.includes("admin") &&
                    (!actualCowebsite.jitsiRoomAdminTag ||
                        !userConnectedTags.includes(actualCowebsite.jitsiRoomAdminTag))
                ) {
                    mergedConfig.localRecording = {
                        disable: true,
                        disableSelfRecording: true,
                    };
                }

                const options: JitsiOptions = {
                    roomName: actualCowebsite.roomName,
                    jwt: jwt,
                    width: "100%",
                    height: "100%",
                    parentNode: jitsiContainer,
                    configOverwrite: mergedConfig,
                    interfaceConfigOverwrite: {
                        ...defaultInterfaceConfig,
                        ...actualCowebsite.jitsiInterfaceConfig,
                    },
                };

                jistiMeetLoadedPromise = new CancelablePromise<void>((resolve) => {
                    options.onload = () => {
                        resolve();
                    };

                    jitsiApi = new window.JitsiMeetExternalAPI(domain, options);

                    jitsiApi.addListener("videoConferenceJoined", () => {
                        jitsiApi.executeCommand("displayName", playerName);
                        jitsiApi.executeCommand("avatarUrl", get(currentPlayerWokaStore));
                        jitsiApi.executeCommand("setNoiseSuppressionEnabled", {
                            enabled: window.navigator.userAgent.toLowerCase().indexOf("firefox") === -1,
                        });

                        screenWakeLock
                            .requestWakeLock()
                            .then((release) => (screenWakeRelease = release))
                            .catch((error) => console.error(error));

                        updateParticipantsCountStore();
                    });

                    jitsiApi.addListener("audioMuteStatusChanged", onAudioChange);
                    jitsiApi.addListener("videoMuteStatusChanged", onVideoChange);
                    jitsiApi.addListener("dominantSpeakerChanged", onDominantSpeakerChanged);
                    jitsiApi.addListener("participantJoined", onParticipantsCountChange);
                    jitsiApi.addListener("participantLeft", onParticipantsCountChange);
                    jitsiApi.addListener("participantKickedOut", onParticipantsCountChange);
                });

                jistiMeetLoadedPromise
                    .then(() => {
                        if (cancelled) {
                            debug("CLOSING BECAUSE CANCELLED AFTER LOAD");
                            return;
                        }

                        if (jitsiApi) {
                            jitsiApi.addListener("videoConferenceLeft", () => {
                                coWebsites.remove(actualCowebsite);
                            });

                            jitsiApi.addListener("readyToClose", () => {
                                coWebsites.remove(actualCowebsite);
                            });
                        } else {
                            console.error("No iframe or no jitsiApi. We may have a problem.");
                        }
                    })
                    .catch((e) => {
                        console.error("Error loading Jitsi Meeting:", e);
                    });
            })
            .catch((e) => {
                console.error("Error loading Jitsi Meeting:", e);
            });
    });

    onDestroy(() => {
        jistiMeetLoadedPromise.cancel();

        if (jitsiApi) {
            jitsiApi.removeListener("audioMuteStatusChanged", onAudioChange);
            jitsiApi.removeListener("videoMuteStatusChanged", onVideoChange);
            jitsiApi.removeListener("dominantSpeakerChanged", onDominantSpeakerChanged);
            jitsiApi.removeListener("participantJoined", onParticipantsCountChange);
            jitsiApi.removeListener("participantLeft", onParticipantsCountChange);
            jitsiApi.removeListener("participantKickedOut", onParticipantsCountChange);
            jitsiApi.removeListener("videoConferenceLeft", () => {
                coWebsites.remove(actualCowebsite);
            });
            jitsiApi.removeListener("readyToClose", () => {
                coWebsites.remove(actualCowebsite);
            });
            jitsiApi.dispose();
        }

        if (screenWakeRelease) {
            screenWakeRelease().catch((e) => console.error(e));
        }
        inExternalServiceStore.set(false);
    });
</script>

<div class="relative w-full h-full" class:hidden={!visible}>
    <div bind:this={jitsiContainer} class="absolute w-full h-full z-0" />
</div>
