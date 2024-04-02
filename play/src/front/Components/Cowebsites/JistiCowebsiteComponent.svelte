<script lang="ts">
    import { onMount } from "svelte";
    import { get } from "svelte/store";
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
    import { userIsJitsiDominantSpeakerStore } from "../../Stores/GameStore";
    import { inExternalServiceStore } from "../../Stores/MyMediaStore";
    import { gameManager } from "../../Phaser/Game/GameManager";

    export let actualCowebsite: JitsiCoWebsite;
    let domain = actualCowebsite.getDomain();
    let jitsiContainer: HTMLDivElement;
    let roomName: string;
    let playerName = gameManager.getPlayerName();
    let jwt: string | undefined;
    let jitsiApi: JitsiApi;

    const onDominantSpeakerChanged = (data: { id: string }) => {
        if (jitsiApi) {
            userIsJitsiDominantSpeakerStore.set(
                data.id === actualCowebsite.getCurrentParticipantId(jitsiApi.getParticipantsInfo())
            );
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

    const onParticipantsCountChange = () => {
        actualCowebsite.updateParticipantsCountStore();
    };

    onMount(() => {
        let cancelled = false;

        inExternalServiceStore.set(true);

        jitsiExternalApiFactory
            .loadJitsiScript(domain)
            .then(() => {
                const options: JitsiOptions = {
                    roomName: roomName,
                    jwt: jwt,
                    width: "100%",
                    height: "100%",
                    parentNode: jitsiContainer,
                    configOverwrite: mergeConfig(),
                    interfaceConfigOverwrite: {
                        ...defaultInterfaceConfig,
                        ...actualCowebsite.jitsiInterfaceConfig,
                    },
                };

                const timemoutPromise = new Promise<void>((resolve) => {
                    setTimeout(() => {
                        resolve();
                    }, 2000);
                });

                const jistiMeetLoadedPromise = new Promise<void>((resolve) => {
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
                            .then((release) => (actualCowebsite.screenWakeRelease = release))
                            .catch((error) => console.error(error));

                        actualCowebsite.updateParticipantsCountStore();
                    });

                    jitsiApi.addListener("audioMuteStatusChanged", onAudioChange);
                    jitsiApi.addListener("videoMuteStatusChanged", onVideoChange);
                    jitsiApi.addListener("dominantSpeakerChanged", onDominantSpeakerChanged);
                    jitsiApi.addListener("participantJoined", onParticipantsCountChange);
                    jitsiApi.addListener("participantLeft", onParticipantsCountChange);
                    jitsiApi.addListener("participantKickedOut", onParticipantsCountChange);
                });

                Promise.race([timemoutPromise, jistiMeetLoadedPromise])
                    .then(async () => {
                        await Promise.race([timemoutPromise, jistiMeetLoadedPromise]);
                        let iframe = document.querySelector('[id*="jitsi" i]');

                        if (cancelled) {
                            console.info("CLOSING BECAUSE CANCELLED AFTER LOAD");
                            return;
                        }

                        if (iframe && jitsiApi) {
                            jitsiApi.addListener("videoConferenceLeft", () => {
                                actualCowebsite.closeOrUnload();
                            });

                            jitsiApi.addListener("readyToClose", () => {
                                actualCowebsite.closeOrUnload();
                            });
                            // Ajouter une classe CSS à l'iframe
                            iframe.classList.add("pixel");
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

    // Appel a la fonction closeOrUnload pour stopper le jitsi
</script>

<div bind:this={jitsiContainer} class="w-full h-full" />
