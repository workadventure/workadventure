<script lang="ts">
    interface Props {
        image?: string;
        video?: string;
        /** The size of the media. */
        class?: string;
    }

    let { image, video, class: size = "w-full" }: Props = $props();
</script>

{#if video}
    <video autoplay muted loop playsinline class={["rounded-lg", size]} src={video}></video>
{:else if image}
    <img class={["rounded-lg", size]} src={image} alt="" />
{/if}
