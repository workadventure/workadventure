<script lang="ts">
    interface Props {
        title: string;
    }

    let { title }: Props = $props();
</script>

<div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-1 relative bold">
    {title}
</div>
