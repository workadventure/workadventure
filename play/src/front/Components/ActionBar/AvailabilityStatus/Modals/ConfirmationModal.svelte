<script lang="ts">
    import { fly } from "svelte/transition";
    import { ConfirmationModalPropsInterface } from "../Interfaces/ConfirmationModalPropsInterface";
    export let props: ConfirmationModalPropsInterface;
    $: ({ handleAccept, handleClose, acceptLabel, closeLabel } = props);

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            handleClose();
        }
    };
</script>

<svelte:window on:keydown={onKeyDown} />

<div
    transition:fly={{ y: -900, duration: 500 }}
    class="flex flex-col text-white backdrop-blur rounded-xl
            m-2 pointer-events-auto
            bg-dark-purple/70 max-w-sm max-h-44 self-center justify-self-center"
>
    <section class="flex grow items-center">
        <slot />
    </section>
    <footer class="flex bg-dark-purple/70 justify-end p-2 rounded-b-2xl">
        <button class="light" on:click={handleAccept}>{acceptLabel}</button>
        <button class="outline" on:click={handleClose}>{closeLabel}</button>
    </footer>
</div>
