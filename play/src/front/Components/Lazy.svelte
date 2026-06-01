<!-- https://lihautan.com/notes/svelte-lazy-load/ -->
<script lang="ts">
    import type { WorkAdventureComponent } from "../../types/component";

    interface Props {
        when: boolean;
        component: () => Promise<{ default: WorkAdventureComponent }>;
        onload?: () => void;
        onloaded?: () => void;
        onerror?: () => void;
        [key: string]: unknown;
    }

    let { when = false, component, onload, onloaded, onerror, ...rest }: Props = $props();

    let loading: Promise<{ default: WorkAdventureComponent }> | null = $state(null);

    $effect(() => {
        if (when) {
            const loadingPromise = component();
            loading = loadingPromise;
            onload?.();
            loadingPromise
                .then(() => {
                    onloaded?.();
                })
                .catch(() => {
                    onerror?.();
                });
        }
    });
</script>

{#if when}
    {#await loading then result}
        {@const Component = result?.default}
        {#if Component}
            <Component {...rest} />
        {/if}
    {/await}
{/if}
