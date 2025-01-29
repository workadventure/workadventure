<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { writable } from "svelte/store";

    const dispatch = createEventDispatcher();

    let isDisplayed = writable(true);

    function allowPictureInPicture() {
        isDisplayed.set(false);
        dispatch("allow");
    }

    function disagreePictureInPicture() {
        dispatch("disagree");
    }

    onMount(() => {
        isDisplayed.set(true);
    });
</script>

<div
    class="tw-absolute tw-flex tw-flex-col tw-justify-center tw-items-center tw-gap-2 tw-top-0 tw-l-0 tw tw-transition-all tw-duration-500 tw-ease-in-out tw-h-0 tw-w-full tw-bg-dark-purple tw-bg-opacity-60 tw-backdrop-blur tw-overflow-hidden"
    style={`height: ${$isDisplayed ? "100%" : "0"}; z-index: 1000;`}
>
    <p class="tw-px-[10%] tw-text-center tw-text-white">Do you want to allow Picture in Picture for your meeting?</p>
    <button
        class="tw-bg-dark-purple  tw-text-white tw-w-[80%] tw-h-auto tw-py-4 tw-flex tw-flex-row tw-justify-center tw-items-center tw-rounded-xl tw-border tw-border-solid tw-border-gray-400 tw-cursor-pointer"
        on:click={() => allowPictureInPicture()}>Allow</button
    >
    <button
        class="tw-bg-dark-purple  tw-text-gray-400 tw-w-[80%] tw-h-auto tw-py-4 tw-flex tw-flex-row tw-justify-center tw-items-center tw-rounded-xl tw-border tw-border-solid tw-cursor-pointer"
        on:click={() => disagreePictureInPicture()}>Disagree</button
    >
</div>
