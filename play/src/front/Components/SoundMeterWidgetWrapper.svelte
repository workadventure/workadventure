<script lang="ts">
    import { Readable } from "svelte/store";
    import SoundMeterWidget from "./SoundMeterWidget.svelte";

    export let volume: Readable<number[] | undefined> | undefined;
    export let classcss: string;
    export let barColor = "white";
</script>

<SoundMeterWidget {barColor} {classcss} volume={$volume} />
