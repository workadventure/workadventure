<script>
    import { navigate } from "svelte-navigator";

    let to = "/";
    let clazz = "";

    export { clazz as class, to };

    async function click() {
        await window?.WorkAdventureDesktopApi?.showLocalApp();
        navigate(to);
    }
</script>

<div on:click={click} class={`${clazz}`}>
    <slot />
</div>
