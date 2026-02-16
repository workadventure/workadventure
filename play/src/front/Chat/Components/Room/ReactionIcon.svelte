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

    /**
     * Returns the first grapheme cluster (visible character) from a string.
     * Uses Intl.Segmenter when available, with a fallback for older browsers.
     */
    function getFirstGrapheme(str: string): string {
        if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
            // Intl.Segmenter is recently supported in modern browsers and can handle complex emojis correctly, but is not yet supported in Typescript's lib.dom.d.ts, so we need to use a type assertion here.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const segmenter = new (Intl as any).Segmenter(undefined, { granularity: "grapheme" });
            const segments = segmenter.segment(str);
            const first = segments[Symbol.iterator]().next().value;
            return first?.segment ?? str;
        }
        // Fallback: use spread operator (may not handle all complex emojis correctly)
        return [...str][0] ?? str;
    }

    $: firstGrapheme = getFirstGrapheme(key);
    $: isMultiGrapheme = firstGrapheme !== key;
</script>

{#if imageUrl}
    <img src={imageUrl} alt="Reaction" class="w-5 h-5" on:error={handleError} />
{:else if isMultiGrapheme}
    <span title={key}>{firstGrapheme}</span>
{:else}
    {key}
{/if}
