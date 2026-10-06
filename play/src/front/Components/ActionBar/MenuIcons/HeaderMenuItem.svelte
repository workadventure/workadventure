<script lang="ts">
    interface Props {
        label: string;
    }

    let { label }: Props = $props();
</script>

<div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-2 relative bold">
    {label}
</div>
