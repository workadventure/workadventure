<script lang="ts">
    import type { WebRtcStats } from "./WebRtcStats";

    export let webRtcStats: WebRtcStats | undefined;
</script>

{#if webRtcStats}
    <div class="absolute bottom-0 right-0 text-green-300 p-2 bg-green-950/50 text-xs rounded-br-md rounded-tl-md">
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
