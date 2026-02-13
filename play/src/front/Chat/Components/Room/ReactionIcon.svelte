<script lang="ts">
    import type { MatrixClient } from "matrix-js-sdk";

    // A valid Matrix reaction key is either a Unicode emoji or an mxc URI pointing to an image, or even some text.
    export let key: string;
    export let matrixClient: MatrixClient;

    let imageUrl: string | null = null;

    if (key.startsWith("mxc://")) {
        imageUrl = matrixClient.mxcUrlToHttp(key, 40, 40);
    }

    function handleError(event: Event) {
        console.warn(`Failed to load reaction image for key ${key}`, event);
        imageUrl = null;
        key = "❓";
    }
</script>

{#if imageUrl}
    <img src={imageUrl} alt="Reaction" class="w-5 h-5" on:error={handleError} />
{:else if [...key].length > 1}
    <span title={key}>{key.substring(0, 1)}</span>
{:else}
    {key}
{/if}
