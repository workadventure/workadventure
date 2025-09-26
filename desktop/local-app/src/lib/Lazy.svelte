<script lang="ts">
    import { onMount } from "svelte";

    export let component: () => Promise<any>;
    export let delayMs: number | null | undefined = null;

    let loadedComponent: any = null;
    let timeout: NodeJS.Timeout | undefined;
    let showFallback = !delayMs;

    let props: Record<string, any>;
    $: {
        // eslint-disable-next-line no-shadow
        const { component, delayMs, ...restProps } = $$props;
        props = restProps;
    }

    onMount(() => {
        if (delayMs) {
            timeout = setTimeout(() => {
                showFallback = true;
            }, delayMs);
        }
        component().then((module: any) => {
            loadedComponent = module.default || module;
        });
        return () => {
            if (timeout) clearTimeout(timeout);
        };
    });
</script>

{#if loadedComponent}
    <svelte:component this={loadedComponent} {...props} />
{:else if showFallback}
    <slot />
{/if}
