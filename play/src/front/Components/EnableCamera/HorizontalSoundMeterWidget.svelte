<script lang="ts">
    export let spectrum = [0, 0, 0, 0, 0, 0, 0];

    const NB_BARS = 20;

    function color(i: number, spectrum: number[]) {
        const red = (255 * i) / NB_BARS;
        const green = 255 * (1 - i / NB_BARS);
        const sumSpectrum = spectrum.reduce((a, b) => a + b, 0);
        const avgVolume = (sumSpectrum / spectrum.length) % 20;

        let alpha = 1;
        if (i >= avgVolume) {
            alpha = 0.5;
        }

        return "background-color:rgba(" + red + ", " + green + ", 0, " + alpha + ")";
    }
</script>

<div class="horizontal-sound-meter tw-justify-center tw-w-80" class:active={spectrum !== undefined}>
    {#each [...Array(NB_BARS).keys()] as i (i)}
        <div class="tw-rounded tw-w-1 tw-h-8 tw-mx-1" style={color(i, spectrum)} />
    {/each}
</div>

<style lang="scss">
    .horizontal-sound-meter {
        display: flex;
        flex-direction: row;
        height: 30px;
        margin-left: auto;
        margin-right: auto;
        margin-top: 1vh;
    }

    .horizontal-sound-meter div {
        flex-grow: 1;
    }
</style>
