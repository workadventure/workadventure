<script>
    import { Route } from "svelte-navigator";
    import Lazy from "~/lib/Lazy.svelte";

    export let component;
    export let delayMs = null;

    let props;
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
