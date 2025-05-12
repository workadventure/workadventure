<!-- https://lihautan.com/notes/svelte-lazy-load/ -->
<script lang="ts">
    import { ComponentType, createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher<{
        onload: void;
        loaded: void;
        error: void;
    }>();

    export let when = false;
    export let component: () => Promise<{ default: ComponentType }>;

    let loading: Promise<{ default: ComponentType }> | null = null;

    $: if (when) {
        load();
    }

    function load() {
        loading = component();
        dispatch("onload");
        loading
            .then(() => {
                dispatch("loaded");
            })
            .catch(() => {
                dispatch("error");
            });
    }
</script>

{#if when}
    {#await loading then result}
        {@const Component = result?.default}
        {#if Component}
            <Component {...$$restProps} />
        {/if}
    {/await}
{/if}
