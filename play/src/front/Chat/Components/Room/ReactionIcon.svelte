<script lang="ts">
    import type { MatrixClient } from "matrix-js-sdk";

    interface Props {
        // A valid Matrix reaction key is either a Unicode emoji or an mxc URI pointing to an image, or even some text.
        key: string;
        matrixClient: MatrixClient;
    }

    let { key = $bindable(), matrixClient }: Props = $props();

    let imageUrl: string | null = $state(null);

    $effect(() => {
        if (key.startsWith("mxc://")) {
            imageUrl = matrixClient.mxcUrlToHttp(key, 40, 40);
        }
    });

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
            const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
            const segments = segmenter.segment(str);
            const first = segments[Symbol.iterator]().next().value;
            return first?.segment ?? str;
        }
        // Fallback: use spread operator (may not handle all complex emojis correctly)
        return [...str][0] ?? str;
    }

    let firstGrapheme = $derived(getFirstGrapheme(key));
    let isMultiGrapheme = $derived(firstGrapheme !== key);
</script>

{#if imageUrl}
    <img src={imageUrl} alt="Reaction" class="w-5 h-5" onerror={handleError} />
{:else if isMultiGrapheme}
    <span title={key}>{firstGrapheme}</span>
{:else}
    {key}
{/if}
