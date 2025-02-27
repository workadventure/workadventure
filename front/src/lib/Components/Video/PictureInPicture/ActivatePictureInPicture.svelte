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
    class="absolute flex flex-col justify-center items-center gap-2 top-0 l-0 tw transition-all duration-500 ease-in-out h-0 w-full bg-dark-purple bg-opacity-60 backdrop-blur overflow-hidden"
    style={`height: ${$isDisplayed ? "100%" : "0"}; z-index: 1000;`}
>
    <p class="px-[10%] text-center text-white">Do you want to allow Picture in Picture for your meeting?</p>
    <button
        class="bg-dark-purple  text-white w-[80%] h-auto py-4 flex flex-row justify-center items-center rounded-xl border border-solid border-gray-400 cursor-pointer"
        on:click={() => allowPictureInPicture()}>Allow</button
    >
    <button
        class="bg-dark-purple  text-gray-400 w-[80%] h-auto py-4 flex flex-row justify-center items-center rounded-xl border border-solid cursor-pointer"
        on:click={() => disagreePictureInPicture()}>Disagree</button
    >
</div>
