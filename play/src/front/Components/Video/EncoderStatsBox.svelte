<script lang="ts">
    import type { LocalEncoderStats } from "../../WebRtc/LocalEncoderStats";
    import { describeEncoder } from "../../WebRtc/LocalEncoderStats";

    interface Props {
        encoderStats: LocalEncoderStats | undefined;
    }

    let { encoderStats }: Props = $props();

    let encoder = $derived(describeEncoder(encoderStats?.encoderImplementation));
    // Red when the machine cannot keep up, yellow when something else holds the encoder back
    let statsColorClass = $derived(
        encoderStats?.qualityLimitationReason === "cpu"
            ? "text-red-300 bg-red-950/50"
            : encoderStats?.qualityLimitationReason === "bandwidth" || encoderStats?.qualityLimitationReason === "other"
              ? "text-yellow-300 bg-yellow-950/50"
              : "text-green-300 bg-green-950/50",
    );
</script>

{#if encoderStats}
    <div
        class={`absolute bottom-0 right-0 p-2 text-[0.6rem] @[20rem]/videomediabox:text-[0.75rem] rounded-br-md rounded-tl-md select-text ${statsColorClass}`}
        data-testid="encoder-stats"
    >
        <table class="m-0 p-0 border-hidden">
            <tbody class="m-0 p-0 border-hidden">
                <tr>
                    <td>Encoder:</td><td data-testid="encoder-name">{encoder.name} ({encoder.type})</td>
                </tr>
                <tr>
                    <td>Limited by:</td><td data-testid="encoder-limitation">{encoderStats.qualityLimitationReason}</td>
                </tr>
                <tr>
                    <td>FPS:</td><td>{Math.round(encoderStats.fps)}</td>
                </tr>
                <tr>
                    <td>Bandwidth:</td><td>{Math.round((encoderStats.bandwidth / 1000) * 8)} kbps</td>
                </tr>
                <tr>
                    <td>Resolution:</td><td>{encoderStats.frameWidth}x{encoderStats.frameHeight}</td>
                </tr>
                <tr>
                    <td>Codec:</td><td>{encoderStats.mimeType ?? "-"}</td>
                </tr>
                <tr>
                    <td>Source:</td><td>{encoderStats.source}</td>
                </tr>
            </tbody>
        </table>
    </div>
{/if}

<style>
    td {
        padding: 0;
    }
</style>
