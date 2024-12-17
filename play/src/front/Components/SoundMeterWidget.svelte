<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    export let volume = [0, 0, 0, 0, 0, 0, 0];
    let display = true;
    export let cssClass: string | undefined = undefined;
    export let barColor = "white";

    let barClass: string;

    $: {
        if (barColor && barColor === "blue") {
            barClass = "bg-light-blue";
        } else if (barColor && barColor === "black") {
            barClass = "bg-black";
        } else {
            barClass = "bg-white";
        }
    }

    /* eslint-disable svelte/require-each-key */
</script>

<div class="flex justify-between w-8 h-6 items-center {cssClass ?? ''}" class:active={display}>
    {#if volume}
        {#each volume as bar}
            <div
                class="h-4 voice-meter-bar rounded flex w-[1px] transition-transform outline outline-solid outline-black/30 {barClass}"
                class:scale-y-[0%]={bar < 10}
                class:scale-y-[10%]={bar > 20 && bar < 30}
                class:scale-y-[20%]={bar > 30 && bar < 40}
                class:scale-y-[30%]={bar > 40 && bar < 50}
                class:scale-y-[40%]={bar > 50 && bar < 60}
                class:scale-y-[50%]={bar > 60 && bar < 70}
                class:scale-y-[60%]={bar > 70 && bar < 80}
                class:scale-y-[70%]={bar > 80 && bar < 90}
                class:scale-y-[80%]={bar > 90 && bar < 120}
                class:scale-y-[90%]={bar > 120 && bar < 140}
                class:scale-y-[100%]={bar >= 140}
            />
        {/each}
    {/if}
</div>
