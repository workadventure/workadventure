<script>
    import { navigate } from "svelte-navigator";
    import { api } from "~/lib/ipc";

    let to = "/";
    let clazz = "";

    export { clazz as class, to };

    async function click() {
        await api.showLocalApp();
        navigate(to);
    }
</script>

<div on:click={click} class={`${clazz}`}>
    <slot />
</div>
