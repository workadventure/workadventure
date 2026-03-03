<script lang="ts">
    import type { Readable } from "svelte/store";
    import { derived, readable } from "svelte/store";
    import {
        createVisibleTranscriptionSegmentsStore,
        DEFAULT_FINAL_SEGMENT_TTL_MS,
        DEFAULT_VISIBLE_TRANSCRIPTION_MAX_SEGMENTS,
    } from "../../Livekit/LiveKitVisibleTranscriptionStore";
    import type {
        LiveKitTranscriptionSegmentState,
        LiveKitTranscriptionState,
    } from "../../Livekit/LiveKitTranscriptionTypes";

    export let transcriptionStateStore: LiveKitTranscriptionState | undefined;

    type SubtitleLine = {
        segmentId: string;
        speakerName: string;
        text: string;
        isFinal: boolean;
    };

    function toSubtitleLines(segments: LiveKitTranscriptionSegmentState[]): SubtitleLine[] {
        return segments
            .map((segment) => {
                return {
                    segmentId: segment.segmentId,
                    speakerName: segment.speakerName || segment.speakerIdentity,
                    text: segment.text.trim(),
                    isFinal: segment.isFinal,
                };
            })
            .filter((line) => line.text.length > 0);
    }

    const visibleSegmentsStore: Readable<LiveKitTranscriptionSegmentState[]> = transcriptionStateStore
        ? createVisibleTranscriptionSegmentsStore(transcriptionStateStore, {
              finalSegmentTtlMs: DEFAULT_FINAL_SEGMENT_TTL_MS,
              maxSegments: DEFAULT_VISIBLE_TRANSCRIPTION_MAX_SEGMENTS,
          })
        : readable([]);

    const subtitleLinesStore = derived(visibleSegmentsStore, (visibleSegments) => {
        return toSubtitleLines(visibleSegments);
    });
</script>

{#if $subtitleLinesStore.length > 0}
    <section class="flex flex-col gap-[0.3rem]">
        {#each $subtitleLinesStore as line (line.segmentId)}
            <p
                class="m-0 w-fit max-w-full break-words rounded-[0.45rem] bg-black/75 px-[0.55rem] py-[0.35rem] text-[0.93rem] leading-[1.35] text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.75)] mobile:px-[0.45rem] mobile:py-[0.3rem] mobile:text-[0.86rem] {line.isFinal
                    ? '[opacity:0.92]'
                    : 'border-s-2 border-white/60'}"
                data-testid="live-subtitles-line-{line.segmentId}"
            >
                <span class="me-[0.35rem] font-bold">{line.speakerName}:</span>
                <span class="text">{line.text}</span>
            </p>
        {/each}
    </section>
{/if}
