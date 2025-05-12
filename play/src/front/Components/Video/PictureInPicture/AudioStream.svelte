<script lang="ts">
    export let stream: MediaStream;
    export let volume: number | undefined = undefined;
    let audioElement: HTMLAudioElement;
    function srcObject(node: HTMLAudioElement, stream: MediaStream) {
        node.srcObject = stream;
        return {
            update(newStream: MediaStream) {
                if (node.srcObject != newStream) {
                    node.srcObject = newStream;
                }
            },
        };
    }

    $: {
        if (volume !== undefined && audioElement) {
            audioElement.volume = volume;
        }
    }
</script>

<audio bind:this={audioElement} autoplay={true} use:srcObject={stream} />
