<script lang="ts">
    export let spectrum = [0, 0, 0, 0, 0, 0, 0];

    const NB_BARS = 30;

    function color(i: number, spectrum: number[]) {
        if (!spectrum || spectrum.length === 0) {
            spectrum = [0, 0, 0, 0, 0, 0, 0]; // Valeur par défaut si spectrum est undefined ou vide
        }

        const red = (255 * i) / NB_BARS;
        const green = 255 * (1 - i / NB_BARS);
        const sumSpectrum = spectrum.reduce((a, b) => a + b, 0);
        const avgVolume = (sumSpectrum / spectrum.length) % 20;

        let alpha = 1;
        if (i >= avgVolume) {
            alpha = 0.5;
        }

        return "background-color:rgba(" + red + ", " + green + ", 0, " + alpha + ");";
    }
</script>

<div
    class="horizontal-sound-meter flex items-center justify-center rounded-full overflow-hidden w-full max-w-[700px]  mx-5 "
    class:active={spectrum !== undefined}
>
    {#each [...Array(NB_BARS).keys()] as i (i)}
        <div class="flex-1 h-4" style={color(i, spectrum)} />
    {/each}
</div>

<style lang="scss">
    .horizontal-sound-meter div {
        flex-grow: 1;
    }
</style>
