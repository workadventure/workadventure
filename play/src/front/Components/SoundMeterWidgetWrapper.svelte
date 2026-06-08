<script lang="ts">
    import type { Readable } from "svelte/store";
    import SoundMeterWidget from "./SoundMeterWidget.svelte";

    interface Props {
        volume?: Readable<number[] | undefined>;
        cssClass: string;
        barColor: string;
    }

    let { volume, cssClass, barColor = "white" }: Props = $props();
</script>

<SoundMeterWidget {barColor} {cssClass} volume={$volume} />
