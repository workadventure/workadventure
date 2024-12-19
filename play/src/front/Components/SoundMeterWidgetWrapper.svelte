<script lang="ts">
    import { Readable } from "svelte/store";
    import SoundMeterWidget from "./SoundMeterWidget.svelte";

    export let volume: Readable<number[] | undefined> | undefined;
    export let cssClass: string;
    export let barColor = "white";
</script>

<SoundMeterWidget {barColor} {cssClass} volume={$volume} />
