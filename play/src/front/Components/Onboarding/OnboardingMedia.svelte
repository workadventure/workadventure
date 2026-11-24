<script lang="ts">
    interface Props {
        image?: string;
        video?: string;
    }

    let { image, video }: Props = $props();
</script>

{#if video}
    <video autoplay muted loop playsinline class="w-full rounded-lg" src={video}></video>
{:else if image}
    <img class="w-full rounded-lg" src={image} alt="" />
{/if}
