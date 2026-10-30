<script lang="ts">
    import { writable, type Readable } from "svelte/store";
    import AudioStream from "../../../src/front/Components/Video/PictureInPicture/AudioStream.svelte";

    // Lets a test change the output device of a mounted AudioStream, keeping the same <audio> element
    interface Props {
        outputDevice: Readable<string | undefined>;
    }

    let { outputDevice }: Props = $props();

    const streamStore = writable<MediaStream | undefined>(undefined);
    const isBlocked = writable(false);
    const volume = writable(1);
</script>

<AudioStream {streamStore} outputDeviceId={$outputDevice} {isBlocked} {volume} />
