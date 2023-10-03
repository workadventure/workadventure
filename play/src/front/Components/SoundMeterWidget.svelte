<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    export let volume = [0, 0, 0, 0, 0, 0, 0];
    let display = true;
    export let classcss: string;
    export let barColor = "white";

    let barClass: string;

    $: {
        if (barColor && barColor === "blue") {
            barClass = "tw-bg-light-blue";
        } else if (barColor && barColor === "black") {
            barClass = "tw-bg-black";
        } else {
            barClass = "tw-bg-white";
        }
    }

    /* eslint-disable svelte/require-each-key */
</script>

<div class="tw-flex tw-justify-between tw-w-10 tw-h-10 tw-items-center {classcss ?? ''}" class:active={display}>
    {#if volume}
        {#each volume as bar}
            <div
                class="tw-h-4 voice-meter-bar {barClass}"
                class:tw-scale-y-[3%]={bar < 10}
                class:tw-scale-y-[10%]={bar > 20 && bar < 30}
                class:tw-scale-y-[20%]={bar > 30 && bar < 40}
                class:tw-scale-y-[30%]={bar > 40 && bar < 50}
                class:tw-scale-y-[40%]={bar > 50 && bar < 60}
                class:tw-scale-y-[50%]={bar > 60 && bar < 70}
                class:tw-scale-y-[60%]={bar > 70 && bar < 80}
                class:tw-scale-y-[70%]={bar > 80 && bar < 90}
                class:tw-scale-y-[80%]={bar > 90 && bar < 120}
                class:tw-scale-y-[90%]={bar > 120 && bar < 140}
                class:tw-scale-y-[100%]={bar >= 140}
            />
        {/each}
    {/if}
</div>
