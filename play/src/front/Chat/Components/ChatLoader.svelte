<script lang="ts">
     import { IconLoader3 } from "@tabler/icons-svelte";
    export let label : string; 
</script>

<div class="tw-text-gray-400 tw-text-xl tw-flex tw-flex-col tw-items-center tw-mt-20">
    <IconLoader3 class="tw-animate-spin" size={40} />
    <p class="tw-m-0">
        {label}
    </p>
</div>
