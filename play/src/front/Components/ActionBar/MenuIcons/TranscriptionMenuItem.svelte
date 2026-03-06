<script lang="ts">
    import { get } from "svelte/store";
    import { onDestroy } from "svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import SubtitleIcon from "../../Icons/SubtitleIcon.svelte";
    import RecordingSpacePicker from "../../PopUp/Recording/RecordingSpacePicker.svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { transcriptionStore } from "../../../Stores/TranscriptionStore";
    import { transcriptionSchema } from "../../../Space/SpaceMetadataValidator";
    import type { SpaceInterface } from "../../../Space/SpaceInterface";
    import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";
    import { IconAlertTriangle } from "@wa-icons";

    const currentGameScene = gameManager.getCurrentGameScene();

    const transcription = gameManager.currentStartedRoom.transcription;
    let waitReturnOfTranscriptionRequest = false;
    let closeFloatingUi: (() => void) | undefined = undefined;
    let triggerElement: HTMLElement | undefined = undefined;

    function closeSpacePicker(): void {
        closeFloatingUi?.();
        closeFloatingUi = undefined;
    }

    function getTranscriptionSpace(spaces: SpaceInterface[]): SpaceInterface | undefined {
        const localUserUuid = localUserStore.getLocalUser()?.uuid ?? "";
        let fallbackSpace: SpaceInterface | undefined;

        for (const space of spaces) {
            const transcriptionMetadata = transcriptionSchema.safeParse(space.getMetadata().get("transcription"));
            if (!transcriptionMetadata.success || !transcriptionMetadata.data.transcription) {
                continue;
            }
            if (transcriptionMetadata.data.transcriber === localUserUuid) {
                return space;
            }
            fallbackSpace ??= space;
        }

        return fallbackSpace;
    }

    function toggleTranscription(space: SpaceInterface): void {
        const isTranscribing = get(transcriptionStore).isTranscribing;

        if (isTranscribing) {
            analyticsClient.transcriptionStop();
            space.emitUpdateSpaceMetadata(
                new Map([
                    [
                        "transcription",
                        {
                            transcription: false,
                        },
                    ],
                ])
            );

            waitReturnOfTranscriptionRequest = false;
        } else {
            analyticsClient.transcriptionStart();
            space.emitUpdateSpaceMetadata(
                new Map([
                    [
                        "transcription",
                        {
                            transcription: true,
                        },
                    ],
                ])
            );

            waitReturnOfTranscriptionRequest = true;
        }
    }

    function requestTranscription(): void {
        const spaceRegistry = currentGameScene.spaceRegistry;
        const spacesWithTranscription = get(spaceRegistry.spacesWithTranscription);
        if (spacesWithTranscription.length === 0) {
            return;
        }

        const isTranscribing = get(transcriptionStore).isTranscribing;

        if (isTranscribing) {
            closeSpacePicker();
            const space = getTranscriptionSpace(spacesWithTranscription) ?? spacesWithTranscription[0];
            toggleTranscription(space);
            return;
        }

        if (spacesWithTranscription.length === 1) {
            closeSpacePicker();
            toggleTranscription(spacesWithTranscription[0]);
            return;
        }

        if (closeFloatingUi) {
            closeSpacePicker();
            return;
        }

        if (!triggerElement) {
            return;
        }

        closeFloatingUi = showFloatingUi(
            triggerElement,
            RecordingSpacePicker,
            {
                spaces: spacesWithTranscription,
                onSelect: (space: SpaceInterface) => {
                    toggleTranscription(space);
                },
                onClose: closeSpacePicker,
            },
            {
                placement: "bottom",
            },
            8,
            true
        );
    }

    $: if ($transcriptionStore.isTranscribing) {
        waitReturnOfTranscriptionRequest = false;
    }

    onDestroy(() => {
        closeSpacePicker();
    });

    $: buttonState = ((): "disabled" | "normal" | "active" => {
        if (
            !localUserStore.isLogged() ||
            transcription?.buttonState !== "enabled" ||
            waitReturnOfTranscriptionRequest
        ) {
            return "disabled";
        }
        if ($transcriptionStore.isCurrentUserTranscriber) return "active";
        if (!$transcriptionStore.isTranscribing) return "normal";
        return "disabled";
    })();

    $: tooltipTitle = $transcriptionStore.isTranscribing
        ? $transcriptionStore.isCurrentUserTranscriber
            ? "Stop subtitles"
            : "Subtitles are active"
        : "Start subtitles";
</script>

<ActionBarButton
    on:click={() => {
        requestTranscription();
    }}
    classList="group/btn-transcription"
    {tooltipTitle}
    state={buttonState}
    dataTestId="transcriptionButton-{$transcriptionStore.isTranscribing ? 'stop' : 'start'}"
    media="./static/Videos/Record.mp4"
    tooltipDelay={0}
    bind:wrapperDiv={triggerElement}
>
    {#if waitReturnOfTranscriptionRequest}
        <div class="bg-red-500 rounded-full w-4 h-4 max-w-4 max-h-4 animate-pulse" />
    {:else}
        <SubtitleIcon />
    {/if}

    <div slot="tooltip" class="text-white relative">
        <div>
            {#if !localUserStore.isLogged()}
                <div class="text-xs italic opacity-80">You need to be logged in to start subtitles.</div>
            {:else if transcription?.buttonState === "disabled" && transcription?.disabledReason}
                <div class="text-xs italic opacity-80">
                    {transcription.disabledReason}
                </div>
            {:else if !$transcriptionStore.isTranscribing}
                <div class="text-sm text-whitepx-2 py-1">
                    <span class="mr-2 -translate-y-1">
                        <IconAlertTriangle />
                    </span>
                    <span class="text-xs italic opacity-80">
                        Live subtitles will be shown to current participants in the discussion.
                    </span>
                </div>
            {:else if $transcriptionStore.isCurrentUserTranscriber}
                <div class="text-sm text-white flex flex-row items-center gap-2 px-2 py-1">
                    <div class="bg-red-500 rounded-full min-w-4 min-h-4 animate-pulse" />
                    <div class="text-xs italic opacity-80">Subtitles are active. Click to stop them.</div>
                </div>
            {:else}
                <div class="text-sm text-white px-2 py-1 flex flex-row gap-2 items-center">
                    <div class="bg-red-500 rounded-full w-4 h-4 max-w-4 max-h-4 animate-pulse" />
                    <div class="text-xs italic opacity-80">Another participant is currently running subtitles.</div>
                </div>
            {/if}
        </div>
    </div>
</ActionBarButton>
