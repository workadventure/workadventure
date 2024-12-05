<script lang="ts">

    export let classList = "";

</script>


<div class="{classList} relative bg-contrast/80 transition-all backdrop-blur first:rounded-l-lg last:rounded-r-lg p-2 aspect-square">
    <slot />
</div>
