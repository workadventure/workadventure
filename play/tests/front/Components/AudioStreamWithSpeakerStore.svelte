<script lang="ts">
    import type { Readable } from "svelte/store";
    import AudioStream from "../../../src/front/Components/Video/PictureInPicture/AudioStream.svelte";

    // Lets a test change the selected speaker of a mounted AudioStream
    interface Props {
        streamStore: Readable<MediaStream | undefined>;
        speaker: Readable<string>;
        isBlocked: Readable<boolean>;
        volume: Readable<number>;
    }

    let { streamStore, speaker, isBlocked, volume }: Props = $props();
</script>

<AudioStream {streamStore} outputDeviceId={$speaker} {isBlocked} {volume} />
