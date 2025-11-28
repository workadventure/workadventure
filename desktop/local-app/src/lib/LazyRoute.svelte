<script lang="ts">
    import { Route } from "svelte-navigator";
    import Lazy from "~/lib/Lazy.svelte";

    export let component: () => Promise<any>;
    export let delayMs: number | null | undefined = null;

    let props: Record<string, any>;
    $: {
        // eslint-disable-next-line no-shadow
        const { component, ...restProps } = $$props;
        props = restProps;
    }
</script>

<Route {...props}>
    <Lazy {component} {delayMs}>
        <slot />
    </Lazy>
</Route>
