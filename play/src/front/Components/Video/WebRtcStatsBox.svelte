<script lang="ts">
    import type { WebRtcStats } from "./WebRtcStats";

    export let webRtcStats: WebRtcStats | undefined;

    $: fpsStdDevDisplay = webRtcStats?.fpsStdDev === undefined ? "-" : Math.round(webRtcStats.fpsStdDev * 100) / 100;
    $: statsColorClass =
        webRtcStats?.fpsStdDev !== undefined && webRtcStats.fpsStdDev > 10
            ? "text-red-300 bg-red-950/50"
            : webRtcStats?.fpsStdDev !== undefined && webRtcStats.fpsStdDev > 4
            ? "text-yellow-300 bg-yellow-950/50"
            : "text-green-300 bg-green-950/50";
</script>

{#if webRtcStats}
    <div
        class={`absolute bottom-0 right-0 p-2 text-[0.6rem] @[20rem]/videomediabox:text-[0.75rem] rounded-br-md rounded-tl-md ${statsColorClass}`}
    >
        <table class="m-0 p-0 border-hidden">
            <tr>
                <td>Jitter:</td><td>{Math.round(webRtcStats.jitter * 1000)} ms</td>
            </tr>
            <tr>
                <td>Bandwidth:</td><td>{Math.round((webRtcStats.bandwidth / 1000) * 8)} kbps</td>
            </tr>
            <tr>
                <td>FPS:</td><td>{Math.round(webRtcStats.fps)}</td>
            </tr>
            <tr>
                <td>FPS Variability:</td>
                <td>{fpsStdDevDisplay}</td>
            </tr>
            <tr>
                <td>Resolution:</td><td>{webRtcStats.frameWidth}x{webRtcStats.frameHeight}</td>
            </tr>
            <tr>
                <td>Codec:</td><td>{webRtcStats.mimeType}</td>
            </tr>
            <tr>
                <td>Source:</td><td>{webRtcStats.source}</td>
            </tr>
        </table>
    </div>
{/if}
