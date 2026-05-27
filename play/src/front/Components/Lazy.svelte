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

    function load() {
        loading = component();
        onload?.();
        loading
            .then(() => {
                onloaded?.();
            })
            .catch(() => {
                onerror?.();
            });
    }

    $effect(() => {
        if (when) {
            load();
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
