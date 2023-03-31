<script lang="ts">
    import SoundMeterWidget from "./SoundMeterWidget.svelte";
    import { Readable } from "svelte/store";

    export let volume: Readable<number[] | undefined> | undefined;
    export let classcss: string;
    export let barColor = "white";
</script>

<SoundMeterWidget {barColor} {classcss} volume={$volume} />
