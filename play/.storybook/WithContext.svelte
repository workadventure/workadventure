<script lang="ts">
    import { setContext, type Snippet } from "svelte";

    // Wrapper used by the withContext() decorator: sets a Svelte context key before rendering the
    // story, so components that read it via getContext() resolve it in isolation.
    interface Props {
        contextKey: string;
        contextValue: unknown;
        children?: Snippet;
    }

    let { contextKey, contextValue, children }: Props = $props();

    setContext(contextKey, contextValue);
</script>

{@render children?.()}
