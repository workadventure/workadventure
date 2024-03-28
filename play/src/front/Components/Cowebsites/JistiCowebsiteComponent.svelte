<script lang="ts">
    import { onMount } from "svelte";
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
    import { get } from "svelte/store";
    import { userIsJitsiDominantSpeakerStore } from "../../Stores/GameStore";
    import { inExternalServiceStore } from "../../Stores/MyMediaStore";
    import { gameManager } from "../../Phaser/Game/GameManager";

    export let actualCowebsite: JitsiCoWebsite;
    let domain = actualCowebsite.getDomain();
    let jitsiContainer: HTMLDivElement;
    let roomName: string;
    let playerName = gameManager.getPlayerName();
    let jwt: string | undefined;
    let jitsiConfig: object | undefined;
    let jitsiInterfaceConfig: object | undefined;
    let jitsiApi: JitsiApi;
    let defaultInterfaceConfigCopy = { ...defaultInterfaceConfig };

    const onDominantSpeakerChanged = (data: { id: string }) => {
        if (jitsiApi) {
            userIsJitsiDominantSpeakerStore.set(
                data.id === actualCowebsite.getCurrentParticipantId(jitsiApi.getParticipantsInfo())
            );
        }
    };
    let dominantSpeakerChangedCallback = onDominantSpeakerChanged.bind(this);

    const onAudioChange = (muted: boolean) => {
        if (muted) {
            requestedMicrophoneState.disableMicrophone();
        } else {
            requestedMicrophoneState.enableMicrophone();
        }
    };
    let audioCallback = onAudioChange.bind(this);

    const onVideoChange = (muted: boolean) => {
        if (muted) {
            requestedCameraState.disableWebcam();
        } else {
            requestedCameraState.enableWebcam();
        }
    };
    let videoCallback = onVideoChange.bind(this);

    const onParticipantsCountChange = () => {
        actualCowebsite.updateParticipantsCountStore();
    };
    let participantsCountChangeCallback = onParticipantsCountChange.bind(this);

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
                    configOverwrite: mergeConfig(jitsiConfig),
                    interfaceConfigOverwrite: {
                        ...defaultInterfaceConfigCopy,
                        ...jitsiInterfaceConfig,
                    },
                };
                console.log("OPTIONS :", options);

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
                        console.log("video conference joined");
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

                    jitsiApi.addListener("audioMuteStatusChanged", audioCallback);
                    jitsiApi.addListener("videoMuteStatusChanged", videoCallback);
                    jitsiApi.addListener("dominantSpeakerChanged", dominantSpeakerChangedCallback);
                    jitsiApi.addListener("participantJoined", participantsCountChangeCallback);
                    jitsiApi.addListener("participantLeft", participantsCountChangeCallback);
                    jitsiApi.addListener("participantKickedOut", participantsCountChangeCallback);
                    console.log(jitsiApi);
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
    //Fonctionne sana le onDestroy bizzare ? Mon t'es débile ca fait juste appel au jitsi cowebsite lol

    // onDestroy(() => {
    // });
</script>

<div bind:this={jitsiContainer} class="w-full height" />

<style>
    .height {
        height: 90%;
    }
</style>
