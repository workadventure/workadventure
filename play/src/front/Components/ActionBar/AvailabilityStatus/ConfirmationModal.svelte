<script lang="ts">
    import { ConfirmationModalPropsInterface } from "./Interfaces/ConfirmationModalPropsInterface";

    export let props: ConfirmationModalPropsInterface;
    $: ({ handleAccept, handleClose, acceptLabel, closeLabel } = props);
</script>

<div
    class="tw-flex tw-flex-col tw-text-white tw-bg-blue-900 tw-backdrop-blur tw-rounded-2xl
            tw-m-2
            tw-bg-medium-purple/95 tw-max-w-md tw-max-h-52 tw-self-center tw-justify-self-center"
>
    <div class="tw-flex tw-grow tw-items-center tw-z-50 ">
        <slot>Define Description Part...</slot>
    </div>
    <div class="tw-flex tw-justify-around tw-bg-opacity-50 tw-p-2 tw-backdrop-blur-2xl">
        <button on:click={handleAccept}>{acceptLabel}</button>
        <button on:click={handleClose}>{closeLabel}</button>
    </div>
</div>
