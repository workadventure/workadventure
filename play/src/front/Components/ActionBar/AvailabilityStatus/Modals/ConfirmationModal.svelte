<script lang="ts">
    import { ConfirmationModalPropsInterface } from "../Interfaces/ConfirmationModalPropsInterface";
    import PopUpContainer from "../../../PopUp/PopUpContainer.svelte";
    export let props: ConfirmationModalPropsInterface;
    $: ({ handleAccept, handleClose, acceptLabel, closeLabel } = props);

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            handleClose();
        }
    };
</script>

<svelte:window on:keydown={onKeyDown} />

<!--<div-->
<!--    transition:fly={{ y: +900, duration: 500 }}-->
<!--    class="flex flex-col text-white backdrop-blur rounded-xl-->
<!--            m-2 pointer-events-auto-->
<!--            bg-dark-purple/70 max-w-sm max-h-44 self-center justify-self-center"-->
<!--&gt;-->
<!--    <section class="flex grow items-center">-->
<!--        <slot />-->
<!--    </section>-->
<!--    <footer class="flex bg-dark-purple/70 justify-end p-2 rounded-b-2xl">-->
<!--        <button class="light" on:click={handleAccept}>{acceptLabel}</button>-->
<!--        <button class="outline" on:click={handleClose}>{closeLabel}</button>-->
<!--    </footer>-->
<!--</div>-->

<PopUpContainer>
    <slot />
    <div class="buttons-wrapper flex items-center justify-center p-2 gap-2 pointer-events-auto mt-2">
        <button class="btn btn-light btn-ghost btn-sm w-1/2 justify-center responsive-message" on:click={handleClose}
            >{closeLabel}</button
        >
        <button class="btn btn-secondary btn-sm w-1/2 justify-center" on:click={handleAccept}>{acceptLabel}</button>
    </div>
</PopUpContainer>
