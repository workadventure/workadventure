<script lang="ts">
    export let classList = "group";
</script>

<div
    class="{classList} relative bg-contrast/80 transition-all backdrop-blur first:rounded-l-lg last:rounded-r-lg py-2 first:pl-2 last:pr-2 pl-1 pr-1 aspect-square"
>
    <slot />
</div>
