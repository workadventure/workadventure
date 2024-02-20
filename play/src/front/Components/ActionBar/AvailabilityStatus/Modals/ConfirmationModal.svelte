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
    class="tw-flex tw-flex-col tw-text-white tw-bg-blue-900 tw-backdrop-blur tw-rounded-xl
            tw-m-2 tw-pointer-events-auto
            tw-bg-medium-purple/70 tw-max-w-sm tw-max-h-44 tw-self-center tw-justify-self-center "
>
    <section class="tw-flex tw-grow tw-items-center">
        <slot>Define Description Part...</slot>
    </section>
    <footer class="tw-flex tw-justify-end tw-p-2 tw-backdrop-blur-2xl tw-rounded-b-2xl ">
        <button class="tw-bg-blue-500 tw-rounded-2xl hover:tw-brightness-125" on:click={handleAccept}
            >{acceptLabel}</button
        >
        <button class="tw-bg-medium-purple tw-rounded-2xl  hover:tw-brightness-125" on:click={handleClose}
            >{closeLabel}</button
        >
    </footer>
</div>
