<!-- https://lihautan.com/notes/svelte-lazy-load/ -->
<script>
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    export let when = false;
    export let component;

    let loading;

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
    {#await loading then { default: Component }}
        <Component />
    {/await}
{/if}
